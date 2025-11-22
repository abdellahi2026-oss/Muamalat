'use client';

import { initializeFirebase, FirebaseProvider } from '@/firebase';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

// This component ensures Firebase is initialized only on the client-side.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [instances, setInstances] = useState<{
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);

  useEffect(() => {
    // initializeFirebase() handles the check for existing apps and config.
    const { firebaseApp, firestore, auth } = initializeFirebase();
    setInstances({ firebaseApp, firestore, auth });
  }, []);

  // While Firebase is initializing, you might want to show a loader.
  // Returning null or a loading component prevents children from trying to use Firebase too early.
  if (!instances) {
    return null; 
  }

  return (
    <FirebaseProvider
      firebaseApp={instances.firebaseApp}
      firestore={instances.firestore}
      auth={instances.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
