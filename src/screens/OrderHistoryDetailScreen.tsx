import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Colors, Spacing} from '../theme';
import {Order, OrderItem} from '../types/order';

const OrderHistoryDetailScreen = ({route, navigation}: any) => {
  const {order} = route.params as {order: Order};

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
});

export default OrderHistoryDetailScreen;
