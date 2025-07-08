import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { MyBusesScreen } from '../../screens/buses/MyBusesScreen';

export default function MyBusesRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('my-buses');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    
    // Handle navigation to different sections
    switch (route) {
      case 'dashboard':
        router.push('/dashboard/driver');
        break;
      case 'profile':
        router.push('/profile/driver');
        break;
      case 'my-buses':
        // Already on this page
        break;
      case 'riders':
        // Navigate to riders page (to be implemented)
        console.log('Riders page not implemented yet');
        break;
      default:
        console.log('Unknown route:', route);
    }
  };

  return (
    <MainLayout
      title="My Buses"
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <MyBusesScreen />
    </MainLayout>
  );
} 