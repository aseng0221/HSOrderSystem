import React, {useEffect, useState, useRef} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {collection, getDocs} from '@react-native-firebase/firestore';
import {db} from '../services/firebase';
import {useOrder} from '../context/OrderContext';
import {Branch} from '../types/branch';
import {MOCK_BRANCHES, MIRI_LOCATION} from '../constants/branches';
import {getCurrentLocation, calculateDistance} from '../utils/location';
import {Colors, Spacing, BorderRadius} from '../theme';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SPACING = Spacing.md;

const BranchSelectionScreen = ({navigation}: any) => {
  const {
    selectedBranch,
    setSelectedBranch,
    setOrderMode,
    orderMode,
    selectedAddress,
  } = useOrder();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadData();
  }, [orderMode, selectedAddress]);

  const loadData = async () => {
    try {
      let referenceLocation: {latitude: number; longitude: number};

      // If in delivery mode and we have a selected address, use its location as the reference
      if (
        orderMode === 'delivery' &&
        selectedAddress &&
        selectedAddress.latitude
      ) {
        console.log('Using selected address location for distance calculation');
        referenceLocation = {
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        };
      } else {
        console.log('Using device GPS location for distance calculation');
        referenceLocation = await getCurrentLocation();
      }

      setUserLocation(referenceLocation);

      let branchData: Branch[] = [];
      const branchesSnapshot = await getDocs(collection(db, 'branches'));

      if (branchesSnapshot.empty) {
        console.log('No branches found in Firestore, using mock data');
        branchData = MOCK_BRANCHES;
      } else {
        branchData = branchesSnapshot.docs.map((doc: any) => ({
          ...(doc.data() as Branch),
          id: doc.id,
        }));
      }

      const branchesWithDistance = branchData
        .map(branch => ({
          ...branch,
          distance: calculateDistance(
            referenceLocation.latitude,
            referenceLocation.longitude,
            branch.latitude,
            branch.longitude,
          ),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setBranches(branchesWithDistance);
      setLoading(false);

      // Initially focus on the nearest branch
      if (branchesWithDistance.length > 0) {
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: branchesWithDistance[0].latitude,
            longitude: branchesWithDistance[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error loading location:', error);
      setBranches(MOCK_BRANCHES);
      setLoading(false);
    }
  };

  const onScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (CARD_WIDTH + SPACING));
    if (index !== currentIndex && index >= 0 && index < branches.length) {
      setCurrentIndex(index);
      const branch = branches[index];
      mapRef.current?.animateToRegion({
        latitude: branch.latitude,
        longitude: branch.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const onSelectBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setOrderMode('pickup');
    navigation.navigate('MainTabs', {screen: 'Menu'});
  };

  const renderBranchCard = ({item}: {item: Branch}) => (
    <View style={styles.card}>
      <Image
        source={{
          uri:
            item.image ||
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500',
        }}
        style={styles.cardImage}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.branchName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.distanceText}>
            {item.distance?.toFixed(2)} km
            {orderMode === 'delivery' && selectedAddress
              ? ` from ${selectedAddress.name}`
              : ''}
          </Text>
        </View>
        <Text style={styles.branchAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.openStatus}>Open</Text>
          <Text style={styles.timeText}> | Closes {item.closeTime}</Text>
          <TouchableOpacity style={styles.directionLink}>
            <Text style={styles.directionText}>Get Direction</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onSelectBranch(item)}>
          <Text style={styles.selectButtonText}>Select This Store</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="chevron-left" size={30} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Your Outlet</Text>
      </SafeAreaView>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...MIRI_LOCATION,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        // provider={PROVIDER_GOOGLE}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
        {branches.map((branch, index) => (
          <Marker
            key={branch.id}
            coordinate={{
              latitude: branch.latitude,
              longitude: branch.longitude,
            }}
            onPress={() => {
              listRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0,
                viewOffset: Spacing.md,
              });
            }}>
            <View
              style={[
                styles.markerContainer,
                currentIndex === index && styles.activeMarker,
              ]}>
              <View style={styles.markerCircle}>
                <Text style={styles.markerText}>Z</Text>
              </View>
              <View style={styles.markerPointer} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={listRef}
          data={branches}
          renderItem={renderBranchCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + SPACING}
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          onMomentumScrollEnd={onScroll}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 40, // offset back button
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMarker: {
    transform: [{scale: 1.2}],
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  markerText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 20,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
    transform: [{rotate: '180deg'}],
    marginTop: -5,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
  },
  flatListContent: {
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginRight: SPACING,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.grey,
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  branchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  branchAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  openStatus: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  directionLink: {
    marginLeft: 'auto',
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary,
  },
  directionText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  selectButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  selectButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default BranchSelectionScreen;
