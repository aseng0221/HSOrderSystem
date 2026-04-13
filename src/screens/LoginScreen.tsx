import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import auth, {signInWithPhoneNumber} from '@react-native-firebase/auth';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeBiometrics from 'react-native-biometrics';
import {getSavedPhone, clearStoredData} from '../utils/storage';

const LoginScreen = ({navigation}: any) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [isBiometricView, setIsBiometricView] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSavedUser();
  }, []);

  const checkSavedUser = async () => {
    const phone = await getSavedPhone();
    if (phone) {
      setSavedPhone(phone);
      setIsBiometricView(true);
    }
  };

  const handleBiometricLogin = async () => {
    const rnBiometrics = new ReactNativeBiometrics();
    const {available, biometryType} = await rnBiometrics.isSensorAvailable();

    if (available) {
      const {success} = await rnBiometrics.simplePrompt({
        promptMessage: 'Confirm fingerprint or FaceID',
      });

      if (success) {
        // In a real app, you'd secure a token.
        // For this demo, we assume success allows bypass or simulates login.
        // Usually, you'd use the biometric to unlock a stored firebase custom token.
        Alert.alert('Success', 'Logged in via Biometrics');
        navigation.getParent()?.goBack();
      }
    } else {
      Alert.alert(
        'Error',
        'Biometric authentication is not available on this device.',
      );
    }
  };

  const handleSendOTP = async () => {
    if (phoneNumber.length < 9) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+60${phoneNumber}`;

      const confirmation = await signInWithPhoneNumber(auth(), formattedNumber);
      navigation.navigate('OTP', {confirmation, phoneNumber: formattedNumber});
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send OTP. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBiometricView = () => (
    <View style={styles.biometricContent}>
      <View style={styles.avatarLarge}>
        <Icon name="account-outline" size={60} color={Colors.grey} />
      </View>
      <Text style={styles.savedPhoneText}>{savedPhone}</Text>

      <TouchableOpacity
        style={styles.biometricButton}
        onPress={handleBiometricLogin}>
        <Text style={styles.biometricButtonText}>Log in with biometric</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        onPress={async () => {
          await clearStoredData();
          setSavedPhone(null);
          setIsBiometricView(false);
        }}>
        <Text style={styles.otherMethodText}>Login with Other Method</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDefaultView = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to HS Order</Text>
        <Text style={styles.subtitle}>Enter your phone number</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>+60</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor={Colors.grey}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          autoFocus={!isBiometricView}
        />
      </View>

      <Text style={styles.deliveryMethodLabel}>receive 6-digit code via</Text>

      <TouchableOpacity
        style={styles.whatsappButton}
        onPress={handleSendOTP}
        disabled={loading}>
        <Icon name="whatsapp" size={24} color={Colors.white} />
        <Text style={styles.buttonText}>Whatsapp</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.smsButton}
        onPress={handleSendOTP}
        disabled={loading}>
        <Icon
          name="message-processing-outline"
          size={24}
          color={Colors.white}
        />
        <Text style={styles.buttonText}>SMS</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.closeButton}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>

            {isBiometricView ? renderBiometricView() : renderDefaultView()}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By logging in or registering, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text>,{' '}
                <Text style={styles.linkText}>Privacy Policy</Text> and{' '}
                <Text style={styles.linkText}>
                  Personal Data Protection Policy
                </Text>
              </Text>
              <Text style={styles.versionText}>Version 5.5.19</Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
  },
  closeButton: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: Spacing.xl,
  },
  countryCode: {
    paddingRight: Spacing.md,
    marginRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCodeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 18,
    color: Colors.text,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md + 4,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.grey,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  biometricContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 20,
  },
  savedPhoneText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 40,
  },
  biometricButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: 30,
  },
  biometricButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 15,
    color: Colors.textSecondary,
    fontSize: 16,
  },
  otherMethodText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  deliveryMethodLabel: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    marginVertical: 20,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  smsButton: {
    backgroundColor: '#34B7F1',
    flexDirection: 'row',
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingBottom: 20,
  },
  linkText: {
    color: '#007AFF',
  },
  versionText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 20,
  },
});

export default LoginScreen;
