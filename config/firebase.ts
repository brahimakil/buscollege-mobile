// Firebase v9+ configuration for Expo/React Native (Universal)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBaDqPXY0sffnHJvewmy4t7RZCuFJPf5TY",
  authDomain: "bux-75da0.firebaseapp.com",
  projectId: "bux-75da0",
  storageBucket: "bux-75da0.firebasestorage.app",
  messagingSenderId: "718425905284",
  appId: "1:718425905284:web:5ee328332dd5cc1a61cad1",
  measurementId: "G-H2939Z2DZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication (works on all platforms)
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 