import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SubscriptionService } from '../../services/SubscriptionService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

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

export const FavoritesScreen: React.FC = () => {
  const { favorites, removeFromFavorites, loading } = useFavorites();
  const { colors, isDark } = useTheme();
  const { userData } = useAuth();
  
  // Add subscription states
  const [subscriptionStates, setSubscriptionStates] = useState<Map<string, {
    isSubscribed: boolean;
    canResubscribe: boolean;
    subscriptionType: 'active' | 'ended' | 'none';
  }>>(new Map());

  // Add function to get subscription status
  const getSubscriptionStatus = useCallback(async (busId: string) => {
    if (!userData?.uid) return { isSubscribed: false, canResubscribe: false, subscriptionType: 'none' };
    
    try {
      const subscriptions = await SubscriptionService.getUserSubscriptions(userData.uid);
      const busSubscriptions = subscriptions.filter(sub => sub.busId === busId);
      
      if (busSubscriptions.length === 0) {
        return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
      }

      const activeSubscription = busSubscriptions
        .filter(sub => sub.status === 'active')
        .sort((a, b) => new Date(b.assignedAt || b.startDate).getTime() - new Date(a.assignedAt || a.startDate).getTime())[0];
      
      if (activeSubscription) {
        // Check if user is in bus currentRiders
        const busRef = doc(db, 'buses', busId);
        const busDoc = await getDoc(busRef);
        
        if (busDoc.exists()) {
          const busData = busDoc.data();
          const isInCurrentRiders = busData.currentRiders?.some((rider: any) => {
            if (typeof rider === 'string') {
              return rider === userData.uid;
            } else if (typeof rider === 'object' && rider.id) {
              return rider.id === userData.uid;
            }
            return false;
          }) || false;
          
          if ((activeSubscription.paymentStatus === 'paid' || activeSubscription.paymentStatus === 'pending') && isInCurrentRiders) {
            return { isSubscribed: true, canResubscribe: false, subscriptionType: 'active' };
          } else {
            return { isSubscribed: false, canResubscribe: true, subscriptionType: 'ended' };
          }
        }
      }
      
      return { isSubscribed: false, canResubscribe: true, subscriptionType: 'ended' };
    } catch (error) {
      return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
    }
  }, [userData?.uid]);

  // Load subscription states
  useEffect(() => {
    const loadSubscriptionStates = async () => {
      if (!userData?.uid || favorites.length === 0) return;
      
      const newStates = new Map();
      await Promise.all(
        favorites.map(async (bus) => {
          const status = await getSubscriptionStatus(bus.id);
          newStates.set(bus.id, status);
        })
      );
      setSubscriptionStates(newStates);
    };
    
    loadSubscriptionStates();
  }, [favorites, userData?.uid, getSubscriptionStatus]);

  const handleRemoveFavorite = async (busId: string, busName: string) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${busName}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromFavorites(busId),
        },
      ]
    );
  };

  const getRouteText = (locations: Bus['locations']) => {
    if (!locations || locations.length === 0) return 'No route defined';
    const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
    return `${sortedLocations[0]?.name || 'Unknown'} → ${sortedLocations[sortedLocations.length - 1]?.name || 'Unknown'}`;
  };

  const getAvailabilityColor = (currentRiders: number, capacity: number) => {
    if (!capacity || capacity === 0) return colors.textTertiary;
    const percentage = (currentRiders / capacity) * 100;
    if (percentage >= 90) return colors.error;
    if (percentage >= 70) return colors.warning;
    return colors.success;
  };

  const renderFavoriteBusCard = ({ item: bus }: { item: Bus }) => {
    const subscriptionState = subscriptionStates.get(bus.id) || { 
      isSubscribed: false, 
      canResubscribe: true, 
      subscriptionType: 'none' 
    };

    // Determine button text
    let buttonText = 'Subscribe';
    if (subscriptionState.isSubscribed) {
      buttonText = 'Subscribed';
    } else if (subscriptionState.subscriptionType === 'ended') {
      buttonText = 'Resubscribe';
    }

    const availabilityColor = getAvailabilityColor(bus.currentRiders || 0, bus.capacity || 0);

    return (
      <View style={[
        styles.busCard,
        {
          backgroundColor: colors.card,
          ...getThemeShadow(isDark, 'lg'),
        }
      ]}>
        {/* Header with gradient */}
        <LinearGradient
          colors={[colors.warning, colors.warningDark || colors.warning]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.busInfo}>
              <Text style={[styles.busName, { color: colors.textInverse }]}>
                {bus.busName || 'Unknown Bus'}
              </Text>
              <View style={styles.driverInfo}>
                <Ionicons name="person" size={14} color={colors.textInverse} />
                <Text style={[styles.driverName, { color: colors.textInverse }]}>
                  {bus.driverName || 'Unknown Driver'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFavorite(bus.id, bus.busName || 'Unknown Bus')}
            >
              <Ionicons name="star" size={28} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={[styles.routeSection, { borderBottomColor: colors.border }]}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.routeText, { color: colors.textSecondary }]}>
            {getRouteText(bus.locations)}
          </Text>
        </View>

        <View style={[styles.scheduleSection, { borderBottomColor: colors.border }]}>
          <View style={styles.scheduleItem}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={[styles.scheduleText, { color: colors.textSecondary }]}>
              {bus.schedule?.departureTime || '--:--'} - {bus.schedule?.arrivalTime || '--:--'}
            </Text>
          </View>
          <View style={styles.scheduleItem}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.scheduleText, { color: colors.textSecondary }]}>
              {bus.schedule?.days?.length ? bus.schedule.days.join(', ') : 'No schedule'}
            </Text>
          </View>
        </View>

        <View style={[styles.capacitySection, { borderBottomColor: colors.border }]}>
          <View style={styles.capacityInfo}>
            <Ionicons name="people" size={16} color={availabilityColor} />
            <Text style={[styles.capacityText, { color: availabilityColor }]}>
              {bus.currentRiders || 0}/{bus.capacity || 0} riders
            </Text>
          </View>
          <View style={styles.pricingInfo}>
            <Text style={[styles.priceText, { color: colors.textSecondary }]}>
              Monthly: ${bus.subscriptionTypes?.monthly || 0}
            </Text>
            <Text style={[styles.priceText, { color: colors.textSecondary }]}>
              Per Ride: ${bus.subscriptionTypes?.perRide || 0}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          
        
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your favorite routes...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark || colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={[styles.title, { color: colors.textInverse }]}>
          ⭐ Favorite Routes
        </Text>
        <Text style={[styles.subtitle, { color: colors.textInverse }]}>
          Quick access to your starred bus routes
        </Text>
        
        {favorites.length > 0 && (
          <View style={styles.compactStatsContainer}>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatNumber, { color: colors.textInverse }]}>
                {favorites.length}
              </Text>
              <Text style={[styles.compactStatLabel, { color: colors.textInverse }]}>
                Favorites
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <FlatList
        data={favorites}
        renderItem={renderFavoriteBusCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={80} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No favorite routes yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Go to "All Buses" and tap the star icon to add your favorite routes for quick access
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.xl,
    paddingBottom: AppSpacing.md,
    borderBottomLeftRadius: AppBorderRadius.xl,
    borderBottomRightRadius: AppBorderRadius.xl,
  },
  title: {
    fontSize: AppFontSizes.xxxl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  subtitle: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
    marginBottom: AppSpacing.sm,
  },
  compactStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.xs,
    paddingHorizontal: AppSpacing.sm,
    alignSelf: 'center',
    minWidth: 120,
  },
  compactStatItem: {
    alignItems: 'center',
    paddingHorizontal: AppSpacing.sm,
  },
  compactStatNumber: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  compactStatLabel: {
    fontSize: AppFontSizes.xs,
    opacity: 0.8,
    marginTop: 2,
  },
  listContainer: {
    padding: AppSpacing.md,
  },
  busCard: {
    borderRadius: AppBorderRadius.xl,
    marginBottom: AppSpacing.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: AppSpacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    marginLeft: AppSpacing.xs,
    fontSize: AppFontSizes.sm,
    opacity: 0.9,
  },
  removeButton: {
    padding: AppSpacing.sm,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
  },
  routeText: {
    fontSize: AppFontSizes.md,
    marginLeft: AppSpacing.sm,
  },
  scheduleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.xs,
  },
  capacitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    marginLeft: AppSpacing.xs,
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
  },
  pricingInfo: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: AppFontSizes.sm,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  subscribeButton: {
    flex: 1,
    borderRadius: AppBorderRadius.lg,
    overflow: 'hidden',
  },
  subscribeGradient: {
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppBorderRadius.lg,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
    borderWidth: 1,
  },
  trackButtonText: {
    marginLeft: AppSpacing.xs,
    fontSize: AppFontSizes.md,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: AppSpacing.md,
    fontSize: AppFontSizes.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: AppSpacing.xxl * 2,
  },
  emptyText: {
    fontSize: AppFontSizes.xl,
    fontWeight: '600',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.xs,
  },
  emptySubtext: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
}); 