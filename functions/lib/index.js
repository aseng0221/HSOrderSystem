"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderCreated = exports.onTopupStatusUpdate = exports.onOrderStatusUpdate = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// 1. Triggered automatically when an Order document changes
exports.onOrderStatusUpdate = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
    const orderId = context.params.orderId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if status changed
    if (beforeData.status === afterData.status)
        return null;
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
    }
    else if (newStatus === 'completed') {
        title = 'Order Completed! 🎉';
        body = 'Enjoy your drink! Thank you for ordering from NextDoor.';
    }
    else {
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
    }
    catch (error) {
        console.error('Error sending order push notification:', error);
        return null;
    }
});
// 2. Triggered automatically when a Top-up document changes
exports.onTopupStatusUpdate = functions.firestore
    .document('topups/{topupId}')
    .onUpdate(async (change, context) => {
    const topupId = context.params.topupId;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // Check if status changed
    if (beforeData.status === afterData.status)
        return null;
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
    }
    else if (newStatus === 'rejected') {
        title = 'Top Up Rejected ⚠️';
        body = `Your top-up receipt of RM ${amount.toFixed(2)} verification failed. Tap to re-upload.`;
    }
    else {
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
    }
    catch (error) {
        console.error('Error sending topup push notification:', error);
        return null;
    }
});
// 3. Triggered automatically when a new Order document is created
exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
    const data = snap.data();
    const orderId = context.params.orderId;
    const orderSource = data.orderSource || 'pos'; // default to pos for legacy
    const today = new Date();
    // Use Malaysia time (UTC+8)
    const msOffset = 8 * 60 * 60 * 1000;
    const localTime = new Date(today.getTime() + msOffset);
    const dateString = localTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const counterRef = admin.firestore().collection('daily_order_counters').doc(dateString);
    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let newNumber;
            if (!counterDoc.exists) {
                // Initialize for the day
                if (orderSource === 'pos') {
                    newNumber = 3000;
                    transaction.set(counterRef, { posCounter: 3000, userCounter: 999 });
                }
                else {
                    newNumber = 1000;
                    transaction.set(counterRef, { posCounter: 2999, userCounter: 1000 });
                }
            }
            else {
                const counters = counterDoc.data() || {};
                if (orderSource === 'pos') {
                    newNumber = (counters.posCounter || 2999) + 1;
                    transaction.update(counterRef, { posCounter: newNumber });
                }
                else {
                    newNumber = (counters.userCounter || 999) + 1;
                    transaction.update(counterRef, { userCounter: newNumber });
                }
            }
            // Update the order doc with the generated number
            const orderRef = admin.firestore().collection('orders').doc(orderId);
            transaction.update(orderRef, { orderNumber: newNumber });
        });
        console.log(`Successfully generated orderNumber for order ${orderId}`);
    }
    catch (error) {
        console.error(`Error generating orderNumber for order ${orderId}:`, error);
    }
});
//# sourceMappingURL=index.js.map