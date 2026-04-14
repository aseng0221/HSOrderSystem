import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Colors, Spacing} from '../theme';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {Order} from '../types/order';

const OrderHistoryScreen = ({navigation}: any) => {
  const {orders, loading, fetchingMore, hasMore, fetchOrders} =
    useOrderHistoryViewModel();

  const handleLoadMore = () => {
    if (hasMore && !fetchingMore) {
      fetchOrders(true);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) {
      return '';
    }
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderItem = ({item}: {item: Order}) => {
    const itemCount = item.items.reduce((acc, curr) => acc + curr.quantity, 0);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() =>
          navigation.navigate('OrderHistoryDetail', {order: item})
        }>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>
            Order #{item.id.slice(-6).toUpperCase()}
          </Text>
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusBadge,
                item.status === 'completed'
                  ? styles.statusCompleted
                  : item.status === 'cancelled'
                  ? styles.statusCancelled
                  : styles.statusPending,
              ]}>
              {item.status.toUpperCase()}
            </Text>
            {item.paymentMethod === 'cash' &&
              item.paymentStatus === 'unpaid' && (
                <Text style={styles.unpaidCashText}>UNPAID (CASH)</Text>
              )}
          </View>
        </View>
        <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        <View style={styles.orderFooter}>
          <Text style={styles.itemCount}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.totalAmount}>
            $ {item.totalAmount.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!fetchingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{width: 30}} />
      </View>

      {loading && orders.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="receipt" size={60} color={Colors.grey} />
              <Text style={styles.emptyText}>No orders found.</Text>
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
    height: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  unpaidCashText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.error || '#C62828',
    marginTop: 4,
  },
  orderDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  itemCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default OrderHistoryScreen;
