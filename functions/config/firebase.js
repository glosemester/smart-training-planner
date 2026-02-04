/**
 * Firebase Admin SDK Configuration
 * Shared across all Cloud Functions modules
 */

const admin = require('firebase-admin');

// Initialize only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage
};
