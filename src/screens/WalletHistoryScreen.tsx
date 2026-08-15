import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Colors, Spacing, BorderRadius} from '../theme';

interface TransactionItem {
  id: string;
  amount: number;
  bonus?: number;
  totalCredit?: number;
  status?: string;
  description: string;
  newBalance?: number;
  type: 'topup' | 'payment';
  createdAt: any;
}

const WalletHistoryScreen = ({navigation}: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<TransactionItem[]>([]);
  const user = auth().currentUser;

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // 1. Fetch current wallet balance from user profile
      const userDoc = await firestore()
        .collection('users')
        .doc(user.uid)
        .get();
      if (userDoc.exists) {
        setBalance(userDoc.data()?.walletBalance || 0);
      }

      // 2. Fetch topups
      const topupsSnap = await firestore()
        .collection('topups')
        .where('userId', '==', user.uid)
        .get();

      const topupItems: TransactionItem[] = topupsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount,
          bonus: data.bonus,
          totalCredit: data.totalCredit,
          status: data.status,
          type: 'topup',
          createdAt: data.createdAt,
          description: data.bonus > 0 
            ? `Top Up (+RM ${data.bonus.toFixed(2)} Bonus)` 
            : 'Top Up',
        };
      });

      // 3. Fetch wallet_transactions subcollection
      const txsSnap = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('wallet_transactions')
        .get();

      const txItems: TransactionItem[] = txsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          amount: data.amount,
          newBalance: data.newBalance,
          description: data.description || 'Wallet Transaction',
          type: 'payment',
          createdAt: data.createdAt,
        };
      });

      // 4. Combine and Sort by date descending
      const combined = [...topupItems, ...txItems];
      combined.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        return timeB - timeA;
      });

      setHistory(combined);
    } catch (error) {
      console.error('Error fetching wallet history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWalletData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      default:
        return styles.statusPending;
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'pending_verification') return 'PENDING';
    return status.toUpperCase();
  };

  const renderItem = ({item}: {item: TransactionItem}) => {
    const isTopup = item.type === 'topup';
    const isApprovedTopup = isTopup && item.status === 'approved';
    const isRejectedTopup = isTopup && item.status === 'rejected';
    const isPendingTopup = isTopup && item.status === 'pending_verification';

    // Amount text and color
    let amountText = '';
    let amountColor = Colors.text;

    if (isTopup) {
      amountText = `+RM ${item.amount.toFixed(2)}`;
      if (isApprovedTopup) {
        amountColor = Colors.success;
      } else if (isRejectedTopup) {
        amountColor = Colors.error;
      } else {
        amountColor = Colors.neutral;
      }
    } else {
      // Payment (could be negative or positive adjustment)
      const amt = item.amount;
      if (amt < 0) {
        amountText = `-RM ${Math.abs(amt).toFixed(2)}`;
        amountColor = Colors.error;
      } else {
        amountText = `+RM ${amt.toFixed(2)}`;
        amountColor = Colors.success;
      }
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('WalletTransactionDetail', {
          id: item.id,
          type: item.type
        })}>
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Icon
              name={isTopup ? 'wallet-plus-outline' : 'cash-register'}
              size={24}
              color={isTopup ? Colors.primary : Colors.secondary}
            />
          </View>
          <View style={styles.detailsContainer}>
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.rightContainer}>
            <Text style={[styles.amount, {color: amountColor}]}>
              {amountText}
            </Text>
            {isTopup && item.status && (
              <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet History</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => `${item.type}_${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Icon name="wallet" size={24} color={Colors.white} />
                <Text style={styles.balanceLabel}>Current Balance</Text>
              </View>
              <Text style={styles.balanceAmount}>RM {balance.toFixed(2)}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="history" size={48} color={Colors.grey} />
              <Text style={styles.emptyText}>No wallet history found.</Text>
            </View>
          }
        />
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  balanceAmount: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.white,
  },
  statusApproved: {
    backgroundColor: Colors.success,
  },
  statusRejected: {
    backgroundColor: Colors.error,
  },
  statusPending: {
    backgroundColor: Colors.neutral,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});

export default WalletHistoryScreen;
