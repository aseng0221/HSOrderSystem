import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Spacing } from '../theme';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }: any) => {
  const {
    product,
    globalOptions: allGlobalOptions,
    cartItemId,
    initialQuantity,
    initialSelectedOptions,
  } = route.params;

  const { addItem, removeItem } = useCart();
  const [quantity, setQuantity] = useState(initialQuantity || 1);

  // Resolve Global Options (Option B)
  const resolvedOptions = useMemo(() => {
    return (product.globalOptions || [])
      .map((id: string) => allGlobalOptions?.find((g: any) => g.id === id))
      .filter(Boolean);
  }, [product, allGlobalOptions]);

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >(() => {
    if (initialSelectedOptions) {
      return initialSelectedOptions;
    }

    const defaults: Record<string, string[]> = {};
    resolvedOptions.forEach((group: any) => {
      const defaultSelections = group.options
        .filter((opt: any) => opt.isDefault)
        .map((opt: any) => opt.id);
      if (defaultSelections.length > 0) {
        defaults[group.id] = defaultSelections;
      }
    });
    return defaults;
  });

  // Helper to check if a group is for Ice Level
  const isIceLevelGroup = (group: any) => {
    return group.name?.toLowerCase().includes('ice');
  };

  // Helper to check if "Hot" is selected in any temperature group
  const isHotSelected = useMemo(() => {
    const tempGroups = resolvedOptions.filter((g: any) =>
      g.name?.toLowerCase().includes('temp') || g.name?.toLowerCase().includes('temperature')
    );
    for (const group of tempGroups) {
      const selectedIds = selectedOptions[group.id] || [];
      const hasHot = selectedIds.some(optId => {
        const optionChoice = group.options?.find((o: any) => o.id === optId);
        return optionChoice?.name?.toLowerCase().includes('hot');
      });
      if (hasHot) {
        return true;
      }
    }
    return false;
  }, [resolvedOptions, selectedOptions]);

  const shouldHideGroup = (group: any) => {
    return isIceLevelGroup(group) && isHotSelected;
  };

  // Automatically clear selected options for hidden groups, and restore defaults when they become visible again
  useEffect(() => {
    let hasChanges = false;
    const updated = { ...selectedOptions };

    resolvedOptions.forEach((group: any) => {
      const isHidden = shouldHideGroup(group);
      const currentSelections = selectedOptions[group.id] || [];

      if (isHidden) {
        if (currentSelections.length > 0) {
          delete updated[group.id];
          hasChanges = true;
        }
      } else {
        if (currentSelections.length === 0) {
          const defaultOpt = group.options?.find((opt: any) => opt.isDefault);
          if (defaultOpt) {
            updated[group.id] = [defaultOpt.id];
            hasChanges = true;
          } else if (group.options?.length > 0 && (group.required || group.isRequired)) {
            updated[group.id] = [group.options[0].id];
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      setSelectedOptions(updated);
    }
  }, [isHotSelected, resolvedOptions, selectedOptions]);

  const { unitPrice, totalPrice } = useMemo(() => {
    let basePrice = parseFloat(product.price.replace(/[^\d.]/g, ''));
    let optionsPrice = 0;

    // Add option prices
    Object.values(selectedOptions)
      .flat()
      .forEach(optId => {
        resolvedOptions.forEach((group: any) => {
          const option = group.options.find((o: any) => o.id === optId);
          if (option?.price) {
            const optPrice =
              typeof option.price === 'string'
                ? parseFloat(option.price.replace(/[^\d.]/g, ''))
                : option.price;
            if (!isNaN(optPrice)) {
              optionsPrice += optPrice;
            }
          }
        });
      });

    const calculatedUnitPrice = basePrice + optionsPrice;
    return {
      unitPrice: calculatedUnitPrice,
      totalPrice: calculatedUnitPrice * quantity,
    };
  }, [product, selectedOptions, quantity, resolvedOptions]);

  const handleOptionSelect = (
    groupId: string,
    optionId: string,
    type: string,
    max?: number,
    isRequired?: boolean,
  ) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      if (type === 'pick_one' || type === 'boolean') {
        if (current.includes(optionId)) {
          if (!isRequired) {
            return { ...prev, [groupId]: [] };
          }
          return prev;
        }
        return { ...prev, [groupId]: [optionId] };
      }
      if (type === 'multi_select') {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter(id => id !== optionId) };
        }
        if (max && current.length >= max) {
          return prev;
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
      return prev;
    });
  };

  const handleAddToCart = () => {
    // Validate mandatory option groups
    for (const group of resolvedOptions) {
      if (shouldHideGroup(group)) {
        continue;
      }
      if (group.required || group.isRequired) {
        const selections = selectedOptions[group.id] || [];
        if (selections.length === 0) {
          Alert.alert('Selection Required', `Please choose an option for ${group.name}.`);
          return;
        }
      }
    }

    if (cartItemId) {
      removeItem(cartItemId);
    }
    addItem({
      id: cartItemId || `${product.id}-${Date.now()}`,
      product,
      quantity,
      selectedOptions,
      unitPrice, // Pass unit price to cart
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{product.name}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: product.image || 'https://via.placeholder.com/300',
              cache: 'force-cache',
            }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {resolvedOptions.map((group: any) => {
            if (shouldHideGroup(group)) return null;
            return (
              <View key={group.id} style={styles.optionGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>
                    {group.name} <Icon name="information-outline" size={14} />
                  </Text>
                  <Text style={styles.selectionType}>
                    {group.type === 'pick_one'
                      ? ((group.required || group.isRequired) ? '* Pick 1' : '')
                      : `Select up to ${group.maxSelections || ''}`}
                  </Text>
                </View>
                <View style={styles.optionsList}>
                  {group.options.map((opt: any) => {
                    const isSelected = selectedOptions[group.id]?.includes(
                      opt.id,
                    );
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.optionBtn,
                          isSelected && styles.optionBtnActive,
                        ]}
                        onPress={() =>
                          handleOptionSelect(
                            group.id,
                            opt.id,
                            group.type,
                            group.maxSelections,
                            group.required || group.isRequired,
                          )
                        }>
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextActive,
                          ]}>
                          {opt.name}{' '}
                          {opt.price ? (
                            <Text>
                              (+RM{' '}
                              {(typeof opt.price === 'number'
                                ? opt.price
                                : parseFloat(opt.price.replace(/[^\d.]/g, '')) ||
                                0
                              ).toFixed(2)}
                              )
                            </Text>
                          ) : null}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.footerPrice}>RM {totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}>
              <Icon
                name={
                  Number(quantity) > 1 ? 'minus-circle' : 'minus-circle-outline'
                }
                size={28}
                color={Number(quantity) > 1 ? Colors.primary : Colors.grey}
              />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(q => q + 1)}>
              <Icon name="plus-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.buyBtn}>
            <Text style={styles.buyBtnText}>Buy Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart}>
            <Text style={styles.cartBtnText}>
              {cartItemId ? 'Update Cart' : 'Add To Cart'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  imageContainer: {
    width: width,
    height: 300,
    backgroundColor: Colors.backgroundLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  optionGroup: {
    marginBottom: Spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  selectionType: {
    fontSize: 12,
    color: Colors.grey,
    fontStyle: 'italic',
  },
  optionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  optionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F4FF',
  },
  optionText: {
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  footerLabel: {
    color: Colors.grey,
    fontSize: 12,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buyBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProductDetailScreen;
