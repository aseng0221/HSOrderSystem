import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useOrder} from '../context/OrderContext';
import {Address} from '../types/address';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {getDistance} from '../utils/location';
import {MOCK_BRANCHES} from '../constants/branches';

const AddressSelectionScreen = ({navigation, route}: any) => {
  const isManageMode = route.params?.mode === 'manage';
  const {selectedAddress, setSelectedAddress, setSelectedBranch} = useOrder();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('addresses')
      .onSnapshot(
        snapshot => {
          const fetchedAddresses: Address[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Address, 'id'>),
          }));
          setAddresses(fetchedAddresses);
          setLoading(false);
        },
        error => {
          console.error('Error fetching addresses:', error);
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const onSelect = async (address: Address) => {
    console.log(
      'Selecting address:',
      address.name,
      address.latitude,
      address.longitude,
    );
    setSelectedAddress(address);

    // Auto find nearest branch
    try {
      let branchData: any[] = [];
      const branchesSnapshot = await firestore().collection('branches').get();

      if (branchesSnapshot.empty) {
        console.log('No branches in Firestore, using mock data');
        branchData = MOCK_BRANCHES;
      } else {
        branchData = branchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      if (branchData.length > 0) {
        console.log('--- Nearest Branch Calculation Start ---');
        console.log(`Reference Address: ${address.name} (${address.street})`);
        console.log(
          `Address Coords: ${address.latitude}, ${address.longitude}`,
        );

        const isDefaultCoords =
          Math.abs((address.latitude || 0) - 4.3995) < 0.0001 &&
          Math.abs((address.longitude || 0) - 113.9914) < 0.0001;

        if (isDefaultCoords) {
          console.log(
            'Detected default Miri center coordinates. Prioritizing keyword matching.',
          );
        }

        let nearestBranch = branchData[0];
        let minDistance = Infinity;
        let foundMatch = false;

        // 1. Try Keyword Matching First if coordinates are default
        if (isDefaultCoords) {
          const addressString =
            `${address.name} ${address.street} ${address.city}`.toLowerCase();
          for (const branch of branchData) {
            const branchKeywords = branch.name.toLowerCase().split(' ');
            const match = branchKeywords.some(
              (keyword: string) =>
                keyword.length > 3 && addressString.includes(keyword),
            );

            if (match) {
              nearestBranch = branch;
              foundMatch = true;
              console.log(`✅ KEYWORD MATCH FOUND: ${branch.name}`);
              break;
            }
          }
        }

        // 2. Fallback to Distance Calculation
        if (!foundMatch) {
          branchData.forEach(branch => {
            const bLat =
              typeof branch.latitude === 'number'
                ? branch.latitude
                : parseFloat(branch.latitude);
            const bLon =
              typeof branch.longitude === 'number'
                ? branch.longitude
                : parseFloat(branch.longitude);
            const aLat =
              typeof address.latitude === 'number'
                ? address.latitude
                : parseFloat(address.latitude);
            const aLon =
              typeof address.longitude === 'number'
                ? address.longitude
                : parseFloat(address.longitude);

            if (!isNaN(bLat) && !isNaN(bLon) && !isNaN(aLat) && !isNaN(aLon)) {
              const distance = getDistance(aLat, aLon, bLat, bLon);
              console.log(
                `Branch: ${branch.name.padEnd(
                  25,
                )} | Distance: ${distance.toFixed(3)} km`,
              );
              if (distance < minDistance) {
                minDistance = distance;
                nearestBranch = {...branch, distance};
                foundMatch = true;
              }
            } else {
              console.log(`Branch: ${branch.name.padEnd(25)} | Missing Coords`);
            }
          });
        }

        console.log('--- Decision ---');
        if (nearestBranch) {
          console.log(`Final Selected Branch: ${nearestBranch.name}`);
          setSelectedBranch(nearestBranch);
        }
        console.log('--- Nearest Branch Calculation End ---');
      }
    } catch (error) {
      console.error('Error finding nearest branch:', error);
      // Fallback to first mock branch if error
      if (MOCK_BRANCHES.length > 0) {
        setSelectedBranch(MOCK_BRANCHES[0]);
      }
    }

    navigation.navigate('MainTabs', {screen: 'Menu'});
  };

  const handleDelete = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth().currentUser;
              if (user) {
                await firestore()
                  .collection('users')
                  .doc(user.uid)
                  .collection('addresses')
                  .doc(addressId)
                  .delete();

                if (selectedAddress?.id === addressId) {
                  setSelectedAddress(null);
                }
              }
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address.');
            }
          },
        },
      ],
    );
  };

  const renderAddressItem = ({item}: {item: Address}) => {
    const isSelected = selectedAddress?.id === item.id;
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={isManageMode ? undefined : () => onSelect(item)}
        activeOpacity={isManageMode ? 1 : 0.7}>
        {!isManageMode && (
          <View style={styles.radioContainer}>
            <View style={[styles.radio, isSelected && styles.radioActive]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.street}>
            {item.street}, {item.city}, {item.state}, {item.country}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.navigate('AddAddress', {address: item})}>
          <Icon name="pencil-outline" size={24} color={Colors.grey} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => handleDelete(item.id)}>
          <Icon name="trash-can-outline" size={24} color={Colors.grey} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Your Address</Text>
      </View>

      <Text style={styles.sectionTitle}>Saved Addresses</Text>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={Colors.primary}
        />
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddressItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="map-marker-off" size={60} color={Colors.grey} />
              <Text style={styles.emptyText}>No saved addresses yet.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddAddress')}>
        <Icon name="plus" size={24} color={Colors.white} />
        <Text style={styles.addButtonText}>Add New Address</Text>
      </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    alignItems: 'center',
  },
  radioContainer: {
    paddingRight: Spacing.md,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  street: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  iconBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  addButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  loader: {
    marginTop: Spacing.xl * 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl * 3,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.grey,
  },
});

export default AddressSelectionScreen;
