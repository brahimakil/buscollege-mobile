import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { DriverDashboard } from '../../screens/dashboard/DriverDashboard';

export default function DriverDashboardPage() {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    switch (route) {
      case 'dashboard':
        router.push('/dashboard/driver');
        break;
      case 'profile':
        router.push('/profile/driver');
        break;
      case 'my-buses':
        router.push('/buses/my-buses');
        break;
      
      default:
        router.push('/');
    }
  };

  return (
    <MainLayout
      title="Driver Dashboard"
      currentRoute="dashboard"
      onNavigate={handleNavigate}
    >
      <DriverDashboard />
    </MainLayout>
  );
} 