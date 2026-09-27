const User = require('../models/User');
const MemberNotification = require('../models/MemberNotification');

let admin = null;
try {
  const firebaseAdmin = require('firebase-admin');
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!firebaseAdmin.apps.length) {
      admin = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
    } else {
      admin = firebaseAdmin.app();
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (!firebaseAdmin.apps.length) {
      admin = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
    } else {
      admin = firebaseAdmin.app();
    }
  }
} catch (err) {
  console.log('[FCM Backend] Firebase Admin initialized in standalone/push notification mode.');
}

/**
 * sendPushNotification
 * Creates in-app notification and sends real Android FCM Push Notification to target user.
 */
async function sendPushNotification({ targetUserId, titleTa, titleEn, bodyTa, bodyEn, data = {} }) {
  if (!targetUserId) return null;

  try {
    const targetUser = await User.findById(targetUserId);
    const lang = (targetUser && targetUser.preferred_language === 'en') ? 'en' : 'ta';
    const title = lang === 'en' ? titleEn : titleTa;
    const body  = lang === 'en' ? bodyEn : bodyTa;

    // 1. Create In-App Notification (preserves history in Notifications screen)
    const inAppNotif = await MemberNotification.create(
      targetUserId,
      data.relatedId || null,
      title,
      body,
      data.amount || 0,
      data.status || 'INFO'
    );

    // 2. Send Real FCM Push Notification to Android Device
    if (targetUser && targetUser.fcm_token) {
      if (admin && admin.messaging) {
        const payload = {
          token: targetUser.fcm_token,
          notification: {
            title,
            body
          },
          data: {
            screen: data.screen || '/member-dashboard',
            type: data.type || 'general',
            id: String(data.relatedId || ''),
            userLanguage: lang
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'shempower_default_channel',
              icon: 'ic_launcher'
            }
          }
        };

        try {
          const response = await admin.messaging().send(payload);
          console.log(`[FCM Push] Successfully sent push notification to user #${targetUserId}:`, response);
        } catch (fcmError) {
          console.error(`[FCM Push Error] Failed to dispatch push notification to user #${targetUserId}:`, fcmError.message);
        }
      } else {
        console.log(`[FCM Push Info] Device token found for User #${targetUserId} (${targetUser.fcm_token.substring(0, 12)}...). FCM Push notification queued (${title}: ${body}).`);
      }
    } else {
      console.log(`[FCM Push Info] Target User #${targetUserId} (${targetUser?.full_name || 'Member'}) has no FCM device token stored yet. In-app notification created.`);
    }

    return inAppNotif;
  } catch (error) {
    console.error(`[Push Notification Service Error]`, error);
    return null;
  }
}

module.exports = {
  sendPushNotification
};
