import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme';
import {AuthGuardView} from '../components/AuthGuardView';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';
import {useNavigation} from '@react-navigation/native';

const PlaceholderScreen = ({title}: {title: string}) => (
  <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Something amazing is coming here.</Text>
    </View>
  </SafeAreaView>
);

const ProtectedPlaceholderScreen = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  const {isAuthenticated, loading} = useAuthViewModel();
  const navigation = useNavigation<any>();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGuardView
        title={title}
        description={description}
        onLoginPress={() => navigation.navigate('Login')}
      />
    );
  }

  return <PlaceholderScreen title={title} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 10,
  },
});

export const GiftCardScreen = () => (
  <ProtectedPlaceholderScreen
    title="Gift Cards"
    description="Purchase and manage your gift cards to share the HS flavor with friends."
  />
);

export const RewardsScreen = () => (
  <ProtectedPlaceholderScreen
    title="Rewards"
    description="Earn points for every order and redeem them for delicious rewards."
  />
);
