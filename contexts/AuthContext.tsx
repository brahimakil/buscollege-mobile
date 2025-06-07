import { useRouter } from 'expo-router';
import {
    User,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<UserData, 'uid'>, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful');
      // Redirect after successful login
      router.replace('/');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
      throw error;
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
      
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 