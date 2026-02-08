import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseApp;

try {
  // Try to load from environment variables first
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      universe_domain: 'googleapis.com'
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialized from environment variables');
  } else {
    // Fallback to JSON file
    const serviceAccount = JSON.parse(
      readFileSync(join(__dirname, 'firebase-service-account.json'), 'utf8')
    );

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firebase Admin initialized from JSON file');
  }
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
