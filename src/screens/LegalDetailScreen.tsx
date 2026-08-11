import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LEGAL_CONTENT = {
  tos: {
    title: 'Terms of Service',
    content:
      "Last Updated: April 17, 2026\n\nWelcome to NextDoor. By using our application, you agree to the following terms and conditions. Please read them carefully.\n\n1. Acceptance of Terms\nBy accessing or using NextDoor, you agree to be bound by these Terms of Service and all applicable laws and regulations.\n\n2. Use License\nPermission is granted to temporarily download one copy of the materials (information or software) on NextDoor's app for personal, non-commercial transitory viewing only.\n\n3. Disclaimer\nThe materials on NextDoor are provided on an 'as is' basis. NextDoor makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.\n\n4. Limitations\nIn no event shall NextDoor or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on NextDoor.\n\n5. Account Security\nYou are responsible for maintaining the confidentiality of your account and password and for restricting access to your mobile device.",
  },
  privacy: {
    title: 'Privacy Policy',
    content:
      "Last Updated: April 17, 2026\n\nYour privacy is important to us. It is NextDoor's policy to respect your privacy regarding any information we may collect while operating our app.\n\n1. Information We Collect\nWe collect information you provide directly to us, such as when you create or modify your account, request services, contact customer support, or otherwise communicate with us.\n\n2. Use of Information\nWe may use the information we collect about you to: Provide, maintain, and improve our Services; Perform internal operations; Send or facilitate communications between you and a merchant.\n\n3. Sharing of Information\nWe may share the information we collect about you as described in this Statement or as described at the time of collection or sharing.\n\n4. Security\nWe take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.\n\n5. Your Choices\nYou may update, correct or delete information about you at any time by logging into your online account or emailing us.",
  },
  pdpa: {
    title: 'Data Protection Policy',
    content:
      'Last Updated: April 17, 2026\n\nIn compliance with the Personal Data Protection Act (PDPA), NextDoor is committed to protecting your personal data.\n\n1. Consent\nBy providing your personal data to us, you consent to the collection, use, and disclosure of your personal data by NextDoor in accordance with this Policy.\n\n2. Purpose of Collection\nPersonal data is collected primarily for the purpose of fulfilling orders, processing payments, and improving our customer experience.\n\n3. Accuracy\nWe will take reasonable steps to ensure that the personal data we collect is accurate and complete.\n\n4. Protection\nWe have implemented appropriate security measures to protect your personal data against unauthorized access, use, or disclosure.\n\n5. Retention\nWe will cease to retain your personal data as soon as it is reasonable to assume that the purpose for which that personal data was collected is no longer being served by retention of the personal data.',
  },
};

const LegalDetailScreen = ({navigation, route}: any) => {
  const {type} = route.params;
  const data =
    LEGAL_CONTENT[type as keyof typeof LEGAL_CONTENT] || LEGAL_CONTENT.tos;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="chevron-left" size={28} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{data.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.text}>{data.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  placeholder: {
    width: 44,
  },
  scrollContent: {
    padding: Spacing.xl,
  },
  text: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

export default LegalDetailScreen;
