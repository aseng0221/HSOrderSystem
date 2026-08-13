import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, BorderRadius} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useAuthViewModel} from '../viewmodels/useAuthViewModel';

const EditProfileScreen = ({navigation}: any) => {
  const {user, profile} = useAuthViewModel();

  const [displayName, setDisplayName] = useState(
    profile?.displayName || user?.displayName || '',
  );
  const [phoneNumber, setPhoneNumber] = useState(
    profile?.phoneNumber || user?.phoneNumber || '',
  );

  const existingBirthdate = profile?.birthdate;
  const initialDate = existingBirthdate
    ? new Date(existingBirthdate)
    : new Date();

  const [birthdate, setBirthdate] = useState<Date | undefined>(
    existingBirthdate ? new Date(existingBirthdate) : undefined,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthdate(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!displayName.trim() || !phoneNumber.trim()) {
      Alert.alert('Incomplete', 'Please fill in both name and contact number.');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not logged in');
      }

      const updateData: any = {
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
      };

      if (!existingBirthdate && birthdate) {
        updateData.birthdate = formatDate(birthdate);
      }

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set(updateData, {merge: true});

      Alert.alert('Success', 'Profile updated successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{width: 24}} />
      </View>
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
              <View style={styles.inputContainer}>
                <Icon
                  name="account-outline"
                  size={24}
                  color={Colors.grey}
                  style={styles.inputIcon}
                />
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name (e.g. John Doe)"
                    placeholderTextColor={Colors.grey}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Icon
                  name="phone-outline"
                  size={24}
                  color={Colors.grey}
                  style={styles.inputIcon}
                />
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contact Number (e.g. 0123456789)"
                    placeholderTextColor={Colors.grey}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Icon
                  name="email-outline"
                  size={24}
                  color={Colors.grey}
                  style={styles.inputIcon}
                />
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>
                    Email (Cannot be changed)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput]}
                    value={profile?.email || user?.email || ''}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Icon
                  name="calendar-outline"
                  size={24}
                  color={Colors.grey}
                  style={styles.inputIcon}
                />
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Birthdate</Text>
                  {existingBirthdate ? (
                    <TextInput
                      style={[styles.input, styles.readOnlyInput]}
                      value={existingBirthdate}
                      editable={false}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      style={styles.datePickerButton}>
                      <Text
                        style={[
                          styles.input,
                          !birthdate && {color: Colors.grey},
                        ]}>
                        {birthdate ? formatDate(birthdate) : 'Select Birthdate'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={birthdate || initialDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}

              {showDatePicker && Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}>
                <Text style={styles.buttonText}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.md,
    marginTop: Spacing.md,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    paddingVertical: Spacing.xs,
    fontSize: 16,
    color: Colors.text,
  },
  readOnlyInput: {
    color: Colors.grey,
  },
  datePickerButton: {
    paddingVertical: Spacing.xs,
  },
  button: {
    backgroundColor: Colors.primary,
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
  doneButton: {
    alignSelf: 'flex-end',
    padding: Spacing.md,
  },
  doneButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EditProfileScreen;
