/* ============================================================
   FIREBASE CONFIG — nafis-vault project
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyACRGMSO2-Vx90M828CvT_KvsBbs8ZAlog",
  authDomain: "nafis-vault.firebaseapp.com",
  projectId: "nafis-vault",
  storageBucket: "nafis-vault.firebasestorage.app",
  messagingSenderId: "999513956753",
  appId: "1:999513956753:web:2b7a89d9c8e8f31dd9fa30"
};

/* Initialize Firebase (compat SDK — loaded via <script> tags in HTML) */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ============================================================
   SESSION PERSISTENCE — set to NONE so login never survives a
   page reload, new tab, or browser restart. Every visit to the
   site requires signing in again with email + password.
   ============================================================ */
auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch((err) => {
  console.error('Failed to set auth persistence:', err);
});

/* ============================================================
   EMAIL + PASSWORD AUTH HELPERS
   Sign in / sign up / forgot-password are called directly via
   auth.signInWithEmailAndPassword() etc. from index.html.
   This just keeps a shared sign-out helper used by dashboard.html.
   ============================================================ */

/**
 * Sign the current user out and send them back to login.
 */
function vaultSignOut() {
  return auth.signOut();
}

/* ============================================================
   FIRESTORE DATA HELPERS — all data is scoped under
   /vaults/{uid}/items/{itemId} and /vaults/{uid}/folders/{folderId}
   so each signed-in user only ever touches their own vault.
   ============================================================ */

function userItemsRef() {
  const uid = auth.currentUser.uid;
  return db.collection('vaults').doc(uid).collection('items');
}

function userFoldersRef() {
  const uid = auth.currentUser.uid;
  return db.collection('vaults').doc(uid).collection('folders');
}

/** Real-time listener for all items. callback(itemsArray) fires on every change. */
function watchItems(callback) {
  return userItemsRef().orderBy('updatedAt', 'desc').onSnapshot((snap) => {
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  }, (err) => console.error('watchItems error:', err));
}

/** Real-time listener for all folders. */
function watchFolders(callback) {
  return userFoldersRef().orderBy('createdAt', 'asc').onSnapshot((snap) => {
    const folders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(folders);
  }, (err) => console.error('watchFolders error:', err));
}

/** Create or update an item. Pass id=null to create new. */
function saveItem(id, data) {
  const payload = { ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
  if (id) {
    return userItemsRef().doc(id).update(payload);
  } else {
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    return userItemsRef().add(payload);
  }
}

function deleteItem(id) {
  return userItemsRef().doc(id).delete();
}

function saveFolder(name, color) {
  return userFoldersRef().add({
    name, color,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function deleteFolder(id) {
  return userFoldersRef().doc(id).delete();
}
