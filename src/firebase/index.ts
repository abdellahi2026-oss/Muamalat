import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from './config';

import { FirebaseProvider, useFirebase } from './provider';
import { useUser } from './auth/use-user';
import { FirebaseClientProvider } from './client-provider';

// This function initializes Firebase and returns the instances of the services.
// It's designed to be idempotent, meaning it will only initialize the app once.
function initializeFirebase() {
  const apps = getApps();
  let firebaseApp: FirebaseApp;

  if (!apps.length) {
    if (!firebaseConfig.apiKey) {
      console.error('Firebase API key is not defined. Please check your environment variables.');
      // Return dummy objects in case of no config to prevent app crash
      return {
        firebaseApp: {} as FirebaseApp,
        firestore: {} as Firestore,
        auth: {} as Auth,
      };
    }
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
