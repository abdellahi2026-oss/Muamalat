import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBKrqohWHpNLcapXi6MiHT-S9UUKPzkWG8",
  authDomain: "studio-1812474465-c8add.firebaseapp.com",
  projectId: "studio-1812474465-c8add",
  storageBucket: "studio-1812474465-c8add.appspot.com",
  messagingSenderId: "623046393664",
  appId: "1:623046393664:web:1ce906e7858e03c50a84a5",
};


import { FirebaseProvider, useFirebase } from './provider';
import { useUser } from './auth/use-user';
import { FirebaseClientProvider } from './client-provider';

// This function initializes Firebase and returns the instances of the services.
// It's designed to be idempotent, meaning it will only initialize the app once.
function initializeFirebase() {
  // CRITICAL: Check if the config is loaded.
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error('FATAL: Firebase config is not defined. Please check your environment setup.');
  }

  const apps = getApps();
  let firebaseApp: FirebaseApp;

  if (!apps.length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = apps[0];
  }

  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  return {
    firebaseApp,
    firestore,
    auth,
  };
}


function useFirebaseApp(): FirebaseApp {
  return useFirebase().firebaseApp;
}

function useFirestore(): Firestore {
  return useFirebase().firestore;
}

function useAuth(): Auth {
  return useFirebase().auth;
}

export {
  initializeFirebase,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
};
