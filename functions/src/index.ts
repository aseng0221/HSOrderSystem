import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// 1. Triggered automatically when an Order document changes
export const onOrderStatusUpdate = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if status changed
    if (beforeData.status === afterData.status) return null;

    const newStatus = afterData.status;
    const userId = afterData.userId;

    // Fetch user's FCM token from profile
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM Token registered for user: ${userId}`);
      return null;
    }

    let title = '';
    let body = '';

    if (newStatus === 'ready_to_pickup') {
      title = 'Order Ready! ☕️';
      body = 'Your drink is ready for pickup at the counter!';
    } else if (newStatus === 'completed') {
      title = 'Order Completed! 🎉';
      body = 'Enjoy your drink! Thank you for ordering from NextDoor.';
    } else {
      return null; // Don't notify for other status transitions
    }

    // Build the payload with deep-linking parameters
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        screen: 'OrderHistoryDetail',
        params: JSON.stringify({
          order: { id: orderId, ...afterData }
        })
      }
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent order push notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending order push notification:', error);
      return null;
    }
  });

// 2. Triggered automatically when a Top-up document changes
export const onTopupStatusUpdate = functions.firestore
  .document('topups/{topupId}')
  .onUpdate(async (change, context) => {
    const topupId = context.params.topupId;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if status changed
    if (beforeData.status === afterData.status) return null;

    const newStatus = afterData.status;
    const userId = afterData.userId;
    const amount = afterData.amount || 0;

    // Fetch user's FCM token from profile
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM Token registered for user: ${userId}`);
      return null;
    }

    let title = '';
    let body = '';

    if (newStatus === 'approved') {
      title = 'Top Up Approved! 💰';
      body = `Your top-up of RM ${amount.toFixed(2)} was approved successfully.`;
    } else if (newStatus === 'rejected') {
      title = 'Top Up Rejected ⚠️';
      body = `Your top-up receipt of RM ${amount.toFixed(2)} verification failed. Tap to re-upload.`;
    } else {
      return null;
    }

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        screen: 'WalletTransactionDetail',
        params: JSON.stringify({
          id: topupId,
          type: 'topup'
        })
      }
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('Successfully sent topup push notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending topup push notification:', error);
      return null;
    }
  });
