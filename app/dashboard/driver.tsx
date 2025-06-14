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
    switch (route) {
      case 'dashboard':
        // Already on dashboard, just update state
        break;
      case 'my-buses':
        router.push('/buses/my-buses');
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
      title="Driver Dashboard"
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      <DriverDashboard />
    </MainLayout>
  );
} 