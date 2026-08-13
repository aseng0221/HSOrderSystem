import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeBiometrics from 'react-native-biometrics';
import {getSavedPhone, clearStoredData, saveEmail} from '../utils/storage';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';

const LoginScreen = ({navigation, route}: any) => {
  const [email, setEmail] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const authUrl = route?.params?.authUrl;
  const [isBiometricView, setIsBiometricView] = useState(false);
  const [loading, setLoading] = useState(false);

  const {isAuthenticated} = useAuthViewModel();

  useEffect(() => {
    if (isAuthenticated) {
      Alert.alert('Success', 'Logged in successfully.');
      navigation.goBack();
    }
  }, [isAuthenticated, navigation]);

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
        <Text style={styles.title}>Welcome to NextDoor</Text>
        <Text style={styles.subtitle}>Sign in or create an account</Text>
      </View>

      <View style={styles.inputContainer}>
        <Icon
          name="email-outline"
          size={24}
          color={Colors.grey}
          style={{marginRight: 10}}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor={Colors.grey}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          autoFocus={!isBiometricView}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={async () => {
          if (!email) {
            Alert.alert('Incomplete', 'Please enter your email address.');
            return;
          }
          setLoading(true);
          try {
            if (authUrl) {
              const userCredential = await auth().signInWithEmailLink(
                email,
                authUrl,
              );
              const user = userCredential.user;

              const userDoc = await firestore()
                .collection('users')
                .doc(user.uid)
                .get();
              const userData = userDoc.data();
              if (!userData?.displayName || !userData?.phoneNumber) {
                navigation.navigate('ProfileSetup');
              }
              return;
            }
            const actionCodeSettings = {
              url: 'https://hsordersystem.firebaseapp.com/login',
              handleCodeInApp: true,
              iOS: {
                bundleId: 'org.reactjs.native.example.HSOrderSystem',
              },
              android: {
                packageName: 'com.hsordersystem',
                installApp: false,
              },
            };

            await auth().sendSignInLinkToEmail(email, actionCodeSettings);
            await saveEmail(email);

            Alert.alert(
              'Check your email',
              'We sent a magic link to your email address. Click it to log in.',
            );
          } catch (error: any) {
            console.error(error);
            Alert.alert(
              'Failed to send link',
              error.message || 'Please try again.',
            );
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading
            ? 'Please Wait...'
            : authUrl
            ? 'Complete Sign In'
            : 'Send Login Link'}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.closeButton}>
                <Icon name="close" size={24} color={Colors.text} />
              </TouchableOpacity>

              {isBiometricView ? renderBiometricView() : renderDefaultView()}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By logging in or registering, you agree to our{' '}
          <Text
            style={styles.linkText}
            onPress={() => navigation.navigate('LegalDetail', {type: 'tos'})}>
            Terms of Service
          </Text>
          ,{' '}
          <Text
            style={styles.linkText}
            onPress={() =>
              navigation.navigate('LegalDetail', {type: 'privacy'})
            }>
            Privacy Policy
          </Text>{' '}
          and{' '}
          <Text
            style={styles.linkText}
            onPress={() => navigation.navigate('LegalDetail', {type: 'pdpa'})}>
            Personal Data Protection Policy
          </Text>
        </Text>
        <Text style={styles.versionText}>Version 5.5.19</Text>
      </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
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
