import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { MainLayout } from '../../layouts/MainLayout';
import { FavoritesScreen } from '../../screens/buses/FavoritesScreen';

export default function FavoritesRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('favorites');

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
        // Already on this page
        break;
      case 'my-subscriptions':
        router.push('/subscriptions/my-subscriptions');
        break;
      default:
        console.log('Unknown route:', route);
    }
  };

  return (
    <FavoritesProvider>
      <MainLayout
        title="Favorites"
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
      >
        <FavoritesScreen />
      </MainLayout>
    </FavoritesProvider>
  );
} 