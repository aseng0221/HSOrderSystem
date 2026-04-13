import React, {useEffect} from 'react';
import {seedMenuData} from '../services/FirestoreSeeder';
import {View, Text, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

const WelcomeScreen = () => {
  useEffect(() => {
    seedMenuData().then(() => console.log('Data seeded successfully'));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to NextDoor</Text>
        <Text style={styles.subtitle}>
          Your cross-platform ordering application.
        </Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Firebase Ready: Waiting for configuration files...
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#E9ECEF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  statusText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
