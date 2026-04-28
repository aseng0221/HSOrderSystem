import React, {useState, useRef, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SectionList,
  ActivityIndicator,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {useMenuViewModel} from '../viewmodels/useMenuViewModel';
import {useCart} from '../context/CartContext';
import {useOrder} from '../context/OrderContext';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import ProductCard from '../components/ProductCard';

const {width, height} = Dimensions.get('window');
const SIDEBAR_WIDTH = 100;
const CONTENT_WIDTH = width - SIDEBAR_WIDTH;

// Industry standard: Precision heights for SectionList optimization
const SECTION_HEADER_HEIGHT = 64; // Increased for better separation
const PRODUCT_ROW_HEIGHT = (CONTENT_WIDTH - 32) / 2 + 80; // Reduced height

const MenuScreen = () => {
  const navigation = useNavigation<any>();
  const {totalItems} = useCart();
  const {orderMode, setOrderMode, selectedBranch, selectedAddress} = useOrder();
  const {isAuthenticated} = useAuthViewModel();

  const {categories, products, globalOptions, loading, error} =
    useMenuViewModel();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const performActionOrRedirect = (action: () => void) => {
    if (!isAuthenticated) {
      navigation.navigate('Login');
    } else {
      action();
    }
  };
  const sectionListRef = useRef<FlatList>(null);
  const sidebarRef = useRef<FlatList>(null);
  const isUserScrollingSidebar = useRef(false);

  // Flatten data for FlatList to ensure perfect scroll sync
  const {flatData, categoryIndices} = useMemo(() => {
    const data: any[] = [];
    const indices: Record<string, number> = {};

    categories.forEach(cat => {
      // Mark index for this category
      indices[cat.id] = data.length;

      // Inline Header
      data.push({
        type: 'header',
        title: cat.name,
        id: cat.id,
      });

      const catProducts = products.filter(p => p.categoryId === cat.id);
      // Group products into rows of 2
      for (let i = 0; i < catProducts.length; i += 2) {
        data.push({
          type: 'row',
          products: catProducts.slice(i, i + 2),
          categoryId: cat.id,
        });
      }
    });

    return {flatData: data, categoryIndices: indices};
  }, [categories, products]);

  // Auto-select first category when loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories]);

  // Refs to avoid stale closures in viewability handlers
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    isUserScrollingSidebar.current = true;

    const flatIndex = categoryIndices[categoryId];
    if (flatIndex !== undefined) {
      setTimeout(() => {
        sectionListRef.current?.scrollToIndex({
          index: flatIndex,
          animated: true,
          viewPosition: 0,
        });
      }, 50);
    }

    // Lock sidebar sync for the duration of the scroll
    setTimeout(() => {
      isUserScrollingSidebar.current = false;
    }, 1000);
  };

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0 && !isUserScrollingSidebar.current) {
      const topItem = viewableItems[0].item;
      const catId = topItem.type === 'header' ? topItem.id : topItem.categoryId;

      if (catId) {
        // Use the ref to get the absolute latest categories
        const currentCategories = categoriesRef.current;

        setSelectedCategory(prev => {
          if (prev !== catId) {
            const catIndex = currentCategories.findIndex(c => c.id === catId);
            if (catIndex !== -1) {
              sidebarRef.current?.scrollToIndex({
                index: catIndex,
                animated: true,
                viewPosition: 0.5,
              });
            }
            return catId;
          }
          return prev;
        });
      }
    }
  }).current;

  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => {
    const isDelivery = orderMode === 'delivery';

    return (
      <View style={styles.header}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.addressSection}
            onPress={() =>
              performActionOrRedirect(() =>
                navigation.navigate(
                  isDelivery ? 'AddressSelection' : 'BranchSelection',
                ),
              )
            }>
            <Icon
              name={isDelivery ? 'map-marker-outline' : 'store-outline'}
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.addressText} numberOfLines={1}>
              {isDelivery
                ? selectedAddress?.name || 'Set Your Address'
                : selectedBranch?.name || 'Select Outlet'}
            </Text>
          </TouchableOpacity>


        </View>

        {isAuthenticated && (
          <View style={styles.subHeader}>
            {isDelivery ? (
              <>
                <Text style={styles.servedByLabel}>Served by:</Text>
                <TouchableOpacity
                  style={[
                    styles.branchPicker,
                    isDelivery && {
                      backgroundColor: '#F0F2F5',
                      borderColor: '#E1E5EB',
                      paddingVertical: 4, // Reduced from 8 to match pickup mode
                    },
                  ]}
                  onPress={
                    isDelivery
                      ? undefined
                      : () => navigation.navigate('BranchSelection')
                  }
                  activeOpacity={isDelivery ? 1 : 0.7}>
                  <Text
                    style={[
                      styles.branchPickerText,
                      isDelivery && {color: Colors.textSecondary},
                    ]}>
                    {selectedBranch
                      ? `${selectedBranch.name}, Miri`
                      : 'Select Branch'}
                    {selectedBranch?.distance &&
                      ` ${selectedBranch.distance.toFixed(1)} km`}
                  </Text>
                  {!isDelivery && (
                    <Icon name="chevron-down" size={18} color={Colors.grey} />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Open</Text>
                </View>
                <Text style={styles.distanceLabel}>
                  {selectedBranch?.distance
                    ? `${selectedBranch.distance.toFixed(1)} km from you`
                    : 'Distance N/A'}
                </Text>
              </>
            )}
            <View style={styles.weatherIcon}>
              <Icon name="white-balance-sunny" size={24} color="#88C057" />
            </View>
          </View>
        )}


      </View>
    );
  };

  const renderSidebarItem = ({item, index}: any) => {
    const isActive = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
        onPress={() => handleCategoryPress(item.id)}>
        <Icon
          name={item.icon}
          size={24}
          color={isActive ? Colors.primary : Colors.textSecondary}
        />
        <Text
          style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({item}: any) => {
    console.log(item);
    if (item.type === 'header') {
      return (
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLine} />
          <Text style={styles.categoryTitle}>{item.title}</Text>
        </View>
      );
    }

    if (!item?.products) {
      return null;
    }

    return (
      <View style={styles.row}>
        {item.products.map((product: any) => {
          if (!product) {
            return null;
          }
          return (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() =>
                performActionOrRedirect(() =>
                  navigation.navigate('ProductDetail', {
                    product,
                    globalOptions,
                  }),
                )
              }
            />
          );
        })}
        {item.products.length === 1 && (
          <View key="placeholder" style={styles.productCard} />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.mainContent}>
        <View style={styles.sidebar}>
          <FlatList
            ref={sidebarRef}
            data={categories}
            renderItem={renderSidebarItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
        <View style={styles.products}>
          <FlatList
            ref={sectionListRef}
            data={flatData}
            keyExtractor={(item, index) =>
              item.type === 'header'
                ? `h-${item.id}`
                : `row-${item.products[0]?.id}-${index}`
            }
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            getItemLayout={(data, index) => {
              let offset = 0;
              for (let i = 0; i < index; i++) {
                const item = data![i];
                offset +=
                  item.type === 'header'
                    ? SECTION_HEADER_HEIGHT
                    : PRODUCT_ROW_HEIGHT;
              }
              const currentItem = data![index];
              const length =
                currentItem.type === 'header'
                  ? SECTION_HEADER_HEIGHT
                  : PRODUCT_ROW_HEIGHT;
              return {length, offset, index};
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 30,
              minimumViewTime: 50,
            }}
            initialNumToRender={50}
            maxToRenderPerBatch={10}
            windowSize={11}
            removeClippedSubviews={false}
            ListEmptyComponent={() => (
              <View style={styles.centered}>
                <Text style={styles.statusDistance}>No items found.</Text>
              </View>
            )}
            ListFooterComponent={() => (
              <View style={styles.footerSpacer}>
                <View style={styles.endOfListLine} />
                <Text style={styles.endOfListText}>That's all for now!</Text>
                <Icon name="coffee-outline" size={24} color={Colors.grey} />
              </View>
            )}
          />
        </View>
      </View>

      {totalItems > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() =>
            performActionOrRedirect(() => navigation.navigate('Cart'))
          }>
          <Icon name="cart" size={28} color={Colors.white} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.xs,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334975',
    marginLeft: 8,
    marginRight: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E9F0',
    borderRadius: 20,
    padding: 2,
    width: 150,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 18,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.white,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    minHeight: 32, // Ensure consistent height
  },
  servedByLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  branchPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  branchPickerText: {
    flex: 1,
    fontSize: 14,
    color: '#88C057',
    fontWeight: '600',
  },
  weatherIcon: {
    marginLeft: 8,
  },
  promoBanner: {
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.sm,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  promoText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 8,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  distanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  sidebarItem: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarItemActive: {
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.backgroundLight,
  },
  sidebarText: {
    fontSize: 10,
    marginTop: 4,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sidebarTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  products: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    marginTop: Spacing.sm, // Add space from previous section
  },
  categoryLine: {
    width: 4,
    height: 16,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xs,
  },
  productCard: {
    flex: 1,
    margin: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.md, // Reduced from lg
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleBg: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 999,
  },
  tagBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tagText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.tagText,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    height: 38,
  },
  productPrice: {
    color: Colors.text,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 999,
  },
  footerSpacer: {
    height: 120,
    alignItems: 'center',
    paddingTop: 20,
  },
  endOfListLine: {
    width: 40,
    height: 2,
    backgroundColor: '#EEE',
    marginBottom: 12,
  },
  endOfListText: {
    color: Colors.grey,
    fontSize: 12,
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.secondary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusDistance: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default MenuScreen;
