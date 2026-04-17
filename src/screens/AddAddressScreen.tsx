import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import MapView, {Marker} from 'react-native-maps';
import {MIRI_LOCATION} from '../constants/branches';
import {getCurrentLocation} from '../utils/location';

const AddAddressScreen = ({navigation, route}: any) => {
  const editAddress = route.params?.address;
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(editAddress?.name || '');
  const [street, setStreet] = useState(editAddress?.street || '');
  const [city, setCity] = useState(editAddress?.city || '');
  const [state, setState] = useState(editAddress?.state || 'Sarawak');
  const [postalCode, setPostalCode] = useState(editAddress?.postalCode || '');
  const [country, setCountry] = useState(editAddress?.country || 'Malaysia');
  const [latitude, setLatitude] = useState(
    editAddress?.latitude?.toString() || '4.3995',
  );
  const [longitude, setLongitude] = useState(
    editAddress?.longitude?.toString() || '113.9914',
  );
  const [region, setRegion] = useState({
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    if (!editAddress) {
      handleMyLocation();
    }
  }, []);

  const handleZoomIn = () => {
    setRegion({
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    });
  };

  const handleZoomOut = () => {
    setRegion({
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
      longitudeDelta: region.longitudeDelta * 2,
    });
  };

  const handleMyLocation = async () => {
    const location = await getCurrentLocation();
    setLatitude(location.latitude.toString());
    setLongitude(location.longitude.toString());
    setRegion({
      ...region,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  };

  const handleSave = async () => {
    if (!name || !street || !city || !postalCode) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save an address.');
        return;
      }

      const addressData = {
        name,
        street,
        city,
        state,
        postalCode,
        country,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        isDefault: editAddress?.isDefault || false,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const addressesRef = firestore()
        .collection('users')
        .doc(user.uid)
        .collection('addresses');

      if (editAddress) {
        await addressesRef.doc(editAddress.id).update(addressData);
      } else {
        await addressesRef.add({
          ...addressData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={30} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editAddress ? 'Edit Address' : 'Add New Address'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Address Nickname (e.g. Home, Office)</Text>
        <TextInput
          style={styles.input}
          placeholder="Home / Office / Mom's House"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Unit, House No, Street name"
          value={street}
          onChangeText={setStreet}
          multiline
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={city}
              onChangeText={setCity}
            />
          </View>
          <View style={[styles.flex1, {marginLeft: Spacing.md}]}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Postal Code"
              value={postalCode}
              onChangeText={setPostalCode}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          placeholder="State"
          value={state}
          onChangeText={setState}
        />

        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          placeholder="Country"
          value={country}
          onChangeText={setCountry}
          editable={false}
        />

        <Text style={styles.label}>Pin Location on Map</Text>
        <View style={styles.mapWrapper}>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              onRegionChangeComplete={setRegion}
              rotateEnabled={false}
              pitchEnabled={false}
              onPress={e => {
                setLatitude(e.nativeEvent.coordinate.latitude.toString());
                setLongitude(e.nativeEvent.coordinate.longitude.toString());
              }}>
              <Marker
                coordinate={{
                  latitude: parseFloat(latitude),
                  longitude: parseFloat(longitude),
                }}
                draggable
                onDragEnd={e => {
                  setLatitude(e.nativeEvent.coordinate.latitude.toString());
                  setLongitude(e.nativeEvent.coordinate.longitude.toString());
                }}
              />
            </MapView>
          </View>

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn}>
              <Icon name="plus" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut}>
              <Icon name="minus" size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, {marginTop: Spacing.sm}]}
              onPress={handleMyLocation}>
              <Icon name="crosshairs-gps" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>
              {editAddress ? 'Update Address' : 'Save Address'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  form: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: '#F9FAFB',
  },
  mapWrapper: {
    height: 200,
    width: '100%',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
  },
  controlBtn: {
    backgroundColor: Colors.white,
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    height: 55,
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Colors.grey,
  },
  saveBtnText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddAddressScreen;
