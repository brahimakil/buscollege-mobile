import { useRouter } from 'expo-router';
import React from 'react';
import { LoginScreen } from '../../screens/auth/LoginScreen';

export default function LoginRoute() {
  const router = useRouter();

  return (
    <LoginScreen 
      onNavigateToRegister={() => router.push('/auth/register')} 
    />
  );
} 