import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {Colors} from '../theme';

const SplashScreen = ({navigation}: any) => {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={{opacity: fadeAnim}}>
        <Text style={styles.logo}>NextDoor</Text>
        <Text style={styles.title}>Made your day better</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    color: Colors.white,
    marginTop: 10,
    letterSpacing: 2,
    fontWeight: '300',
  },
});

export default SplashScreen;
