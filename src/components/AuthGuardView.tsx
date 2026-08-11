import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme';

interface AuthGuardViewProps {
  title: string;
  description: string;
  onLoginPress: () => void;
}

export const AuthGuardView: React.FC<AuthGuardViewProps> = ({
  title,
  description,
  onLoginPress,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <TouchableOpacity style={styles.button} onPress={onLoginPress}>
          <Text style={styles.buttonText}>Login / Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
