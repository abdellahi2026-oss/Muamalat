import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from './config';

import { FirebaseProvider, useFirebase } from './provider';
import { useUser } from './auth/use-user';
import { FirebaseClientProvider } from './client-provider';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    const apps = getApps();
    if (!apps.length) {
      if (!firebaseConfig.apiKey) {
        console.error('Firebase API key is not defined. Please check your environment variables.');
        // Return dummy objects to avoid crashing the app
        return {
          firebaseApp: {} as FirebaseApp,
          firestore: {} as Firestore,
          auth: {} as Auth,
        };
      }
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    } else {
      firebaseApp = apps[0];
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    }
  }
  
  // Return existing instances if on server or already initialized
  return {
    firebaseApp: firebaseApp,
    firestore: firestore,
    auth: auth,
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
  firebaseApp,
  firestore,
  auth,
  FirebaseProvider,
  FirebaseClientProvider,
  useUser,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
};
