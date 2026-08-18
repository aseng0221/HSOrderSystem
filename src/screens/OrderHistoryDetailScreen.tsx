import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import molpay from 'fiuu-mobile-xdk-reactnative';
import firestore from '@react-native-firebase/firestore';
import {Colors, Spacing} from '../theme';
import {Order, OrderItem} from '../types/order';
import {KEYS} from '../config/keys';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {useRewardsViewModel} from '../viewmodels/useRewardsViewModel';
import {useMenuViewModel} from '../viewmodels/useMenuViewModel';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadReceiptToStorage} from '../services/storage';

const OrderHistoryDetailScreen = ({route, navigation}: any) => {
  const {order: initialOrder} = route.params as {order: Order};
  const [order, setOrder] = useState<Order>(initialOrder);
  const {user, walletBalance, updateWalletBalance} = useAuthViewModel();
  const {updateOrderPaymentStatus, cancelOrder, updateOrderDetails} = useOrderHistoryViewModel();
  const {addPointsForPurchase} = useRewardsViewModel();
  const {globalOptions} = useMenuViewModel();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('orders')
      .doc(initialOrder.id)
      .onSnapshot(
        docSnapshot => {
          if (docSnapshot.exists) {
            const data = docSnapshot.data();
            if (data) {
              setOrder({
                id: docSnapshot.id,
                ...data,
              } as Order);
            }
          }
        },
        err => console.error('Error listening to order document:', err),
      );

    return () => unsubscribe();
  }, [initialOrder.id]);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'fiuu' | 'manual' | 'wallet'>('fiuu');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isExpired = React.useMemo(() => {
    if (order.paymentStatus === 'unpaid' && order.status !== 'cancelled' && order.createdAt) {
      const created = order.createdAt as unknown as (number | { toDate: () => Date });
      if (!created) {
        return false;
      }
      const orderDate = (typeof created === 'object' && 'toDate' in created)
        ? created.toDate()
        : new Date(created);
      const diffMins = (new Date().getTime() - orderDate.getTime()) / 1000 / 60;
      return diffMins > 15;
    }
    return false;
  }, [order]);

  const displayedStatus = isExpired ? 'cancelled' : order.status;

  React.useEffect(() => {
    if (isExpired) {
      cancelOrder(order.id).catch(err => console.error('Auto-cancel failed:', err));
    }
  }, [isExpired]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) {
      return '';
    }
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const renderItem = (item: OrderItem, index: number) => (
    <View key={item.id || index.toString()} style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>
          {item.quantity}x {item.product.name}
        </Text>
        <Text style={styles.itemOptions}>
          {Object.entries(item.selectedOptions || {})
            .map(([groupId, ids]) => {
              return (ids as string[])
                .map(optId => {
                  const group = globalOptions?.find((g: any) => g.id === groupId);
                  const option = group?.options?.find((o: any) => o.id === optId);
                  return option ? option.name : optId;
                })
                .join(', ');
            })
            .filter(Boolean)
            .join(' | ')}
        </Text>
      </View>
      <Text style={styles.itemPrice}>
        RM {(item.unitPrice * item.quantity).toFixed(2)}
      </Text>
    </View>
  );

  const handleFiuuRetry = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to proceed with payment.');
      return;
    }

    const paymentDetails = {
      mp_username: KEYS.FIUU.USERNAME,
      mp_password: KEYS.FIUU.PASSWORD,
      mp_merchant_ID: KEYS.FIUU.MERCHANT_ID,
      mp_app_name: KEYS.FIUU.APP_NAME || 'NextDoor',
      mp_verification_key: KEYS.FIUU.VERIFICATION_KEY,
      mp_amount: order.totalAmount.toFixed(2),
      mp_order_ID: order.id,
      mp_currency: 'MYR',
      mp_country: 'MY',
      mp_channel: 'multi',
      mp_bill_description: 'Order from NextDoor',
      mp_bill_name: user.displayName || 'Guest User',
      mp_bill_email: user.email || 'guest@example.com',
      mp_bill_mobile: user.phoneNumber || '+60123456789',
      mp_closebutton_display: true,
    };

    molpay.startMolpay(paymentDetails, async (data: any) => {
      try {
        let result;
        if (typeof data === 'string') {
          try {
            result = JSON.parse(data);
          } catch (e) {
            result = {status_code: data};
          }
        } else {
          result = data;
        }

        if (!result) {
          console.log('No payment data received from SDK');
          return;
        }

        if (result.status_code === '00') {
          // Payment Success
          await updateOrderDetails(order.id, {
            paymentStatus: 'paid',
            paymentMethod: 'online',
            status: 'preparing',
          });
          Alert.alert(
            'Success',
            'Payment successful! Your order is now confirmed.',
          );
          navigation.goBack();
        } else if (result.status_code === '11') {
          Alert.alert('Failed', 'Payment failed or cancelled.');
        } else if (result.status_code === '22') {
          Alert.alert('Pending', 'Payment is pending.');
        }
      } catch (e) {
        console.log('Error parsing payment result', e);
      }
    });
  };

  const handleWalletRetry = async () => {
    if (walletBalance === undefined || walletBalance < order.totalAmount) {
      Alert.alert(
        'Insufficient Balance',
        `Your NextDoor Balance (RM ${walletBalance !== undefined ? walletBalance.toFixed(2) : '0.00'}) is insufficient to pay for this order (RM ${order.totalAmount.toFixed(2)}). Please top up first.`,
      );
      return;
    }

    try {
      // 1. Deduct wallet balance
      await updateWalletBalance(-order.totalAmount, `Order Payment (Order ID: ${order.id})`);

      // 2. Update order details in Firestore
      await updateOrderDetails(order.id, {
        paymentMethod: 'wallet',
        paymentStatus: 'paid',
        status: 'preparing',
      });



      Alert.alert('Success', 'Payment successful using NextDoor Balance!');
      navigation.goBack();
    } catch (e) {
      console.error('Error handling wallet payment:', e);
      Alert.alert('Error', 'Could not process wallet payment. Please try again.');
    }
  };

  const handleReceiptUpload = async () => {
    if (!user) return;
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return; // User cancelled
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not get image data');
        return;
      }

      setIsUploading(true);

      // Upload to Firebase Storage
      const receiptUrl = await uploadReceiptToStorage(user.uid, asset.base64);

      // Update Order
      await updateOrderDetails(order.id, {
        paymentMethod: 'manual_transfer',
        receiptUrl: receiptUrl,
        status: 'pending_verification',
      });

      setQrModalVisible(false);
      navigation.goBack();
      Alert.alert(
        'Success',
        'Top-up receipt submitted successfully! Please wait for an admin or cashier to complete the verification. Once verified, you can use your wallet balance to pay.',
      );
    } catch (error) {
      console.error('Error uploading receipt:', error);
      Alert.alert(
        'Upload Failed',
        'There was an issue uploading your receipt. Please try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmPayment = () => {
    setPaymentModalVisible(false);
    if (selectedPaymentMethod === 'fiuu') {
      handleFiuuRetry();
    } else if (selectedPaymentMethod === 'wallet') {
      handleWalletRetry();
    } else if (selectedPaymentMethod === 'manual') {
      setQrModalVisible(true);
    }
  };

  const handleRetryPayment = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to proceed with payment.');
      return;
    }
    setPaymentModalVisible(true);
  };

  const renderPaymentModal = () => (
    <Modal
      visible={paymentModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setPaymentModalVisible(false)}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <View style={styles.topupModalBody}>
                <Text style={styles.topupModalTitle}>Choose Payment Method</Text>
                <Text style={styles.topupModalSubtitle}>Select how you would like to pay</Text>

                <View style={styles.paymentMethodsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      selectedPaymentMethod === 'wallet' && styles.paymentMethodOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('wallet')}>
                    <Icon
                      name={selectedPaymentMethod === 'wallet' ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selectedPaymentMethod === 'wallet' ? Colors.primary : Colors.grey}
                    />
                    <Text style={styles.paymentMethodText}>
                      NextDoor Balance (RM {walletBalance !== undefined ? walletBalance.toFixed(2) : '0.00'})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      selectedPaymentMethod === 'fiuu' && styles.paymentMethodOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('fiuu')}>
                    <Icon
                      name={selectedPaymentMethod === 'fiuu' ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selectedPaymentMethod === 'fiuu' ? Colors.primary : Colors.grey}
                    />
                    <Text style={styles.paymentMethodText}>Online Payment (Fiuu)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      selectedPaymentMethod === 'manual' && styles.paymentMethodOptionSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod('manual')}>
                    <Icon
                      name={selectedPaymentMethod === 'manual' ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={selectedPaymentMethod === 'manual' ? Colors.primary : Colors.grey}
                    />
                    <Text style={styles.paymentMethodText}>Manual Transfer (TNG QR)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setPaymentModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirmPayment}>
                    <Text style={styles.confirmButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderQrModal = () => (
    <Modal
      visible={qrModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setQrModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.qrModalBody}>
            <View style={styles.topupModalHeader}>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Icon name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.topupModalTitle}>Scan to Pay</Text>
              <View style={{width: 24}} />
            </View>

            <Text style={styles.qrInstructions}>
              Please scan the QR code to transfer RM {order.totalAmount.toFixed(2)} via Touch 'n Go, then upload your receipt below.
            </Text>

            <View style={styles.qrContainer}>
              <Image
                source={{
                  uri: 'https://via.placeholder.com/200x200.png?text=TNG+QR',
                }}
                style={styles.qrImage}
              />
            </View>

            <TouchableOpacity
              style={[styles.uploadBtn, isUploading && styles.uploadBtnDisabled]}
              onPress={handleReceiptUpload}
              disabled={isUploading}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                {isUploading && (
                  <ActivityIndicator size="small" color="#ffffff" style={{marginRight: 8}} />
                )}
                <Text style={styles.uploadBtnText}>
                  {isUploading ? 'Uploading...' : 'Upload Receipt'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={{width: 30}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.orderId}>Order #{order.orderNumber ? order.orderNumber : order.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          <View style={styles.badgesContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {displayedStatus === 'pending' &&
                order.paymentMethod === 'online' &&
                order.paymentStatus === 'unpaid'
                  ? 'PENDING PAYMENT'
                  : displayedStatus.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            {order.paymentMethod === 'cash' &&
              order.paymentStatus === 'unpaid' && (
                <View
                  style={[
                    styles.statusBadge,
                    {backgroundColor: Colors.error + '20'},
                  ]}>
                  <Text style={[styles.statusText, {color: Colors.error}]}>
                    UNPAID (CASH)
                  </Text>
                </View>
              )}
          </View>
          <Text style={styles.orderMode}>
            Mode: {order.orderMode.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.itemsCard}>
          {order.items.map(renderItem)}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              RM {order.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {order.paymentStatus === 'unpaid' &&
          displayedStatus !== 'cancelled' &&
          displayedStatus !== 'completed' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={handleRetryPayment}>
              <Text style={styles.payButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}
      </ScrollView>

      {renderPaymentModal()}
      {renderQrModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    padding: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  orderId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  statusBadge: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  orderMode: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  itemsCard: {
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  itemOptions: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  payButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '40%',
    paddingBottom: 20,
  },
  topupModalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  topupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  topupModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  topupModalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  paymentMethodsContainer: {
    width: '100%',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    gap: Spacing.md,
  },
  paymentMethodOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  paymentMethodText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FAFAFA',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  confirmButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  qrModalBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  qrInstructions: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    alignSelf: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.md,
    width: '100%',
  },
  uploadBtnDisabled: {
    backgroundColor: Colors.grey,
  },
  uploadBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderHistoryDetailScreen;
