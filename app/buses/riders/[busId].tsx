import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../../layouts/MainLayout';
import { BusRidersScreen } from '../../../screens/buses/BusRidersScreen';

export default function BusRidersRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('riders');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    
    // Handle navigation to different sections
    switch (route) {
      case 'dashboard':
        router.push('/dashboard/driver');
        break;
      case 'my-buses':
        router.push('/buses/my-buses');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        break;
    }
  };

  return (
    <MainLayout currentRoute={currentRoute} onNavigate={handleNavigate}>
      <BusRidersScreen />
    </MainLayout>
  );
} 