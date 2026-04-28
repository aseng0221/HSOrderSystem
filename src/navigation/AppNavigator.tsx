import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import View from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import AccountScreen from '../screens/AccountScreen';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import BranchSelectionScreen from '../screens/BranchSelectionScreen';
import AddressSelectionScreen from '../screens/AddressSelectionScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import OrderHistoryDetailScreen from '../screens/OrderHistoryDetailScreen';
import OrderModeModal from '../components/OrderModeModal';
import {useOrder, OrderMode} from '../context/OrderContext';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';

import {GiftCardScreen, RewardsScreen} from '../screens/PlaceholderScreens';
import LegalDetailScreen from '../screens/LegalDetailScreen';
import {Colors} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = ({navigation}: any) => {
  const {orderMode, setOrderMode, selectedBranch, selectedAddress} = useOrder();
  const {isAuthenticated} = useAuthViewModel();
  const [modalVisible, setModalVisible] = React.useState(false);

  const onModeSelect = (mode: OrderMode) => {
    setOrderMode(mode);
    setModalVisible(false);
    if (mode === 'pickup') {
      navigation.navigate('BranchSelection');
    } else {
      navigation.navigate('AddressSelection');
    }
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({route}) => ({
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.grey,
          headerShown: false,
          tabBarIcon: ({focused, color, size}) => {
            let iconName = '';

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Menu') {
              iconName = focused
                ? 'silverware-fork-knife'
                : 'silverware-fork-knife';
            } else if (route.name === 'Gift Card') {
              iconName = focused ? 'gift' : 'gift-outline';
            } else if (route.name === 'Rewards') {
              iconName = focused ? 'star-circle' : 'star-circle-outline';
            } else if (route.name === 'Account') {
              iconName = focused ? 'account' : 'account-outline';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
        })}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          listeners={{
            tabPress: e => {
              if (
                isAuthenticated &&
                (!orderMode ||
                  (orderMode === 'pickup' && !selectedBranch) ||
                  (orderMode === 'delivery' && !selectedAddress))
              ) {
                e.preventDefault();
                setModalVisible(true);
              }
            },
          }}
        />
        <Tab.Screen name="Gift Card" component={GiftCardScreen} />
        <Tab.Screen name="Rewards" component={RewardsScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>

      <OrderModeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={onModeSelect}
      />
    </>
  );
};

import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen
          name="BranchSelection"
          component={BranchSelectionScreen}
        />
        <Stack.Screen
          name="AddressSelection"
          component={AddressSelectionScreen}
        />
        <Stack.Screen name="AddAddress" component={AddAddressScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen
          name="OrderHistoryDetail"
          component={OrderHistoryDetailScreen}
        />
        {/* Auth Flow & Legal Modal Group */}
        <Stack.Group screenOptions={{presentation: 'modal'}}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
          <Stack.Screen name="LegalDetail" component={LegalDetailScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
