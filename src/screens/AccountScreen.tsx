import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {AuthGuardView} from '../components/AuthGuardView';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrder} from '../context/OrderContext';

import {db} from '../services/firebase';
import {getAuth} from '@react-native-firebase/auth';
import molpay from 'fiuu-mobile-xdk-reactnative';
import {KEYS} from '../config/keys';
import {clearStoredData} from '../utils/storage';
import {launchImageLibrary} from 'react-native-image-picker';
import {uploadReceiptToStorage} from '../services/storage';
import {getFirestore, serverTimestamp} from '@react-native-firebase/firestore';

const AccountScreen = ({navigation}: any) => {
  const {
    isAuthenticated,
    user,
    profile,
    walletBalance,
    updateWalletBalance,
    logout,
    loading,
  } = useAuthViewModel();
  const {resetOrder} = useOrder();
  const [topupModalVisible, setTopupModalVisible] = React.useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = React.useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'fiuu' | 'manual'>('fiuu');
  const [qrModalVisible, setQrModalVisible] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGuardView
        title="My Account"
        description="Login to manage your profile, view recent orders, and save your favorite meals."
        onLoginPress={() => navigation.navigate('Login')}
      />
    );
  }

  const TOPUP_PACKAGES = [
    { price: 30, bonus: 3 },
    { price: 50, bonus: 6 },
    { price: 100, bonus: 15 },
  ];

  const handleTopup = (packageIndex: number) => {
    const pkg = TOPUP_PACKAGES[packageIndex];
    if (!pkg) return;

    setTopupModalVisible(false);

    if (!user) {
      return;
    }

    const amount = pkg.price;
    const totalCredit = pkg.price + pkg.bonus;

    const paymentDetails = {
      mp_username: KEYS.FIUU.USERNAME,
      mp_password: KEYS.FIUU.PASSWORD,
      mp_merchant_ID: KEYS.FIUU.MERCHANT_ID,
      mp_app_name: KEYS.FIUU.APP_NAME || 'NextDoor',
      mp_verification_key: KEYS.FIUU.VERIFICATION_KEY,
      mp_amount: amount.toFixed(2),
      mp_order_ID: `TOPUP_${Date.now()}`,
      mp_currency: 'MYR',
      mp_country: 'MY',
      mp_channel: 'multi',
      mp_bill_description: `Wallet Top-Up - RM${amount.toFixed(0)}`,
      mp_bill_name: profile?.displayName || user?.displayName || 'Guest User',
      mp_bill_email: profile?.email || user?.email || 'guest@example.com',
      mp_bill_mobile:
        profile?.phoneNumber || user?.phoneNumber || '+60123456789',
      mp_closebutton_display: true,
    };

    setTimeout(() => {
      try {
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
              await updateWalletBalance(totalCredit);
              Alert.alert(
                'Success',
                `Successfully topped up RM ${totalCredit.toFixed(
                  2,
                )} (including bonus) to your wallet.`,
              );
            } else if (result.status_code === '11') {
              Alert.alert('Failed', 'Top-up payment failed or was cancelled.');
            } else if (result.status_code === '22') {
              Alert.alert('Pending', 'Top-up payment is pending.');
            } else {
              console.log('Payment status unknown:', result.status_code);
            }
          } catch (e) {
            console.error('Error parsing payment result:', e);
            Alert.alert(
              'Error',
              'An error occurred while processing the payment result.',
            );
          }
        });
      } catch (error) {
        console.error('Molpay SDK execution error:', error);
        Alert.alert(
          'System Error',
          'Could not open the payment gateway. Please try again.',
        );
      }
    }, 400);
  };

  const handleConfirmPayment = () => {
    setTopupModalVisible(false);
    if (selectedPaymentMethod === 'fiuu') {
      handleTopup(selectedPackageIndex);
    } else {
      setQrModalVisible(true);
    }
  };

  const handleReceiptUpload = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to proceed.');
      return;
    }

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

      // Create manual topup request in Firestore
      const pkg = TOPUP_PACKAGES[selectedPackageIndex];
      await getFirestore().collection('topups').add({
        userId: user.uid,
        amount: pkg.price,
        bonus: pkg.bonus,
        totalCredit: pkg.price + pkg.bonus,
        paymentMethod: 'manual_transfer',
        receiptUrl: receiptUrl,
        status: 'pending_verification',
        createdAt: serverTimestamp(),
      });

      setQrModalVisible(false);
      Alert.alert(
        'Success',
        'Top-up receipt submitted successfully! Please wait for an admin or cashier to complete the verification. Once verified, you can use your wallet balance to pay.',
      );
    } catch (e) {
      console.error('Error handling top-up receipt upload:', e);
      Alert.alert('Error', 'Could not submit your receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.phoneNumber?.slice(-1) ||
                  user?.email?.charAt(0).toUpperCase() ||
                  'U'}
              </Text>
            </View>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>
              {user?.phoneNumber || user?.email}
            </Text>

            <View style={styles.walletContainer}>
              <View>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletAmount}>
                  RM {walletBalance.toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.topupButton}
                onPress={() => setTopupModalVisible(true)}>
                <Text style={styles.topupButtonText}>Top Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('OrderHistory')}>
              <Icon name="history" size={24} color={Colors.primary} />
              <Text style={styles.menuItemText}>Order History</Text>
              <Icon name="chevron-right" size={24} color={Colors.grey} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('EditProfile')}>
              <Icon
                name="account-edit-outline"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.menuItemText}>Edit Profile</Text>
              <Icon name="chevron-right" size={24} color={Colors.grey} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="bell-outline" size={24} color={Colors.primary} />
              <Text style={styles.menuItemText}>Notifications</Text>
              <Icon name="chevron-right" size={24} color={Colors.grey} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                navigation.navigate('AddressSelection', {mode: 'manage'})
              }>
              <Icon
                name="map-marker-outline"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.menuItemText}>Manage Addresses</Text>
              <Icon name="chevron-right" size={24} color={Colors.grey} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await logout();
              resetOrder();
              await clearStoredData();
            }}>
            <Icon name="logout" size={20} color={Colors.error || '#FF3B30'} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={topupModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTopupModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Top Up Packages</Text>
                <Text style={styles.modalSubtitle}>Select a package to top up</Text>

                <View style={styles.packagesContainer}>
                  {TOPUP_PACKAGES.map((pkg, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.packageButton,
                        selectedPackageIndex === index && styles.packageButtonSelected,
                      ]}
                      onPress={() => setSelectedPackageIndex(index)}>
                      <Text style={[
                        styles.packagePrice,
                        selectedPackageIndex === index && { color: Colors.primary },
                      ]}>RM {pkg.price}</Text>
                      <View style={styles.packageBonusBadge}>
                        <Text style={styles.packageBonusText}>+ RM {pkg.bonus} Bonus</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionTitle, { alignSelf: 'flex-start', paddingHorizontal: 0 }]}>Select Payment Method</Text>
                <View style={styles.paymentMethodsContainer}>
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
                    onPress={() => setTopupModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleConfirmPayment}>
                    <Text style={styles.confirmButtonText}>
                      {selectedPaymentMethod === 'fiuu' ? 'Pay' : 'Continue'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Icon name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Scan to Top Up</Text>
              <View style={{width: 24}} />
            </View>

            <Text style={styles.qrInstructions}>
              Please scan the QR code to transfer RM {TOPUP_PACKAGES[selectedPackageIndex]?.price.toFixed(2)} via Touch 'n Go, then upload your receipt below.
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
              <Text style={styles.uploadBtnText}>
                {isUploading ? 'Uploading...' : 'Upload Receipt'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  packagesContainer: {
    width: '100%',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  packageButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  packageBonusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packageBonusText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: Spacing.xl * 2,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  walletContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  walletLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  walletAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 4,
  },
  topupButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  topupButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  seedButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seedButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  menuContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: Spacing.md,
    fontWeight: '500',
  },
  logoutButton: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
  },
  logoutButtonText: {
    color: Colors.error || '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.grey,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.backgroundLight,
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
  packageButtonSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '10',
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
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundLight,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.xl,
    padding: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    width: '100%',
  },
  uploadBtnDisabled: {
    opacity: 0.7,
  },
  uploadBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AccountScreen;
