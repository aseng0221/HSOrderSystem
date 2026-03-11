import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {saveUserPhone} from '../utils/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const OTPScreen = ({navigation, route}: any) => {
  const {confirmation, phoneNumber} = route.params;
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = React.useRef<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Listen for auth state changes (handles Android auto-verification)
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (user && !loading) {
        setLoading(true);
        try {
          await saveUserPhone(phoneNumber);
          navigation.reset({
            index: 0,
            routes: [{name: 'MainTabs'}],
          });
        } catch (error) {
          console.error('Auto-verify error:', error);
        } finally {
          setLoading(false);
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [navigation, phoneNumber, loading]);

  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const handleVerifyOTP = async (finalCode: string) => {
    setLoading(true);
    try {
      await confirmation.confirm(finalCode);
      const user = auth().currentUser;
      if (user) {
        await saveUserPhone(phoneNumber);
      }
      // Navigate to MainTabs which contains the Home screen
      navigation.reset({
        index: 0,
        routes: [{name: 'MainTabs'}],
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && code[index] === '') {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="chevron-left" size={28} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              <Icon name="account-circle" size={80} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Verification</Text>
            <Text style={styles.subtitle}>
              Enter the verification code we sent to your registered phone
              number {phoneNumber}
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={styles.otpBox}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={text => handleInputChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                textAlign="center"
              />
            ))}
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Resend code in{' '}
              <Text style={styles.timerText}>{formatTimer(timer)}</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (code.some(digit => digit === '') || loading) &&
                styles.buttonDisabled,
            ]}
            onPress={() => handleVerifyOTP(code.join(''))}
            disabled={code.some(digit => digit === '') || loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Text>
          </TouchableOpacity>

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
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  logoPlaceholder: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl * 2,
  },
  otpBox: {
    width: 45,
    height: 60,
    backgroundColor: '#F5F7FA',
    borderRadius: BorderRadius.md,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    borderWidth: 1,
    borderColor: '#E1E5EB',
  },
  resendContainer: {
    marginBottom: Spacing.xl,
  },
  resendText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  timerText: {
    color: '#007AFF', // Blue like the screenshot
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: Colors.primary,
    width: '100%',
    padding: Spacing.md + 4,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  buttonDisabled: {
    backgroundColor: Colors.grey,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  linkText: {
    color: '#007AFF',
  },
  versionText: {
    fontSize: 14,
    color: Colors.grey,
  },
});

export default OTPScreen;
