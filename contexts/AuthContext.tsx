import { useRouter } from 'expo-router';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'driver' | 'rider' | 'admin';
  phoneNumber?: string;
  address?: string;
  busAssignments?: any[];
  licenseNumber?: string;
  emergencyContact?: string;
  emailVerified?: boolean; // Add email verification status
  accountStatus?: 'pending_verification' | 'active' | 'suspended'; // Add account status
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<UserData, 'uid'>, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  resendVerificationEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.email : 'No user');
      
      if (user) {
        setUser(user);
        // Fetch user data from Firestore
        try {
          console.log('Fetching user data from Firestore...');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            console.log('User data fetched:', userData);
            setUserData(userData);
          } else {
            console.log('No user document found in Firestore');
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        console.log('No authenticated user');
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Attempting login for:', email);
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user data first to check their role
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        console.log('User data loaded, role:', userData.role);
        
        // FIXED: Only check email verification for riders, not drivers
        if (userData.role === 'rider' && !userCredential.user.emailVerified) {
          console.log('Rider email not verified, signing out user');
          await signOut(auth);
          throw new Error('Please verify your email address before logging in. Check your email inbox (including spam folder) for the verification link.');
        }
        
        // Allow drivers to login without email verification
        if (userData.role === 'driver') {
          console.log('Driver login successful - no email verification required');
        } else if (userData.role === 'rider') {
          console.log('Rider login successful - email verified');
        }
        
        // Update user document to reflect email verification status (only if actually verified)
        if (userCredential.user.emailVerified && !userData.emailVerified) {
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            emailVerified: true,
            accountStatus: 'active',
            updatedAt: new Date().toISOString(),
          });
        }
        
        // Direct redirect based on role
        if (userData.role === 'driver') {
          router.replace('/dashboard/driver');
        } else if (userData.role === 'rider') {
          router.replace('/dashboard/rider');
        } else {
          router.replace('/');
        }
      } else {
        console.log('No user document found, redirecting to index');
        await signOut(auth);
        throw new Error('User profile not found. Please contact support.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Enhanced error handling with specific Firebase error codes
      switch (error.code) {
        case 'auth/invalid-credential':
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        case 'auth/user-not-found':
          throw new Error('No account found with this email address. Please check your email or sign up.');
        case 'auth/wrong-password':
          throw new Error('Incorrect password. Please try again.');
        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address.');
        case 'auth/user-disabled':
          throw new Error('This account has been disabled. Please contact support.');
        case 'auth/too-many-requests':
          throw new Error('Too many failed login attempts. Please try again later.');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your internet connection and try again.');
        case 'auth/operation-not-allowed':
          throw new Error('Email/password sign-in is not enabled. Please contact support.');
        case 'auth/weak-password':
          throw new Error('Password is too weak. Please choose a stronger password.');
        default:
          // Check if it's our custom email verification error
          if (error.message.includes('verify your email')) {
            throw error; // Re-throw our custom error
          }
          throw new Error('Login failed. Please try again or contact support if the problem persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: Omit<UserData, 'uid'>, password: string) => {
    try {
      console.log('Starting registration for:', userData.email);
      setLoading(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      const user = userCredential.user;

      console.log('User created in Auth, creating Firestore document...');

      // Create user document in Firestore
      const userDocData = {
        ...userData,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), userDocData);
      console.log('User document created successfully');

      // Set the user data immediately to avoid waiting for the auth state change
      setUserData(userDocData as UserData);
      
      // Redirect after successful registration
      router.replace('/');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Enhanced error handling for registration
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('An account with this email already exists. Please sign in instead.');
        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address.');
        case 'auth/weak-password':
          throw new Error('Password is too weak. Please choose a stronger password (at least 6 characters).');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your internet connection and try again.');
        case 'auth/operation-not-allowed':
          throw new Error('Account creation is not enabled. Please contact support.');
        default:
          throw new Error('Registration failed. Please try again or contact support if the problem persists.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = async (data: Partial<UserData>) => {
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      setUserData(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string, password: string) => {
    try {
      console.log('Resending verification email for:', email);
      setLoading(true);
      
      // Sign in to get the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if already verified
      if (user.emailVerified) {
        throw new Error('Your email is already verified. You can now log in normally.');
      }
      
      // Send verification email
      await sendEmailVerification(user);
      
      // Sign out the user
      await signOut(auth);
      
      console.log('Verification email sent successfully');
      
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      
      // Handle specific error cases
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        case 'auth/too-many-requests':
          throw new Error('Too many attempts. Please try again later.');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your internet connection and try again.');
        default:
          // Check if it's our custom "already verified" error
          if (error.message.includes('already verified')) {
            throw error; // Re-throw our custom error
          }
          throw new Error('Failed to resend verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserData,
    resendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};