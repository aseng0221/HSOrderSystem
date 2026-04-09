import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import molpay from 'fiuu-mobile-xdk-reactnative';
import {Colors, Spacing} from '../theme';
import {useCart} from '../context/CartContext';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {useRewardsViewModel} from '../viewmodels/useRewardsViewModel';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrder} from '../context/OrderContext';
// import {KEYS} from '../config/keys';

const CartScreen = ({navigation}: any) => {
  const {cart, totalPrice, updateQuantity, clearCart} = useCart();
  const {createOrder} = useOrderHistoryViewModel();
  const {addPointsForPurchase} = useRewardsViewModel();
  const {user} = useAuthViewModel();
  const {orderMode, selectedBranch, selectedAddress} = useOrder();

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to proceed with checkout.');
      navigation.navigate('Login');
      return;
    }

    try {
      // Save order to history with 'cash' and 'unpaid' status
      await createOrder({
        userId: user.uid,
        items: cart,
        totalAmount: totalPrice,
        status: 'pending',
        orderMode: orderMode || 'pickup',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        branchId: selectedBranch?.id,
        addressId: selectedAddress?.id,
      });

      // Add reward points for completing the order submission
      await addPointsForPurchase(totalPrice);

      Alert.alert(
        'Order Placed',
        'Your order has been placed. Please pay by cash at the counter before pickup.',
      );
      clearCart();
      navigation.navigate('Home');
    } catch (e) {
      console.log('Error placing cash order', e);
      Alert.alert('Error', 'Could not place your order. Please try again.');
    }

    // ---- Fiuu Implementation (Disabled per user request) ----
    /*
    const finalizeOrder = async () => {
      // Save order to history
      await createOrder({
        userId: user.uid,
        items: cart,
        totalAmount: totalPrice,
        status: 'pending',
        orderMode: orderMode || 'pickup',
        paymentMethod: 'online',
        paymentStatus: 'paid',
        branchId: selectedBranch?.id,
        addressId: selectedAddress?.id,
      });

      // Add reward points for completing the order submission
      await addPointsForPurchase(totalPrice);

      Alert.alert('Success', 'Your order is confirmed!');
      clearCart();
      navigation.navigate('Home');
    };

    const paymentDetails = {
      mp_username: KEYS.FIUU.USERNAME,
      mp_password: KEYS.FIUU.PASSWORD,
      mp_merchant_ID: KEYS.FIUU.MERCHANT_ID,
      mp_app_name: 'HS Coffee',
      mp_verification_key: KEYS.FIUU.VERIFICATION_KEY,
      mp_amount: totalPrice.toFixed(2),
      mp_order_ID: 'ORDER' + Date.now(),
      mp_currency: 'MYR',
      mp_country: 'MY',
      mp_channel: 'multi',
      mp_bill_description: 'Order from HS Coffee',
      mp_bill_name: user?.displayName || 'Guest User',
      mp_bill_email: user?.email || 'guest@example.com',
      mp_bill_mobile: user?.phoneNumber || '+60123456789',
    };

    molpay.startMolpay(paymentDetails, async (data: string) => {
      try {
        const result = JSON.parse(data);
        if (result.status_code === '00') {
          // Payment Success
          await finalizeOrder();
        } else if (result.status_code === '11') {
          Alert.alert('Failed', 'Payment failed or cancelled.');
        } else if (result.status_code === '22') {
          Alert.alert('Pending', 'Payment is pending.');
          await finalizeOrder(); // Optionally finalize if pending is acceptable
        }
      } catch (e) {
        console.log('Error parsing payment result', e);
      }
    });
    */
  };

  const renderItem = ({item}: any) => (
    <View style={styles.cartItem}>
      <Image
        source={{uri: item.product.image || 'https://via.placeholder.com/150'}}
        style={styles.itemImage}
        resizeMode="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemOptions}>
          {Object.entries(item.selectedOptions)
            .map(([_, ids]) => (ids as string[]).join(', '))
            .join(' | ')}
        </Text>
        <Text style={styles.itemPrice}>
          $ {(item.unitPrice * item.quantity).toFixed(2)}
        </Text>
      </View>
      <View style={styles.quantityContainer}>
        <TouchableOpacity onPress={() => updateQuantity(item.id, -1)}>
          <Icon
            name={
              Number(item.quantity) > 1
                ? 'minus-circle'
                : 'minus-circle-outline'
            }
            size={24}
            color={Number(item.quantity) > 1 ? Colors.primary : Colors.grey}
          />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => updateQuantity(item.id, 1)}>
          <Icon name="plus-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{width: 30}} />
      </View>

      <FlatList
        data={cart}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={80} color={Colors.grey} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
          </View>
        )}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>$ {totalPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutBtnText}>
              Place Order (Pay by Cash)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: Spacing.md,
    backgroundColor: Colors.backgroundLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  itemOptions: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.grey,
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  totalLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;
