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
   EMAIL-LINK (PASSWORDLESS) AUTH HELPERS
   Flow: user enters email → we email them a sign-in link →
   they click it → it opens this same site → we finish sign-in.
   ============================================================ */

// IMPORTANT: this must be a URL where THIS app is hosted, and
// must be added to Firebase Console → Authentication →
// Settings → Authorized domains.
const ACTION_CODE_SETTINGS = {
  url: window.location.origin + window.location.pathname.replace('dashboard.html', 'login.html'),
  handleCodeInApp: true
};

/**
 * Step 1: send the sign-in link to the given email.
 */
function sendVaultSignInLink(email) {
  return auth.sendSignInLinkToEmail(email, ACTION_CODE_SETTINGS).then(() => {
    // Save email locally so we can complete sign-in without asking again
    // (needed because the link may be opened on the same device/browser).
    window.localStorage.setItem('vaultEmailForSignIn', email);
  });
}

/**
 * Step 2: call this on page load (login.html). If the current URL is a
 * valid sign-in link, completes the sign-in automatically.
 * Returns a Promise<boolean> — true if a sign-in was completed.
 */
function completeVaultSignInIfPossible() {
  if (!auth.isSignInWithEmailLink(window.location.href)) {
    return Promise.resolve(false);
  }
  let email = window.localStorage.getItem('vaultEmailForSignIn');
  if (!email) {
    // Link opened on a different device/browser — ask once.
    email = window.prompt('Please confirm your email to finish signing in');
  }
  return auth.signInWithEmailLink(email, window.location.href).then((result) => {
    window.localStorage.removeItem('vaultEmailForSignIn');
    // Clean the action-code params out of the URL bar
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  });
}

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
