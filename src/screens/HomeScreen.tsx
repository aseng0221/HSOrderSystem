import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import {Colors, Spacing} from '../theme';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Morning, Guest!</Text>
          <Text style={styles.subText}>What's your order today?</Text>
        </View>

        <View style={styles.promoCard}>
          <Text style={styles.promoTitle}>Special Offer</Text>
          <Text style={styles.promoSubtitle}>
            Get 20% off on your first order
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Recently Ordered</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            You haven't ordered anything yet.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  subText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  promoCard: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  promoTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  promoSubtitle: {
    color: Colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});

export default HomeScreen;
