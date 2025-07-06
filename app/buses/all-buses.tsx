import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { AllBusesScreen } from '../../screens/buses/AllBusesScreen';

export default function AllBusesRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('all-buses');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
    
    // Handle navigation to different sections
    switch (route) {
      case 'dashboard':
        router.push('/dashboard/rider');
        break;
      case 'profile':
        router.push('/profile/rider');
        break;
      case 'all-buses':
        // Already on this page
        break;
      case 'favorites':
        router.push('/buses/favorites');
        break;
      case 'my-subscriptions':
        router.push('/subscriptions/my-subscriptions');
        break;
      default:
        console.log('Unknown route:', route);
    }
  };

  return (
    <MainLayout
      title="All Buses"
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <AllBusesScreen />
    </MainLayout>
  );
} 