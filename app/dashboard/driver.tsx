import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { DriverDashboard } from '../../screens/dashboard/DriverDashboard';

export default function DriverDashboardRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    // Handle navigation to different sections
    // For now, we'll just update the current route state
  };

  return (
    <MainLayout
      title="Driver Dashboard"
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <DriverDashboard />
    </MainLayout>
  );
} 