import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SubscriptionModal } from '../../components/modals/SubscriptionModal';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SubscriptionService } from '../../services/SubscriptionService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface BusLocation {
  address: {
    city: string;
    country: string;
    governorate: string;
  };
  arrivalTimeFrom: string;
  arrivalTimeTo: string;
  latitude: number;
  longitude: number;
  name: string;
  order: number;
  placeId: string;
}

interface WorkingDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday?: boolean;
  sunday?: boolean;
}

interface Bus {
  id: string;
  busLabel: string;
  busName: string;
  createdAt: any;
  currentRiders: string[];
  driverId: string;
  driverName: string;
  locations: BusLocation[];
  maxCapacity: number;
  operatingTimeFrom: string;
  operatingTimeTo: string;
  pricePerMonth: number;
  pricePerRide: number;
  updatedAt: any;
  workingDays: WorkingDays;
}

// ✅ UPDATED: Enhanced subscription state interface to include payment status
interface SubscriptionState {
  isSubscribed: boolean;
  canResubscribe: boolean;
  subscriptionType: 'active' | 'ended' | 'none';
  paymentStatus?: 'paid' | 'pending' | 'unpaid'; // ✅ NEW: Track payment status
  hasUnpaidSubscription?: boolean; // ✅ NEW: Flag for unpaid subs that need special handling
}

// Updated BusCardHeader with theme support
const BusCardHeader = React.memo(({ bus, isStarred, onFavoriteToggle }: {
  bus: Bus;
  isStarred: boolean;
  onFavoriteToggle: () => void;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.cardHeader, { backgroundColor: colors.primary }]}>
      <View style={styles.headerContent}>
        <View style={styles.busInfo}>
          <Text style={[styles.busName, { color: colors.textInverse }]}>{bus.busName || 'Unknown Bus'}</Text>
          <Text style={[styles.busLabel, { color: colors.textInverse }]}>{bus.busLabel || bus.busName || 'Unknown Bus'}</Text>
          <View style={styles.driverInfo}>
            <Ionicons name="person" size={14} color={colors.textInverse} />
            <Text style={[styles.driverName, { color: colors.textInverse }]}>{bus.driverName || 'Unknown Driver'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={onFavoriteToggle}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isStarred ? 'star' : 'star-outline'}
            size={28}
            color={isStarred ? colors.warning : colors.textInverse}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Updated LocationStop with theme support
const LocationStop = React.memo(({ location, index, isFirst, isLast, showLine }: {
  location: BusLocation;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  showLine: boolean;
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.stopItem}>
      <View style={styles.stopIndicator}>
        <View style={[
          styles.stopDot,
          { backgroundColor: colors.primary },
          isFirst && [styles.firstStop, { backgroundColor: colors.success }],
          isLast && [styles.lastStop, { backgroundColor: colors.error }]
        ]} />
        {showLine && <View style={[styles.stopLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={styles.stopInfo}>
        <Text style={[styles.stopName, { color: colors.text }]}>{location.name || 'Unknown Location'}</Text>
        <Text style={[styles.stopTime, { color: colors.textSecondary }]}>
          {location.arrivalTimeFrom || '--:--'} - {location.arrivalTimeTo || '--:--'}
        </Text>
      
      </View>
    </View>
  );
});

// Updated WorkingDayChip with theme support
const WorkingDayChip: React.FC<{ day: string; isActive: boolean }> = ({ day, isActive }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[
      styles.dayChip,
      {
        backgroundColor: isActive ? colors.primary + '20' : colors.backgroundSecondary,
        borderColor: isActive ? colors.primary : colors.border
      }
    ]}>
      <Text style={[
        styles.dayText,
        { color: isActive ? colors.primary : colors.textSecondary }
      ]}>
        {day.charAt(0).toUpperCase() + day.slice(1).substring(0, 3)}
      </Text>
    </View>
  );
};

export const AllBusesScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { userData } = useAuth();
  
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionModal, setSubscriptionModal] = useState<{
    visible: boolean;
    bus: Bus | null;
  }>({ visible: false, bus: null });
  
  // ✅ UPDATED: Enhanced subscription states
  const [subscriptionStates, setSubscriptionStates] = useState<Map<string, SubscriptionState>>(new Map());
  
  // ✅ FIXED: Enhanced function to handle different payment statuses correctly
  const getSubscriptionStatus = useCallback(async (busId: string): Promise<SubscriptionState> => {
    if (!userData?.uid) return { 
      isSubscribed: false, 
      canResubscribe: false, 
      subscriptionType: 'none' 
    };
    
    try {
      console.log(`🔍 Checking subscription status for bus ${busId} and user ${userData.uid}`);
      
      // ✅ NEW: Get bus data to check currentRiders (single source of truth)
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        console.log(`❌ Bus ${busId} not found`);
        return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
      }
      
      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      // Find this user in currentRiders array
      const currentRider = currentRiders.find((rider: any) => {
        if (typeof rider === 'string') {
          return rider === userData.uid;
        } else if (typeof rider === 'object' && rider.id) {
          return rider.id === userData.uid;
        }
        return false;
      });
      
      if (!currentRider) {
        console.log(`❌ User not found in currentRiders for bus ${busId}`);
        return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
      }
      
      // ✅ FIXED LOGIC: Handle different payment statuses
      const paymentStatus = currentRider.paymentStatus;
      const riderStatus = currentRider.status;
      
      console.log(`🎯 Found rider in bus ${busId}: status=${riderStatus}, paymentStatus=${paymentStatus}`);
      
      if (riderStatus === 'active') {
        if (paymentStatus === 'unpaid') {
          // ✅ UNPAID: Show resubscribe button
          return {
            isSubscribed: false,
            canResubscribe: true,
            subscriptionType: 'ended',
            paymentStatus: 'unpaid',
            hasUnpaidSubscription: true
          };
        } else if (paymentStatus === 'paid' || paymentStatus === 'pending') {
          // ✅ PAID/PENDING: Show "Already subscribed"
          return {
            isSubscribed: true,
            canResubscribe: false,
            subscriptionType: 'active',
            paymentStatus: paymentStatus
          };
        }
      }
      
      // Default: Not subscribed
      return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
      
    } catch (error) {
      console.error('Error checking subscription:', error);
      return { isSubscribed: false, canResubscribe: true, subscriptionType: 'none' };
    }
  }, [userData?.uid]);

  // Load subscription states for all buses
  const loadSubscriptionStates = useCallback(async () => {
    if (!userData?.uid || buses.length === 0) return;
    
    const newStates = new Map();
    
    // Check subscription status for each bus
    await Promise.all(
      buses.map(async (bus) => {
        const status = await getSubscriptionStatus(bus.id);
        newStates.set(bus.id, status);
      })
    );
    
    setSubscriptionStates(newStates);
  }, [buses, getSubscriptionStatus, userData?.uid]);

  // Load subscription states when buses change
  useEffect(() => {
    loadSubscriptionStates();
  }, [loadSubscriptionStates]);

  // Enhanced fetchBuses with better data fetching
  const fetchBuses = useCallback(async () => {
    try {
      console.log('🔄 Fetching buses data...');
      
      const busesSnapshot = await getDocs(collection(db, 'buses'));
      const busesData = busesSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`Bus ${doc.id} has ${data.currentRiders?.length || 0} riders`);
        return {
          id: doc.id,
          ...data
        };
      }) as Bus[];
      
      setBuses(busesData);
      console.log(`✅ Loaded ${busesData.length} buses`);
    } catch (error) {
      console.error('Error fetching buses:', error);
      Alert.alert('Error', 'Failed to load buses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBuses().finally(() => {
      setRefreshing(false);
    });
  }, [fetchBuses]);

  const handleFavoriteToggle = useCallback(async (bus: Bus) => {
    try {
      console.log(`⭐ Toggling favorite for bus ${bus.id}`);
      
      const favoritesBus = {
        id: bus.id,
        busName: bus.busName || 'Unknown Bus',
        driverName: bus.driverName || 'Unknown Driver',
        route: getRouteText(bus.locations),
        locations: (bus.locations || []).map(loc => ({
          name: loc.name || 'Unknown Location',
          latitude: loc.latitude || 0,
          longitude: loc.longitude || 0,
          order: loc.order || 0
        })),
        capacity: bus.maxCapacity || 0,
        currentRiders: bus.currentRiders?.length || 0,
        subscriptionTypes: {
          monthly: bus.pricePerMonth || 0,
          perRide: bus.pricePerRide || 0
        },
        schedule: {
          departureTime: bus.operatingTimeFrom || '--:--',
          arrivalTime: bus.operatingTimeTo || '--:--',
          days: getWorkingDaysArray(bus.workingDays || {})
        }
      };

      if (isFavorite(bus.id)) {
        await removeFromFavorites(bus.id);
        console.log(`⭐ Removed bus ${bus.id} from favorites`);
      } else {
        await addToFavorites(favoritesBus);
        console.log(`⭐ Added bus ${bus.id} to favorites`);
      }

      // ✅ FORCE REFRESH: Refresh both buses and subscription states
      console.log('🔄 Favorite toggled, force refreshing all data...');
      
      // First refresh buses to get latest data
      await fetchBuses();
      
      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then refresh subscription states with fresh data
      await loadSubscriptionStates();

      // 🔄 ADDED: Update subscription state for this specific bus
      const newStatus = await getSubscriptionStatus(bus.id);
      setSubscriptionStates(prev => {
        const newMap = new Map(prev);
        newMap.set(bus.id, newStatus);
        return newMap;
      });
      
      console.log('✅ Data refresh completed after favorite toggle');
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  }, [addToFavorites, removeFromFavorites, isFavorite, loadSubscriptionStates, fetchBuses, getSubscriptionStatus]);

  const getRouteText = useCallback((locations: BusLocation[]) => {
    if (!locations || locations.length === 0) return 'No route defined';
    const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
    return `${sortedLocations[0]?.name || 'Unknown'} → ${sortedLocations[sortedLocations.length - 1]?.name || 'Unknown'}`;
  }, []);

  const getWorkingDaysArray = useCallback((workingDays: WorkingDays | undefined): string[] => {
    if (!workingDays) return [];
    
    const days: string[] = [];
    if (workingDays.monday) days.push('Mon');
    if (workingDays.tuesday) days.push('Tue');
    if (workingDays.wednesday) days.push('Wed');
    if (workingDays.thursday) days.push('Thu');
    if (workingDays.friday) days.push('Fri');
    if (workingDays.saturday) days.push('Sat');
    if (workingDays.sunday) days.push('Sun');
    return days;
  }, []);

  const getAvailabilityColor = useCallback((currentRiders: number, capacity: number) => {
    const percentage = (currentRiders / capacity) * 100;
    if (percentage >= 90) return AppColors.light.error;
    if (percentage >= 70) return AppColors.light.warning;
    return AppColors.light.success;
  }, []);

  const getAvailabilityStatus = useCallback((currentRiders: number, capacity: number) => {
    const percentage = (currentRiders / capacity) * 100;
    if (percentage >= 90) return 'Almost Full';
    if (percentage >= 70) return 'Filling Up';
    if (percentage >= 50) return 'Half Full';
    return 'Available';
  }, []);

  const renderLocationStops = useCallback((locations: BusLocation[]) => {
    const sortedLocations = [...locations].sort((a, b) => a.order - b.order);
    return sortedLocations.slice(0, 3).map((location, index) => {
      // Use direct location properties instead of address object
      const city = location.name || 'Unknown City';
      const area = location.name || 'Unknown Area';
      
      return (
        <LocationStop
          key={location.placeId || `stop-${index}`}
          location={{
            ...location,
            city,
            area
          }}
          index={index}
          isFirst={index === 0}
          isLast={index === sortedLocations.length - 1}
          showLine={index < Math.min(sortedLocations.length - 1, 2)}
        />
      );
    });
  }, []);

  const handleSubscribePress = useCallback((bus: Bus) => {

    if (userData.role !== 'rider') {
      Alert.alert('Access Denied', 'Only riders can subscribe to bus routes.');
      return;
    }

    setSubscriptionModal({ visible: true, bus });
  }, [userData]);

  // Enhanced handleSubscribe with better state refresh
  const handleSubscribe = useCallback(async (
    subscriptionType: 'monthly' | 'per_ride',
    locationId?: string
  ) => {
    if (!userData?.uid || !subscriptionModal.bus) return;

    try {
      console.log(`🚌 Starting subscription to bus ${subscriptionModal.bus.id}`);
      
      const subscriptionState = subscriptionStates.get(subscriptionModal.bus.id);
      
      // Use regular subscribe method for all cases (it handles duplicates properly)
      await SubscriptionService.subscribeToBus(
        userData.uid,
        subscriptionModal.bus.id,
        subscriptionType,
        locationId || null
      );

      console.log('✅ Subscription completed, refreshing data...');

      // Close modal first
      setSubscriptionModal({ visible: false, bus: null });

      // Refresh buses data first
      await fetchBuses();
      
      // Wait a moment for the database to be consistent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force refresh subscription states after successful subscription
      console.log('🔄 Refreshing subscription states...');
      await loadSubscriptionStates();
      
      const actionText = subscriptionState?.subscriptionType === 'ended' ? 'resubscribed to' : 'subscribed to';
      Alert.alert(
        'Success!',
        `You have successfully ${actionText} ${subscriptionModal.bus.busName} with ${subscriptionType} plan.`
      );
    } catch (error: any) {
      console.error('❌ Subscription failed:', error);
      Alert.alert('Subscription Failed', error.message || 'Failed to subscribe to bus route');
    }
  }, [userData?.uid, subscriptionModal.bus, subscriptionStates, fetchBuses, loadSubscriptionStates]);

  // ✅ NEW: Handle resubscribe for unpaid subscriptions
  const handleResubscribeUnpaid = useCallback(async (bus: Bus) => {
    if (!userData?.uid) return;

    Alert.alert(
      'Resubscribe to Bus',
      `⚠️ Warning: You have an unpaid subscription to ${bus.busName}.\n\nResubscribing will completely remove your current subscription and create a new one with "pending" payment status.\n\nDo you want to continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Resubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🔄 Resubscribing user ${userData.uid} to bus ${bus.id} - removing unpaid subscription`);
              
              // ✅ STEP 1: Completely remove old currentRider entry
              const busRef = doc(db, 'buses', bus.id);
              const busDoc = await getDoc(busRef);
              
              if (busDoc.exists()) {
                const busData = busDoc.data();
                const currentRiders = busData.currentRiders || [];
                
                // Remove this user from currentRiders
                const filteredRiders = currentRiders.filter((rider: any) => {
                  if (typeof rider === 'string') {
                    return rider !== userData.uid;
                  } else if (typeof rider === 'object' && rider.id) {
                    return rider.id !== userData.uid;
                  }
                  return true;
                });
                
                // Update bus with filtered riders
                await updateDoc(busRef, {
                  currentRiders: filteredRiders,
                  updatedAt: new Date().toISOString()
                });
                
                console.log(`✅ Removed old unpaid subscription from bus ${bus.id}`);
                
                // ✅ STEP 2: Wait a moment for database consistency
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // ✅ STEP 3: Show subscription modal for new subscription
                setSubscriptionModal({ visible: true, bus });
                
                console.log(`✅ Opening subscription modal for fresh subscription`);
              }
              
            } catch (error) {
              console.error('Error resubscribing:', error);
              Alert.alert('Error', 'Failed to resubscribe. Please try again.');
            }
          }
        }
      ]
    );
  }, [userData?.uid]);

  // Enhanced handleUnsubscribe with better state refresh
  const handleUnsubscribe = useCallback(async (bus: Bus) => {
    if (!userData?.uid) return;

    Alert.alert(
      'Unsubscribe',
      `Are you sure you want to unsubscribe from ${bus.busName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              await SubscriptionService.unsubscribeFromBus(userData.uid, bus.id);
              
              // Immediately update subscription state after unsubscribe
              const newStatus = await getSubscriptionStatus(bus.id);
              setSubscriptionStates(prev => {
                const newMap = new Map(prev);
                newMap.set(bus.id, newStatus);
                return newMap;
              });
              
              // Refresh buses data
              await fetchBuses();
              
              Alert.alert('Success', 'You have been unsubscribed from this bus route.');
            } catch (error) {
              Alert.alert('Error', 'Failed to unsubscribe. Please try again.');
            }
          }
        }
      ]
    );
  }, [userData?.uid, fetchBuses, getSubscriptionStatus]);

  // ✅ UPDATED: Enhanced renderBusCard with new payment status logic
  const renderBusCard = useCallback((bus: Bus) => {
    const subscriptionState = subscriptionStates.get(bus.id) || { 
      isSubscribed: false, 
      canResubscribe: true, 
      subscriptionType: 'none' 
    };
    
    const handleFavoriteToggleLocal = () => {
      handleFavoriteToggle(bus);
    };

    const handleSubscribe = () => {
      if (userData?.role !== 'rider') {
        Alert.alert('Access Denied', 'Only riders can subscribe to bus routes.');
        return;
      }

      // ✅ FIXED: Handle different subscription states
      if (subscriptionState.isSubscribed) {
        // ✅ PAID/PENDING: Show unsubscribe option
        Alert.alert(
          'Already Subscribed',
          `You are currently subscribed to ${bus.busName}. Would you like to unsubscribe?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Unsubscribe',
              style: 'destructive',
              onPress: () => handleUnsubscribe(bus)
            }
          ]
        );
      } else if (subscriptionState.hasUnpaidSubscription) {
        // ✅ UNPAID: Show resubscribe with warning
        handleResubscribeUnpaid(bus);
      } else if (subscriptionState.canResubscribe) {
        // ✅ NEW SUBSCRIPTION: Normal subscription flow
        setSubscriptionModal({ visible: true, bus });
      } else {
        Alert.alert('Cannot Subscribe', 'Unable to subscribe to this bus route at the moment.');
      }
    };

    // ✅ UPDATED: Enhanced button configuration with payment status
    const getButtonConfig = () => {
      if (subscriptionState.isSubscribed) {
        if (subscriptionState.paymentStatus === 'paid') {
          return {
            text: 'Subscribed (Paid)',
            icon: 'checkmark-circle' as const,
            backgroundColor: colors.success,
            borderColor: colors.success,
          };
        } else if (subscriptionState.paymentStatus === 'pending') {
          return {
            text: 'Subscribed (Pending)',
            icon: 'time' as const,
            backgroundColor: colors.warning,
            borderColor: colors.warning,
          };
        } else {
          return {
            text: 'Subscribed',
            icon: 'checkmark-circle' as const,
            backgroundColor: colors.success,
            borderColor: colors.success,
          };
        }
      } else if (subscriptionState.hasUnpaidSubscription) {
        return {
          text: 'Resubscribe (Unpaid)',
          icon: 'refresh-circle' as const,
          backgroundColor: colors.error,
          borderColor: colors.error,
        };
      } else if (subscriptionState.subscriptionType === 'ended') {
        return {
          text: 'Resubscribe',
          icon: 'refresh-circle' as const,
          backgroundColor: colors.warning,
          borderColor: colors.warning,
        };
      } else {
        return {
          text: 'Subscribe',
          icon: 'add-circle' as const,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      }
    };

    const buttonConfig = getButtonConfig();

    return (
      <View style={[
        styles.busCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...getThemeShadow(isDark, 'md'),
        }
      ]}>
        <BusCardHeader
          bus={bus}
          isStarred={isFavorite(bus.id)}
          onFavoriteToggle={handleFavoriteToggleLocal}
        />

        {/* Capacity and Pricing */}
        <View style={styles.cardContent}>
          <View style={styles.capacitySection}>
            <View style={styles.capacityInfo}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.capacityText, { color: colors.text }]}>
                {bus.currentRiders?.length || 0}/{bus.maxCapacity || 0} riders
              </Text>
            </View>
            <View style={styles.pricingInfo}>
              <Text style={[styles.priceText, { color: colors.success }]}>
                ${bus.pricePerMonth || 0}/month
              </Text>
              <Text style={[styles.priceSubtext, { color: colors.textSecondary }]}>
                ${bus.pricePerRide || 0}/ride
              </Text>
            </View>
          </View>

          {/* Working Days */}
          <View style={styles.workingDaysSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Working Days</Text>
            <View style={styles.workingDays}>
              {getWorkingDaysArray(bus.workingDays).map((day) => (
                <WorkingDayChip
                  key={day}
                  day={day}
                  isActive={day.isActive}
                />
              ))}
            </View>
          </View>

          {/* Operating Hours */}
          <View style={styles.operatingHours}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={[styles.operatingText, { color: colors.textSecondary }]}>
              {bus.operatingTimeFrom || '--:--'} - {bus.operatingTimeTo || '--:--'}
            </Text>
          </View>

          {/* Route */}
          <View style={styles.routeSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Route</Text>
            <Text style={[styles.routeText, { color: colors.textSecondary }]}>
              {getRouteText(bus.locations)}
            </Text>
            
            <View style={styles.stopsContainer}>
              {bus.locations?.slice(0, 3).map((location, index) => (
                <LocationStop
                  key={`${location.placeId}-${index}`}
                  location={location}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === bus.locations.length - 1}
                  showLine={index < bus.locations.length - 1}
                />
              ))}
              {bus.locations?.length > 3 && (
                <Text style={[styles.moreStops, { color: colors.textTertiary }]}>
                  +{bus.locations.length - 3} more stops
                </Text>
              )}
            </View>
          </View>

          {/* Updated Subscription Button */}
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              {
                backgroundColor: buttonConfig.backgroundColor,
                borderColor: buttonConfig.borderColor,
              }
            ]}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <Ionicons
              name={buttonConfig.icon}
              size={20}
              color={colors.textInverse}
            />
            <Text style={[styles.subscribeButtonText, { color: colors.textInverse }]}>
              {buttonConfig.text}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [
    subscriptionStates,
    isFavorite,
    handleFavoriteToggle,
    userData,
    colors,
    isDark,
    handleUnsubscribe,
    handleResubscribeUnpaid // ✅ NEW dependency
  ]);

  // Memoized header stats
  const headerStats = useMemo(() => ({
    totalRoutes: buses.length,
    totalRiders: buses.reduce((sum, bus) => sum + (bus.currentRiders?.length || 0), 0)
  }), [buses]);

  const keyExtractor = useCallback((item: Bus) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 400, // Approximate height of each card
    offset: 400 * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading buses...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Buses</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {buses.length} buses available
        </Text>
        
        {/* Debug Refresh Button (Development only) */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: colors.backgroundTertiary }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={[styles.debugButtonText, { color: colors.primary }]}>Force Refresh</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading buses...</Text>
        </View>
      ) : (
        <FlatList
          data={buses}
          renderItem={({ item }) => renderBusCard(item)}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <SubscriptionModal
        visible={subscriptionModal.visible}
        bus={subscriptionModal.bus}
        onClose={() => setSubscriptionModal({ visible: false, bus: null })}
        onSubscribe={handleSubscribe}
      />
    </View>
  );
};

// Updated styles to be theme-agnostic (colors are applied dynamically)
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: AppFontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  headerSubtitle: {
    fontSize: AppFontSizes.md,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.sm,
    marginTop: AppSpacing.sm,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    marginLeft: AppSpacing.xs,
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
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
  listContainer: {
    padding: AppSpacing.md,
  },
  busCard: {
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
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
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  busLabel: {
    fontSize: AppFontSizes.sm,
    opacity: 0.9,
    marginBottom: AppSpacing.xs,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.xs,
    opacity: 0.9,
  },
  favoriteButton: {
    padding: AppSpacing.xs,
  },
  cardContent: {
    padding: AppSpacing.md,
  },
  capacitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    marginLeft: AppSpacing.sm,
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  pricingInfo: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  priceSubtext: {
    fontSize: AppFontSizes.sm,
  },
  workingDaysSection: {
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: AppSpacing.sm,
  },
  workingDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
  },
  dayChip: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.sm,
    borderWidth: 1,
  },
  dayText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  operatingHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  operatingText: {
    marginLeft: AppSpacing.sm,
    fontSize: AppFontSizes.sm,
  },
  routeSection: {
    marginBottom: AppSpacing.md,
  },
  routeText: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.sm,
  },
  stopsContainer: {
    marginTop: AppSpacing.sm,
  },
  stopItem: {
    flexDirection: 'row',
    marginBottom: AppSpacing.sm,
  },
  stopIndicator: {
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: AppSpacing.xs,
  },
  firstStop: {
    // Color applied dynamically
  },
  lastStop: {
    // Color applied dynamically
  },
  stopLine: {
    width: 2,
    height: 20,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  stopTime: {
    fontSize: AppFontSizes.xs,
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: AppFontSizes.xs,
  },
  moreStops: {
    fontSize: AppFontSizes.xs,
    fontStyle: 'italic',
    marginTop: AppSpacing.xs,
    marginLeft: AppSpacing.xl,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 2,
  },
  subscribeButtonText: {
    marginLeft: AppSpacing.sm,
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
});
