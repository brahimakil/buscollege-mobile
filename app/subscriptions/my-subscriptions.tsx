import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { MySubscriptionsScreen } from '../../screens/subscriptions/MySubscriptionsScreen';

export default function MySubscriptionsRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('my-subscriptions');

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
        router.push('/buses/all-buses');
        break;
      case 'favorites':
        router.push('/buses/favorites');
        break;
      case 'my-subscriptions':
        // Already on this page
        break;
      default:
        console.log('Unknown route:', route);
    }
  };

  return (
    <MainLayout
      title="My Subscriptions"
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <MySubscriptionsScreen />
    </MainLayout>
  );
} 