import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {useRewardsViewModel} from '../viewmodels/useRewardsViewModel';
import {Order} from '../types/order';

const HomeScreen = ({navigation}: any) => {
  const {user} = useAuthViewModel();
  const {orders} = useOrderHistoryViewModel();
  const {profile, checkIn} = useRewardsViewModel();
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to check-in for points.');
      navigation.navigate('Login');
      return;
    }

    setCheckingIn(true);
    const success = await checkIn();
    setCheckingIn(false);

    if (success) {
      Alert.alert('Success', 'Checked in successfully! You earned 10 points.');
    } else {
      Alert.alert(
        'Already Checked In',
        'You have already checked in today. Come back tomorrow!',
      );
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) {
      return '';
    }
    // Handle Firestore timestamp or regular JS timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Morning, {profile?.displayName || 'Guest'}!
          </Text>
          <Text style={styles.subText}>What's your order today?</Text>
          {user && (
            <Text style={styles.pointsText}>
              Points: {profile?.points || 0}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.promoCard}
          onPress={handleCheckIn}
          disabled={checkingIn}>
          <Text style={styles.promoTitle}>Daily Check-in</Text>
          <Text style={styles.promoSubtitle}>
            {checkingIn ? 'Checking in...' : 'Tap here to get 10 points!'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Recently Ordered</Text>
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              You haven't ordered anything yet.
            </Text>
          </View>
        ) : (
          orders.map((order: Order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() =>
                navigation.navigate('OrderHistoryDetail', {order})
              }>
              <View style={styles.orderHeader}>
                <Text style={styles.orderDate}>
                  {formatDate(order.createdAt)}
                </Text>
                <View style={styles.statusContainer}>
                  <Text
                    style={[
                      styles.orderStatus,
                      {
                        color:
                          order.status === 'completed' ||
                          order.status === 'ready_to_pickup'
                            ? Colors.primary
                            : Colors.textSecondary,
                      },
                    ]}>
                    {order.status === 'pending' &&
                    order.paymentMethod === 'online' &&
                    order.paymentStatus === 'unpaid'
                      ? 'PENDING PAYMENT'
                      : order.status.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  {order.paymentMethod === 'cash' &&
                    order.paymentStatus === 'unpaid' && (
                      <Text style={styles.unpaidBadge}>UNPAID (CASH)</Text>
                    )}
                </View>
              </View>
              <Text style={styles.orderAmount}>
                RM {order.totalAmount.toFixed(2)}
              </Text>
              <Text style={styles.orderItems}>
                {order.items
                  .map(item => `${item.quantity}x ${item.product.name}`)
                  .join(', ')}
              </Text>
            </TouchableOpacity>
          ))
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
  content: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  promoCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  promoTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  promoSubtitle: {
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 8,
  },
  orderCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  unpaidBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.error || '#FF3B30',
    marginTop: 2,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  orderItems: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;
