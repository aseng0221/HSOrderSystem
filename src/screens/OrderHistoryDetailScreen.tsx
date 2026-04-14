import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import molpay from 'fiuu-mobile-xdk-reactnative';
import {Colors, Spacing} from '../theme';
import {Order, OrderItem} from '../types/order';
import {KEYS} from '../config/keys';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {useRewardsViewModel} from '../viewmodels/useRewardsViewModel';

const OrderHistoryDetailScreen = ({route, navigation}: any) => {
  const {order} = route.params as {order: Order};
  const {user} = useAuthViewModel();
  const {updateOrderPaymentStatus} = useOrderHistoryViewModel();
  const {addPointsForPurchase} = useRewardsViewModel();

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
            .map(([_, ids]) => (ids as string[]).join(', '))
            .join(' | ')}
        </Text>
      </View>
      <Text style={styles.itemPrice}>
        RM {(item.unitPrice * item.quantity).toFixed(2)}
      </Text>
    </View>
  );

  const handleRetryPayment = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to proceed with payment.');
      return;
    }

    const paymentDetails = {
      mp_username: KEYS.FIUU.USERNAME,
      mp_password: KEYS.FIUU.PASSWORD,
      mp_merchant_ID: KEYS.FIUU.MERCHANT_ID,
      mp_app_name: KEYS.FIUU.APP_NAME || 'HS Coffee',
      mp_verification_key: KEYS.FIUU.VERIFICATION_KEY,
      mp_amount: order.totalAmount.toFixed(2),
      mp_order_ID: order.id,
      mp_currency: 'MYR',
      mp_country: 'MY',
      mp_channel: 'multi',
      mp_bill_description: 'Order from HS Coffee',
      mp_bill_name: user.displayName || 'Guest User',
      mp_bill_email: user.email || 'guest@example.com',
      mp_bill_mobile: user.phoneNumber || '+60123456789',
      mp_closebutton_display: true,
    };

    molpay.startMolpay(paymentDetails, async (data: string) => {
      try {
        const result = JSON.parse(data);
        if (result.status_code === '00') {
          // Payment Success
          await updateOrderPaymentStatus(order.id, 'paid');
          await addPointsForPurchase(order.totalAmount);
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
          <Text style={styles.orderId}>Order ID: {order.id}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          <View style={styles.badgesContainer}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {order.status.replace(/_/g, ' ').toUpperCase()}
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

        {order.paymentMethod === 'online' &&
          order.paymentStatus === 'unpaid' && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={handleRetryPayment}>
              <Text style={styles.payButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}
      </ScrollView>
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
});

export default OrderHistoryDetailScreen;
