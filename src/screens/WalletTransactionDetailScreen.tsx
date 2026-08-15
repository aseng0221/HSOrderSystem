import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadReceiptToStorage} from '../services/storage';
import {Colors, Spacing, BorderRadius} from '../theme';

const {width} = Dimensions.get('window');

const WalletTransactionDetailScreen = ({route, navigation}: any) => {
  const {id, type} = route.params || {};
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const user = auth().currentUser;

  const fetchTransactionDetails = async () => {
    if (!id || !user) return;

    try {
      if (type === 'topup') {
        const doc = await firestore().collection('topups').doc(id).get();
        if (doc.exists) {
          setTransaction({id: doc.id, ...doc.data()});
        }
      } else {
        const doc = await firestore()
          .collection('users')
          .doc(user.uid)
          .collection('wallet_transactions')
          .doc(id)
          .get();
        if (doc.exists) {
          setTransaction({id: doc.id, ...doc.data()});
        }
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      Alert.alert('Error', 'Could not load transaction details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionDetails();
  }, [id, type]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReceiptReupload = async () => {
    if (!user || !id) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return; // Cancelled
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Could not get image data.');
        return;
      }

      setIsUploading(true);

      // 1. Upload new receipt image to storage
      const receiptUrl = await uploadReceiptToStorage(user.uid, asset.base64);

      // 2. Update Firestore topup document & reset status
      await firestore().collection('topups').doc(id).update({
        receiptUrl: receiptUrl,
        status: 'pending_verification',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Corrected receipt submitted successfully for re-verification!');
      fetchTransactionDetails();
    } catch (e) {
      console.error('Error re-uploading receipt:', e);
      Alert.alert('Error', 'Could not upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const orderDoc = await firestore().collection('orders').doc(orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        navigation.navigate('OrderHistoryDetail', {
          order: {id: orderDoc.id, ...orderData},
        });
      } else {
        Alert.alert('Error', 'Order details not found.');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Could not open order details.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract Order ID from description
  const getOrderId = () => {
    if (!transaction || !transaction.description) return null;
    const match = transaction.description.match(/Order ID:\s*([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Icon name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>Transaction details not found.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isTopup = type === 'topup';
  const orderId = getOrderId();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        {isTopup && (
          <View
            style={[
              styles.statusBanner,
              transaction.status === 'approved'
                ? styles.bannerApproved
                : transaction.status === 'rejected'
                ? styles.bannerRejected
                : styles.bannerPending,
            ]}>
            <Icon
              name={
                transaction.status === 'approved'
                  ? 'checkbox-marked-circle-outline'
                  : transaction.status === 'rejected'
                  ? 'close-circle-outline'
                  : 'clock-outline'
              }
              size={24}
              color={Colors.white}
            />
            <Text style={styles.statusBannerText}>
              {transaction.status === 'approved'
                ? 'Verification Approved'
                : transaction.status === 'rejected'
                ? 'Verification Rejected'
                : 'Pending Verification'}
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.label}>Transaction ID</Text>
          <Text style={styles.valueId}>{transaction.id}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Description</Text>
          <Text style={styles.valueText}>
            {isTopup
              ? transaction.bonus > 0
                ? `Manual Top Up (Includes RM ${transaction.bonus.toFixed(2)} Bonus Credit)`
                : 'Manual Top Up'
              : transaction.description}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Date & Time</Text>
          <Text style={styles.valueText}>{formatDate(transaction.createdAt)}</Text>

          <View style={styles.divider} />

          {isTopup ? (
            <>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Top-up Amount</Text>
                  <Text style={styles.amountText}>RM {transaction.amount.toFixed(2)}</Text>
                </View>
                {transaction.bonus > 0 && (
                  <View style={styles.col}>
                    <Text style={styles.label}>Bonus Credited</Text>
                    <Text style={[styles.amountText, {color: Colors.primary}]}>
                      +RM {transaction.bonus.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>Total Wallet Credit</Text>
              <Text style={[styles.amountTotal, {color: Colors.success}]}>
                RM {transaction.totalCredit.toFixed(2)}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Transaction Amount</Text>
              <Text
                style={[
                  styles.amountTotal,
                  {color: transaction.amount < 0 ? Colors.error : Colors.success},
                ]}>
                {transaction.amount < 0 ? '-' : '+'}RM {Math.abs(transaction.amount).toFixed(2)}
              </Text>

              {transaction.newBalance !== undefined && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.label}>Wallet Balance (After)</Text>
                  <Text style={styles.valueText}>RM {transaction.newBalance.toFixed(2)}</Text>
                </>
              )}
            </>
          )}
        </View>

        {/* Receipt Section */}
        {isTopup && transaction.receiptUrl && (
          <View style={styles.receiptSection}>
            <Text style={styles.receiptHeader}>Submitted Transfer Receipt</Text>
            <TouchableOpacity onPress={() => setImageModalVisible(true)} style={styles.receiptContainer}>
              <Image source={{uri: transaction.receiptUrl}} style={styles.receiptThumbnail} />
              <View style={styles.zoomOverlay}>
                <Icon name="magnify-plus" size={24} color={Colors.white} />
                <Text style={styles.zoomText}>Tap to zoom</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          {isTopup && transaction.status === 'rejected' && (
            <View style={styles.reuploadContainer}>
              <Text style={styles.reuploadWarningText}>
                Your payment receipt was rejected. Please transfer the exact amount and upload the correct receipt for verification.
              </Text>
              <TouchableOpacity
                style={[styles.reuploadBtn, isUploading && styles.reuploadBtnDisabled]}
                onPress={handleReceiptReupload}
                disabled={isUploading}>
                <View style={styles.btnRow}>
                  {isUploading && (
                    <ActivityIndicator size="small" color="#ffffff" style={{marginRight: 8}} />
                  )}
                  <Text style={styles.reuploadBtnText}>
                    {isUploading ? 'Uploading...' : 'Upload Correct Receipt'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {!isTopup && orderId && (
            <TouchableOpacity style={styles.viewOrderBtn} onPress={() => handleViewOrder(orderId)}>
              <Icon name="receipt" size={20} color={Colors.white} style={{marginRight: 8}} />
              <Text style={styles.viewOrderBtnText}>View Order Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Image Zoom Modal */}
      {isTopup && transaction.receiptUrl && (
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setImageModalVisible(false)}>
              <Icon name="close" size={30} color={Colors.white} />
            </TouchableOpacity>
            <Image source={{uri: transaction.receiptUrl}} style={styles.zoomImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  btn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  btnText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statusBannerText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  bannerApproved: {
    backgroundColor: Colors.success,
  },
  bannerRejected: {
    backgroundColor: Colors.error,
  },
  bannerPending: {
    backgroundColor: Colors.neutral,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    margin: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    color: Colors.text,
  },
  valueId: {
    fontSize: 14,
    fontFamily: 'Courier',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  amountTotal: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  receiptSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  receiptHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  receiptContainer: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  receiptThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.backgroundLight,
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  zoomText: {
    color: Colors.white,
    fontSize: 12,
    marginLeft: 4,
  },
  actionsContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  reuploadContainer: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  reuploadWarningText: {
    color: Colors.error,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  reuploadBtn: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reuploadBtnDisabled: {
    opacity: 0.6,
  },
  reuploadBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrderBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewOrderBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: Spacing.sm,
  },
  zoomImage: {
    width: width,
    height: width * 1.5,
  },
});

export default WalletTransactionDetailScreen;
