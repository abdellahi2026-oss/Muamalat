'use client';

import { initializeFirebase, FirebaseProvider } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';

// Temporary function to create the admin user.
// This will be removed after the first run.
const createAdminUser = async (auth: any) => {
  try {
    // Check if we have already run this function.
    if (localStorage.getItem('admin_created')) {
      return;
    }
    // IMPORTANT: This is a temporary solution to bootstrap the admin user.
    // In a real-world application, you would use a secure backend function (e.g., a Cloud Function)
    // to create initial users or manage roles.
    await createUserWithEmailAndPassword(auth, 'admin@muamalat.app', 'Aa12121212@');
    console.log('Admin user created successfully.');
    // Mark that the admin user has been created so this doesn't run again.
    localStorage.setItem('admin_created', 'true');
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists.');
      // Mark as created even if it failed because it already exists.
      localStorage.setItem('admin_created', 'true');
    } else {
      console.error('Error creating admin user:', error);
    }
  }
};


export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [firebaseInstances, setFirebaseInstances] = useState<{
    firebaseApp: any;
    firestore: any;
    auth: any;
  } | null>(null);

  useEffect(() => {
    const { firebaseApp, firestore, auth } = initializeFirebase();
    setFirebaseInstances({ firebaseApp, firestore, auth });
    
    if (auth) {
        // Temporarily create the admin user
        createAdminUser(auth);
    }

  }, []);

  if (!firebaseInstances) {
    return null; // Or a loading spinner
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseInstances.firebaseApp}
      firestore={firebaseInstances.firestore}
      auth={firebaseInstances.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
