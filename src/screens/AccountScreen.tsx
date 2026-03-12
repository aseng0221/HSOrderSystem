import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {AuthGuardView} from '../components/AuthGuardView';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrder} from '../context/OrderContext';

import {seedMenuData, seedMockOrders} from '../services/FirestoreSeeder';
import {Alert, ActivityIndicator} from 'react-native';

import {clearStoredData} from '../utils/storage';

const AccountScreen = ({navigation}: any) => {
  const {isAuthenticated, user, logout} = useAuthViewModel();
  const {resetOrder} = useOrder();
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [isSeedingOrders, setIsSeedingOrders] = React.useState(false);

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
          <TouchableOpacity style={styles.menuItem}>
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
});

export default AccountScreen;
