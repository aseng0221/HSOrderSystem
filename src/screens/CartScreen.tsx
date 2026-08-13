import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import molpay from 'fiuu-mobile-xdk-reactnative';
import {Colors, Spacing, BorderRadius} from '../theme';
import {useCart} from '../context/CartContext';
import {useOrderHistoryViewModel} from '../viewmodels/useOrderHistoryViewModel';
import {useRewardsViewModel} from '../viewmodels/useRewardsViewModel';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useOrder} from '../context/OrderContext';
import {KEYS} from '../config/keys';
import {useMenuViewModel} from '../viewmodels/useMenuViewModel';

const PAYMENT_METHODS = [
  {id: 'nextdoor_balance', title: 'NextDoor Balance', subtitle: '(RM 6.65)', label: 'Recommended', icon: 'wallet-outline'},
  {id: 'online_banking', title: 'Online Banking', subtitle: '', icon: 'bank-outline'},
  {id: 'ewallet', title: 'E-Wallet', subtitle: 'ShopeePay / SPayLater', icon: 'cellphone-nfc'},
  {id: 'credit_card', title: 'Credit / Debit Card', subtitle: '', icon: 'credit-card-outline'},
  {id: 'apple_pay', title: 'Apple Pay', subtitle: '', icon: 'apple'},
];

const CartScreen = ({navigation}: any) => {
  const {cart, totalPrice, updateQuantity, removeItem, clearCart, addItem} = useCart();
  const {createOrder, updateOrderPaymentStatus} = useOrderHistoryViewModel();
  const {addPointsForPurchase} = useRewardsViewModel();
  const {user} = useAuthViewModel();
  const {orderMode, selectedBranch, selectedAddress} = useOrder();
  const {products, globalOptions} = useMenuViewModel();

  const crossSellItems = useMemo(() => {
    // Only pick items not already in the cart, max 4
    const cartIds = cart.map(item => item.product.id);
    return products.filter(p => !cartIds.includes(p.id)).slice(0, 4);
  }, [products, cart]);

  const [remarks, setRemarks] = useState('');
  const [needStraws, setNeedStraws] = useState(false);
  const [needPaperBag, setNeedPaperBag] = useState(false);
  
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[2]); // Default E-Wallet

  const sstAmount = totalPrice * 0.06;
  const subtotal = totalPrice; // Assuming totalPrice in cart doesn't include SST for this calculation
  const grandTotal = subtotal; // Assuming display price is inclusive of SST for simplicity, or we add it. The screenshot shows Amount RM 6.80, Subtotal RM 6.80, Grand Total RM 6.80, and 6% SST (RM 0.38). This implies the base price is inclusive of SST.
  const pointsEarned = Math.floor(grandTotal * 3); // Approx 20pts for RM6.80
  const cupCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to proceed with checkout.');
      navigation.navigate('Login');
      return;
    }

    if (selectedPayment.id === 'nextdoor_balance') {
       handleCashPayment(); // Mocking NextDoor balance as instant
    } else {
       handleFiuuPayment();
    }
  };

  const handleCashPayment = async () => {
    try {
      await createOrder({
        userId: user!.uid,
        items: cart,
        totalAmount: grandTotal,
        status: 'pending',
        orderMode: orderMode || 'pickup',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid',
        branchId: selectedBranch?.id || null,
        addressId: selectedAddress?.id || null,
      });

      await addPointsForPurchase(grandTotal);

      Alert.alert(
        'Order Placed',
        'Your order has been placed successfully!',
      );
      clearCart();
      navigation.navigate('Home');
    } catch (e) {
      Alert.alert('Error', 'Could not place your order. Please try again.');
    }
  };

  const handleFiuuPayment = async () => {
    try {
      const orderId = await createOrder({
        userId: user!.uid,
        items: cart,
        totalAmount: grandTotal,
        status: 'pending',
        orderMode: orderMode || 'pickup',
        paymentMethod: 'online',
        paymentStatus: 'unpaid',
        branchId: selectedBranch?.id || null,
        addressId: selectedAddress?.id || null,
      });

      const paymentDetails = {
        mp_username: KEYS.FIUU.USERNAME,
        mp_password: KEYS.FIUU.PASSWORD,
        mp_merchant_ID: KEYS.FIUU.MERCHANT_ID,
        mp_app_name: KEYS.FIUU.APP_NAME || 'NextDoor',
        mp_verification_key: KEYS.FIUU.VERIFICATION_KEY,
        mp_amount: grandTotal.toFixed(2),
        mp_order_ID: orderId,
        mp_currency: 'MYR',
        mp_country: 'MY',
        mp_channel: 'multi',
        mp_bill_description: 'Order from NextDoor',
        mp_bill_name: user?.displayName || 'Guest User',
        mp_bill_email: user?.email || 'guest@example.com',
        mp_bill_mobile: user?.phoneNumber || '+60123456789',
        mp_closebutton_display: true,
      };

      molpay.startMolpay(paymentDetails, async (data: any) => {
        try {
          let result;
          if (typeof data === 'string') {
            try { result = JSON.parse(data); } catch (e) { result = {status_code: data}; }
          } else { result = data; }

          if (result && result.status_code === '00') {
            await updateOrderPaymentStatus(orderId, 'paid');
            await addPointsForPurchase(grandTotal);
            Alert.alert('Success', 'Your order is confirmed!');
            clearCart();
            navigation.navigate('Home');
          } else if (result && result.status_code === '11') {
            Alert.alert('Failed', 'Payment failed or cancelled.');
            navigation.navigate('Home');
          } else if (result && result.status_code === '22') {
            Alert.alert('Pending', 'Payment is pending.');
            navigation.navigate('Home');
          } else {
            Alert.alert('Payment Error', 'An issue occurred with payment.');
          }
        } catch (e) {
          console.log('Error handling payment result', e);
        }
      });
    } catch (e) {
      Alert.alert('Error', 'Could not create your order. Please try again.');
    }
  };

  const renderPaymentModal = () => (
    <Modal
      visible={paymentModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setPaymentModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
              <Icon name="chevron-left" size={30} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Payment Methods</Text>
            <View style={{width: 30}} />
          </View>
          
          <ScrollView>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                style={styles.paymentMethodRow}
                onPress={() => setSelectedPayment(method)}>
                <Icon 
                  name={selectedPayment.id === method.id ? 'check-circle' : 'circle-outline'} 
                  size={24} 
                  color={selectedPayment.id === method.id ? Colors.primary : Colors.grey} 
                />
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>
                    {method.title} {method.subtitle ? <Text style={{color: Colors.textSecondary}}>{method.subtitle}</Text> : ''}
                  </Text>
                  {method.label && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>{method.label}</Text>
                    </View>
                  )}
                  {method.id === 'nextdoor_balance' && (
                    <Text style={styles.zusPromoText}>Enjoy faster checkout with NextDoor Balance!</Text>
                  )}
                  {method.id === 'ewallet' && (
                    <Text style={styles.ewalletSubtext}>ShopeePay / SPayLater</Text>
                  )}
                </View>
                {method.id === 'nextdoor_balance' && (
                  <TouchableOpacity style={styles.topUpBtnModal}>
                    <Text style={styles.topUpBtnTextModal}>+ Top Up</Text>
                  </TouchableOpacity>
                )}
                {(method.id === 'online_banking' || method.id === 'ewallet') && (
                   <Icon name="chevron-down" size={20} color={Colors.grey} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setPaymentModalVisible(false)}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order confirmation</Text>
        <View style={{width: 30}} />
      </View>

      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          {/* PICKUP AT SECTION */}
          <Text style={styles.sectionTitle}>Pickup At</Text>
          <View style={styles.pickupCard}>
            <View style={styles.pickupInfo}>
              <Text style={styles.branchName}>{selectedBranch?.name || 'Permy Mall, Miri'}</Text>
              <View style={styles.addressRow}>
                <Icon name="map-marker-outline" size={16} color={Colors.textSecondary} style={{marginTop: 2}} />
                <Text style={styles.branchAddress}>{selectedBranch?.address || 'Location Address'}</Text>
              </View>
              <View style={styles.pickupTimeRow}>
                <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.pickupTimeText}>Pickup at Outlet:</Text>
              </View>
            </View>
            <View style={styles.pickupIllustration}>
               <Icon name="storefront-outline" size={50} color={Colors.primary} />
            </View>
          </View>

          {/* YOUR ORDER SECTION */}
          <View style={styles.orderSectionHeader}>
             <Text style={styles.sectionTitle}>Your Order</Text>
             <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
                <Text style={styles.addItemsText}>Add Items</Text>
             </TouchableOpacity>
          </View>

          {cart.map(item => (
            <View key={item.id} style={styles.orderItem}>
              <TouchableOpacity 
                style={styles.orderItemInfo} 
                onPress={() => navigation.navigate('ProductDetail', {
                  product: item.product,
                  globalOptions: globalOptions,
                  cartItemId: item.id,
                  initialQuantity: item.quantity,
                  initialSelectedOptions: item.selectedOptions
                })}
              >
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.editText}>EDIT</Text>
              </TouchableOpacity>
              <Text style={styles.itemPrice}>RM {item.unitPrice.toFixed(2)}</Text>
              <View style={styles.qtyRow}>
                 <View>
                    <Text style={styles.qtyTextLabel}>Qty {item.quantity}</Text>
                    <Text style={styles.itemOptions}>
                      {Object.entries(item.selectedOptions)
                        .map(([_, ids]) => (ids as string[]).join(', '))
                        .join(' | ')}
                    </Text>
                 </View>
                 <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Icon name="trash-can-outline" size={20} color={Colors.grey} />
                 </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* CROSS SELL SECTION */}
          <Text style={styles.sectionTitle}>Frequently Enjoyed With</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.crossSellScroll}>
             {crossSellItems.map(item => (
               <View key={item.id} style={styles.crossSellCard}>
                 {item.image ? (
                   <Image source={{uri: item.image, cache: 'force-cache'}} style={styles.crossSellImage} />
                 ) : (
                   <View style={styles.crossSellImage} />
                 )}
                 <Text style={styles.crossSellName} numberOfLines={2}>{item.name}</Text>
                 <Text style={styles.crossSellPrice}>+ RM {item.price.toFixed(2)}</Text>
                 <TouchableOpacity style={styles.addBtn} onPress={() => {
                   addItem({
                     id: `${item.id}-${Date.now()}`,
                     product: item,
                     quantity: 1,
                     selectedOptions: {},
                     unitPrice: item.price
                   });
                   Alert.alert('Added', `${item.name} has been added to your cart.`);
                 }}>
                    <Icon name="plus" size={16} color={Colors.primary} />
                    <Text style={styles.addBtnText}>Add</Text>
                 </TouchableOpacity>
               </View>
             ))}
          </ScrollView>

          {/* SPECIAL REMARKS */}
          <Text style={styles.sectionTitle}>Special Remarks</Text>
          <View style={styles.remarksBox}>
            <Icon name="comment-edit-outline" size={20} color={Colors.grey} style={{marginTop: 5}}/>
            <TextInput
              style={styles.remarksInput}
              placeholder="Let us know if you have any special requests.&#10;E.g. I need sugar sachet."
              multiline
              maxLength={30}
              value={remarks}
              onChangeText={setRemarks}
            />
            <Text style={styles.charCount}>{remarks.length}/30</Text>
          </View>

          {/* PACKAGING */}
          <Text style={styles.sectionTitle}>Packaging <Text style={{fontWeight: 'normal', color: Colors.grey, fontSize: 12}}>[If you really really really need it :)]</Text></Text>
          <TouchableOpacity style={styles.packagingRow} onPress={() => setNeedStraws(!needStraws)}>
             <Icon name={needStraws ? 'check-circle' : 'circle-outline'} size={24} color={needStraws ? Colors.primary : Colors.border} />
             <Text style={styles.packagingText}>I need Straws</Text>
             <Icon name="cup-water" size={24} color="#65B2FF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.packagingRow} onPress={() => setNeedPaperBag(!needPaperBag)}>
             <Icon name={needPaperBag ? 'check-circle' : 'circle-outline'} size={24} color={needPaperBag ? Colors.primary : Colors.border} />
             <Text style={styles.packagingText}>I need Paper Bag for my order</Text>
             <Icon name="shopping-outline" size={24} color="#65B2FF" />
          </TouchableOpacity>

          {/* PAYMENT METHODS */}
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity style={styles.paymentSelector} onPress={() => setPaymentModalVisible(true)}>
            <View>
              <Text style={styles.paymentMethodTop}>{selectedPayment.title}</Text>
              {selectedPayment.subtitle ? <Text style={styles.paymentMethodBottom}>{selectedPayment.subtitle}</Text> : null}
            </View>
            <Icon name="chevron-right" size={24} color={Colors.grey} />
          </TouchableOpacity>
          <View style={styles.fasterCheckoutBanner}>
             <Text style={styles.fasterCheckoutText}>Enjoy faster checkout by paying with NextDoor Balance!</Text>
          </View>

          {/* VOUCHERS */}
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 8}}>
            <Text style={[styles.sectionTitle, {marginTop: 0, marginBottom: 0}]}>Vouchers</Text>
            <View style={[styles.blueDot, {marginLeft: 4, marginBottom: 0}]} />
          </View>
          <TouchableOpacity style={styles.voucherBox}>
             <View style={styles.addVoucherLeft}>
                <Icon name="plus-circle-outline" size={20} color={Colors.border} />
                <Text style={styles.addVoucherText}>Add Voucher</Text>
             </View>
             <Icon name="chevron-right" size={20} color={Colors.border} />
          </TouchableOpacity>

          {/* PAYMENT DETAILS */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryText}>Amount (Incl. 6% SST)</Text>
             <Text style={styles.summaryText}>RM {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryText}>Voucher</Text>
             <Text style={styles.summaryText}>- RM 0.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
             <Text style={styles.summaryText}>Subtotal</Text>
             <Text style={styles.summaryText}>RM {subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryText}>Rounding Adj</Text>
             <Text style={styles.summaryText}>RM 0.00</Text>
          </View>
          <View style={styles.grandTotalRow}>
             <Text style={styles.grandTotalLabel}>Grand Total</Text>
             <Text style={styles.grandTotalAmount}>RM {grandTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.taxText}>6% SST</Text>
             <Text style={styles.taxText}>(RM {sstAmount.toFixed(2)})</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.taxText}>NextDoor Points Earned</Text>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={styles.zBadge}><Text style={styles.zBadgeText}>N</Text></View>
                <Text style={styles.taxText}> {pointsEarned} pts</Text>
             </View>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.taxText}>Cup Count <Icon name="information-outline" size={12} /></Text>
             <Text style={styles.taxText}>🍹 +{cupCount} cups</Text>
          </View>
          
          <View style={{height: 50}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER */}
      <View style={styles.footer}>
         <View>
            <Text style={styles.footerItemCount}>{cart.length} items</Text>
            <Text style={styles.footerTotal}>RM {grandTotal.toFixed(2)}</Text>
         </View>
         <TouchableOpacity style={styles.orderBtn} onPress={handlePlaceOrder}>
            <Text style={styles.orderBtnText}>Order Now</Text>
         </TouchableOpacity>
      </View>

      {renderPaymentModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight || '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 50,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334975',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pickupCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupInfo: {
    flex: 1,
  },
  branchName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334975',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 10,
  },
  branchAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    lineHeight: 18,
  },
  pickupTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupTimeText: {
    fontSize: 12,
    color: Colors.grey,
    marginLeft: 4,
  },
  pickupIllustration: {
    width: 60,
    alignItems: 'flex-end',
  },
  orderSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addItemsText: {
    color: '#65B2FF',
    fontSize: 14,
    fontWeight: '600',
  },
  orderItem: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#334975',
    flex: 1,
  },
  editText: {
    color: '#65B2FF',
    fontSize: 12,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334975',
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  qtyTextLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  itemOptions: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  crossSellScroll: {
    flexDirection: 'row',
  },
  crossSellCard: {
    width: 130,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  crossSellImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#F0F0F0',
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
  },
  crossSellName: {
    fontSize: 12,
    color: '#334975',
    height: 35,
  },
  crossSellPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334975',
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 4,
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  remarksBox: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  remarksInput: {
    flex: 1,
    marginLeft: 8,
    minHeight: 60,
    fontSize: 12,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 10,
    color: Colors.grey,
  },
  packagingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  packagingText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  paymentSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  paymentMethodTop: {
    fontSize: 14,
    color: '#334975',
  },
  paymentMethodBottom: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fasterCheckoutBanner: {
    backgroundColor: '#EEF2FB',
    padding: 8,
    borderRadius: BorderRadius.sm,
    marginTop: -4,
    zIndex: -1,
  },
  fasterCheckoutText: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: 'center',
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#65B2FF',
    marginBottom: 8,
  },
  voucherBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  addVoucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addVoucherText: {
    marginLeft: 8,
    color: Colors.border,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  taxText: {
    fontSize: 12,
    color: Colors.grey,
  },
  zBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  zBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerItemCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  orderBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  orderBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 15,
  },
  paymentMethodTitle: {
    fontSize: 14,
    color: Colors.text,
  },
  recommendedBadge: {
    backgroundColor: '#D7A77C',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  recommendedText: {
    color: Colors.white,
    fontSize: 10,
  },
  zusPromoText: {
    color: '#55C5CD',
    fontSize: 12,
    marginTop: 4,
  },
  ewalletSubtext: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  topUpBtnModal: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  topUpBtnTextModal: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalFooter: {
    padding: Spacing.md,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;
