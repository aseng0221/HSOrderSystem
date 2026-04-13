import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {AuthGuardView} from '../components/AuthGuardView';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrder} from '../context/OrderContext';

import {seedMenuData, seedMockOrders} from '../services/FirestoreSeeder';
import {
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';

import {clearStoredData} from '../utils/storage';
import {KEYS} from '../config/keys';
import molpay from 'fiuu-mobile-xdk-reactnative';

const AccountScreen = ({navigation}: any) => {
  const {isAuthenticated, user, walletBalance, updateWalletBalance, logout} =
    useAuthViewModel();
  const {resetOrder} = useOrder();
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [isSeedingOrders, setIsSeedingOrders] = React.useState(false);
  const [topupModalVisible, setTopupModalVisible] = React.useState(false);
  const [topupAmount, setTopupAmount] = React.useState('');

  if (!isAuthenticated) {
    return (
      <AuthGuardView
        title="My Account"
        description="Login to manage your profile, view recent orders, and save your favorite meals."
        onLoginPress={() => navigation.navigate('Login')}
      />
    );
  }

  const handleSeedData = async () => {
    setIsSeeding(true);
    const result = await seedMenuData();
    setIsSeeding(false);
    if (result.success) {
      Alert.alert('Success', 'Sample menu data has been added to Firestore!');
    } else {
      Alert.alert('Error', 'Failed to seed data. Check console for details.');
    }
  };

  const handleSeedOrders = async () => {
    if (!user) {
      return;
    }
    setIsSeedingOrders(true);
    const result = await seedMockOrders(user.uid);
    setIsSeedingOrders(false);
    if (result.success) {
      Alert.alert('Success', 'Sample orders have been added to Firestore!');
    } else {
      Alert.alert('Error', 'Failed to seed orders. Check console for details.');
    }
  };

  const handleTopup = () => {
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount < 20) {
      Alert.alert('Invalid Amount', 'Minimum top-up amount is RM 20.');
      return;
    }

    setTopupModalVisible(false);

    if (!user) {
      return;
    }

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
      mp_bill_description: 'Wallet Top-Up',
      mp_bill_name: user?.displayName || 'Guest User',
      mp_bill_email: user?.email || 'guest@example.com',
      mp_bill_mobile: user?.phoneNumber || '+60123456789',
      mp_closebutton_display: true,
    };

    molpay.startMolpay(paymentDetails, async (data: string) => {
      try {
        const result = JSON.parse(data);
        if (result.status_code === '00') {
          // Payment Success
          await updateWalletBalance(amount);
          Alert.alert(
            'Success',
            `Successfully topped up RM ${amount.toFixed(2)} to your wallet.`,
          );
          setTopupAmount('');
        } else if (result.status_code === '11') {
          Alert.alert('Failed', 'Top-up payment failed or was cancelled.');
        } else if (result.status_code === '22') {
          Alert.alert('Pending', 'Top-up payment is pending.');
        }
      } catch (e) {
        console.log('Error parsing payment result', e);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
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

          <TouchableOpacity
            style={styles.seedButton}
            onPress={handleSeedData}
            disabled={isSeeding}>
            {isSeeding ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.seedButtonText}>Seed Sample Menu Data</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.seedButton}
            onPress={handleSeedOrders}
            disabled={isSeedingOrders}>
            {isSeedingOrders ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Text style={styles.seedButtonText}>Seed Mock Orders</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('OrderHistory')}>
            <Icon name="history" size={24} color={Colors.primary} />
            <Text style={styles.menuItemText}>Order History</Text>
            <Icon name="chevron-right" size={24} color={Colors.grey} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
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
            <Icon name="map-marker-outline" size={24} color={Colors.primary} />
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

      <Modal
        visible={topupModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTopupModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Top Up Wallet</Text>
                <Text style={styles.modalSubtitle}>Minimum amount: RM 20</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={topupAmount}
                  onChangeText={setTopupAmount}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setTopupModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleTopup}>
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: Spacing.sm,
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
});

export default AccountScreen;
