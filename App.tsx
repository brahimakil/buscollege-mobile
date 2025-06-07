import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { MainLayout } from './layouts/MainLayout';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterScreen } from './screens/auth/RegisterScreen';
import { AllBusesScreen } from './screens/buses/AllBusesScreen';
import { FavoritesScreen } from './screens/buses/FavoritesScreen';
import { DriverDashboard } from './screens/dashboard/DriverDashboard';
import { RiderDashboard } from './screens/dashboard/RiderDashboard';
import { AppColors } from './themes/colors';

type AuthScreen = 'login' | 'register';
type AppRoute = 'dashboard' | 'my-buses' | 'all-buses' | 'favorites' | 'my-subscriptions' | 'riders';

const AuthScreens: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  return (
    <View style={styles.container}>
      {currentScreen === 'login' ? (
        <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
      ) : (
        <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
      )}
    </View>
  );
};

const MainApp: React.FC = () => {
  const { userData } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');

  // Add effect to log state changes
  useEffect(() => {
    console.log('🔄 Route state changed to:', currentRoute);
  }, [currentRoute]);

  const getPageTitle = () => {
    switch (currentRoute) {
      case 'dashboard':
        return 'Dashboard';
      case 'my-buses':
        return 'My Buses';
      case 'all-buses':
        return 'All Buses';
      case 'favorites':
        return 'Favorites';
      case 'my-subscriptions':
        return 'My Subscriptions';
      case 'riders':
        return 'Riders';
      default:
        return 'Dashboard';
    }
  };

  const handleNavigate = (route: string) => {
    console.log('🚀 Navigation triggered:', route);
    console.log('🚀 Current route before:', currentRoute);
    
    // Force state update with callback to ensure it happens
    setCurrentRoute((prevRoute) => {
      console.log('🚀 State update callback - prev:', prevRoute, 'new:', route);
      return route as AppRoute;
    });
  };

  const renderContent = () => {
    console.log('🚀 Rendering content for route:', currentRoute);
    console.log('🚀 User role:', userData?.role);
    
    switch (currentRoute) {
      case 'dashboard':
        console.log('🚀 Rendering Dashboard');
        return userData?.role === 'driver' ? <DriverDashboard /> : <RiderDashboard />;
      case 'my-buses':
        console.log('🚀 Rendering My Buses');
        return <View style={styles.placeholder}><Text>My Buses - Coming Soon</Text></View>;
      case 'all-buses':
        console.log('🚀 Rendering All Buses');
        return <AllBusesScreen />;
      case 'favorites':
        console.log('🚀 Rendering Favorites');
        return <FavoritesScreen />;
      case 'my-subscriptions':
        console.log('🚀 Rendering My Subscriptions');
        return (
          <View style={styles.placeholder}>
            <Text style={styles.debugText}>MY SUBSCRIPTIONS SCREEN</Text>
            <Text style={styles.debugText}>Route: {currentRoute}</Text>
            <Text style={styles.debugText}>This should be visible!</Text>
          </View>
        );
      case 'riders':
        console.log('🚀 Rendering Riders');
        return <View style={styles.placeholder}><Text>Riders - Coming Soon</Text></View>;
      default:
        console.log('🚀 Rendering Default (Dashboard)');
        return userData?.role === 'driver' ? <DriverDashboard /> : <RiderDashboard />;
    }
  };

  return (
    <MainLayout
      title={getPageTitle()}
      currentRoute={currentRoute}
      onNavigate={handleNavigate}
    >
      {renderContent()}
    </MainLayout>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        {/* Add loading spinner here if needed */}
      </View>
    );
  }

  return user ? <MainApp /> : <AuthScreens />;
};

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <AppContent />
      </FavoritesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.light.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ff0000', // Red background to make it obvious
  },
  debugText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
}); 