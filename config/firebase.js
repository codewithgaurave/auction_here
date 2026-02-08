import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseApp;

try {
  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8')
  );

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
}

export const sendNotification = async (fcmToken, title, body, data = {}) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Notification send failed:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendNotificationToMultiple = async (fcmTokens, title, body, data = {}) => {
  try {
    if (!firebaseApp) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      notification: {
        title,
        body,
      },
      data,
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Notifications sent: ${response.successCount}/${fcmTokens.length}`);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Notification send failed:', error.message);
    return { success: false, error: error.message };
  }
};

export default admin;
