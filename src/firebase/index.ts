import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from './config';

import { FirebaseProvider, useFirebase } from './provider';
import { useUser } from './auth/use-user';
import { FirebaseClientProvider } from './client-provider';

function initializeFirebase() {
  const apps = getApps();
  const app = apps.length
    ? apps[0]
    : initializeApp(firebaseConfig);

  return {
    firebaseApp: app,
    firestore: getFirestore(app),
    auth: getAuth(app),
  };
}

const { firebaseApp, firestore, auth } = initializeFirebase();

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
