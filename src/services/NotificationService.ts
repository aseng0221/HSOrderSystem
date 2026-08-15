import {Alert, PermissionsAndroid, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class NotificationService {
  async requestUserPermission() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS',
        );
        console.log('Android 13+ Notification Permission State:', granted);
      } catch (err) {
        console.warn('Android Permission Error:', err);
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await this.getFcmToken();
    }
  }

  async getFcmToken() {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('Your Firebase Token is:', fcmToken);
        const currentUser = auth().currentUser;
        if (currentUser) {
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
              fcmToken: fcmToken,
            });
          console.log('Saved FCM Token to Firestore successfully');
        }
      } else {
        console.log('Failed to check for FCM token');
      }
    } catch (error) {
      console.error('Error fetching FCM token:', error);
    }
  }

  // Foreground messages
  setupForegroundListener() {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
      Alert.alert(
        remoteMessage.notification?.title || 'Notification',
        remoteMessage.notification?.body || 'You have a new message',
      );
    });
    return unsubscribe;
  }

  // Handle tap when app is in background but not quit
  setupBackgroundTapListener(callback: (remoteMessage: any) => void) {
    return messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage.notification,
      );
      if (callback) {
        callback(remoteMessage);
      }
    });
  }

  // Handle tap when app was quit/killed
  async checkInitialNotification(callback: (remoteMessage: any) => void) {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log(
        'Notification caused app to open from quit state:',
        remoteMessage.notification,
      );
      if (callback) {
        callback(remoteMessage);
      }
    }
  }
}

export const notificationService = new NotificationService();
