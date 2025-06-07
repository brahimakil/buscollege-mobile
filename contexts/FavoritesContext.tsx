import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Bus {
  id: string;
  busName: string;
  driverName: string;
  route: string;
  locations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    order: number;
  }>;
  capacity: number;
  currentRiders: number;
  subscriptionTypes: {
    monthly: number;
    perRide: number;
  };
  schedule: {
    departureTime: string;
    arrivalTime: string;
    days: string[];
  };
}

interface FavoritesContextType {
  favorites: Bus[];
  addToFavorites: (bus: Bus) => Promise<void>;
  removeFromFavorites: (busId: string) => Promise<void>;
  isFavorite: (busId: string) => boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  const STORAGE_KEY = `favorites_${userData?.uid || 'guest'}`;

  useEffect(() => {
    loadFavorites();
  }, [userData]);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: Bus[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const addToFavorites = async (bus: Bus) => {
    const newFavorites = [...favorites, bus];
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  };

  const removeFromFavorites = async (busId: string) => {
    const newFavorites = favorites.filter(bus => bus.id !== busId);
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  };

  const isFavorite = (busId: string) => {
    return favorites.some(bus => bus.id === busId);
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      loading
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 