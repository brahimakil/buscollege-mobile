import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FavoritesProvider } from '../../contexts/FavoritesContext';
import { MainLayout } from '../../layouts/MainLayout';
import { AllBusesScreen } from '../../screens/buses/AllBusesScreen';
import { FavoritesScreen } from '../../screens/buses/FavoritesScreen';
import { RiderDashboard } from '../../screens/dashboard/RiderDashboard';
import { MySubscriptionsScreen } from '../../screens/subscriptions/MySubscriptionsScreen';

export default function RiderDashboardRoute() {
  const router = useRouter();
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
  };

  const renderContent = () => {
    switch (currentRoute) {
      case 'all-buses':
        return <AllBusesScreen />;
      case 'favorites':
        return <FavoritesScreen />;
      case 'my-subscriptions':
        return <MySubscriptionsScreen />;
      case 'dashboard':
      default:
        return <RiderDashboard />;
    }
  };

  const getTitle = () => {
    switch (currentRoute) {
      case 'all-buses':
        return 'All Buses';
      case 'favorites':
        return 'Favorites';
      case 'my-subscriptions':
        return 'My Subscriptions';
      case 'dashboard':
      default:
        return 'Dashboard';
    }
  };

  return (
    <FavoritesProvider>
      <MainLayout
        title={getTitle()}
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
      >
        {renderContent()}
      </MainLayout>
    </FavoritesProvider>
  );
} 