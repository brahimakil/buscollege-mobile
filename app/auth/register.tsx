import { useRouter } from 'expo-router';
import React from 'react';
import { RegisterScreen } from '../../screens/auth/RegisterScreen';

export default function RegisterRoute() {
  const router = useRouter();

  return (
    <RegisterScreen 
      onNavigateToLogin={() => router.push('/auth/login')} 
    />
  );
} 