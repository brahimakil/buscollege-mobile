import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AppColors } from '../themes/colors';

export default function IndexScreen() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Index screen - Auth state:', { 
      loading, 
      hasUser: !!user, 
      hasUserData: !!userData, 
      userRole: userData?.role 
    });

    if (!loading) {
      if (user && userData) {
        if (userData.role === 'driver') {
          console.log('Redirecting to driver dashboard');
          router.replace('/dashboard/driver');
        } else if (userData.role === 'rider') {
          console.log('Redirecting to rider dashboard');
          router.replace('/dashboard/rider');
        } else {
          console.log('Unknown role:', userData.role);
          router.replace('/auth/login');
        }
      } else {
        console.log('No user, redirecting to login');
        router.replace('/auth/login');
      }
    }
  }, [user, userData, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AppColors.light.primary} />
      <Text style={styles.loadingText}>
        {loading ? 'Loading...' : 'Redirecting...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.light.background,
  },
  loadingText: {
    marginTop: 16,
    color: AppColors.light.textSecondary,
    fontSize: 16,
  },
}); 