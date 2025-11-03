/*
 * Firebase Cloud Function: onAuth user delete -> recursively delete Firestore data
 * - Triggered when a Firebase Auth user is deleted (from app or console)
 * - Uses Admin SDK recursiveDelete to remove users/{uid} and all subcollections (e.g., expenses)
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Trigger when a Firebase Authentication user is deleted.
 * Ensures all Firestore data under users/{uid} is deleted promptly.
 */
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const userDocPath = `users/${uid}`;
  const db = admin.firestore();

  console.log(`[cleanupUserData] Start recursive delete for ${userDocPath}`);
  const start = Date.now();
  try {
    const userDocRef = db.doc(userDocPath);
    // Recursively delete users/{uid} and any subcollections (e.g., expenses)
    await db.recursiveDelete(userDocRef);
    console.log(`[cleanupUserData] Completed recursive delete for ${userDocPath} in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`[cleanupUserData] Failed recursive delete for ${userDocPath}:`, err);
    throw err;
  }
});

/*
Deployment instructions:
1) Login and initialize:
   - firebase login
   - firebase use <your-project-id>
2) Deploy only functions:
   - npm --prefix functions install
   - firebase deploy --only functions
*/
