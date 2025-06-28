import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MapComponent } from '../../components/map/MapComponent';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface BusData {
  id: string;
  busName: string;
  busLabel: string;
  maxCapacity: number;
  currentRiders: string[];
  subscribers: Array<{
    userId: string;
    name: string;
    email: string;
    subscribedAt: string;
    paymentStatus: 'paid' | 'unpaid' | 'pending';
    status: 'active' | 'unsubscribed';
  }>;
  pricePerMonth: number;
  pricePerRide: number;
  driverId: string;
  locations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    order: number;
  }>;
  workingDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface DriverStats {
  totalBuses: number;
  totalRiders: number;
  totalSubscribers: number;
  monthlyEarnings: number;
  expectedCapacity: number;
  occupancyRate: number;
}

interface RecentActivity {
  id: string;
  type: 'rider_pickup' | 'new_subscriber' | 'route_completed' | 'payment_received';
  description: string;
  date: Date;
  busName?: string;
  amount?: number;
  riderCount?: number;
}

export const DriverDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { isDark, colors } = useTheme();
  const [buses, setBuses] = useState<BusData[]>([]);
  const [stats, setStats] = useState<DriverStats>({
    totalBuses: 0,
    totalRiders: 0,
    totalSubscribers: 0,
    monthlyEarnings: 0,
    expectedCapacity: 0,
    occupancyRate: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add fallback colors in case theme isn't available
  const safeColors = colors || {
    primary: '#3f51b5',
    secondary: '#f50057',
    accent: '#00b0ff',
    warning: '#ff9800',
    text: '#000',
    textSecondary: '#666',
    textInverse: '#fff',
    card: '#fff',
    info: '#2196F3'
  };

  const fetchDriverBuses = useCallback(async () => {
    if (!userData?.uid) return [];

    try {
      console.log('🚌 Fetching buses for driver:', userData.uid);
      
      // Query buses where driverId matches current user
      const busesQuery = query(
        collection(db, 'buses'),
        where('driverId', '==', userData.uid)
      );
      
      const busesSnapshot = await getDocs(busesQuery);
      const driverBuses = busesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BusData[];

      console.log('🚌 Found buses:', driverBuses.length);
      return driverBuses;
    } catch (error) {
      console.error('Error fetching driver buses:', error);
      throw new Error('Failed to load your buses. Please try again.');
    }
  }, [userData?.uid]);

  const generateRecentActivity = useCallback((buses: BusData[]) => {
    const activities: RecentActivity[] = [];
    const now = new Date();

    buses.forEach((bus, busIndex) => {
      // Generate rider pickup activities
      if (bus.currentRiders && bus.currentRiders.length > 0) {
        const pickupDate = new Date(now);
        pickupDate.setHours(pickupDate.getHours() - Math.floor(Math.random() * 24));
        
        activities.push({
          id: `pickup-${bus.id}-${busIndex}`,
          type: 'rider_pickup',
          description: `Picked up ${bus.currentRiders.length} riders`,
          date: pickupDate,
          busName: bus.busName,
          riderCount: bus.currentRiders.length
        });
      }

      // FIXED: Generate new subscriber activities only for PAID subscribers
      if (bus.subscribers && bus.subscribers.length > 0) {
        const paidSubscribers = bus.subscribers.filter((subscriber: any) => {
          if (typeof subscriber === 'object' && subscriber.paymentStatus) {
            return subscriber.paymentStatus === 'paid';
          }
          return false;
        });

        if (paidSubscribers.length > 0) {
          const subscribeDate = new Date(now);
          subscribeDate.setDate(subscribeDate.getDate() - Math.floor(Math.random() * 7));
          
          activities.push({
            id: `subscriber-${bus.id}-${busIndex}`,
            type: 'new_subscriber',
            description: `${paidSubscribers.length} paid subscriber${paidSubscribers.length !== 1 ? 's' : ''} on ${bus.busName}`,
            date: subscribeDate,
            busName: bus.busName
          });
        }
      }

      // Generate route completion activities
      const routeDate = new Date(now);
      routeDate.setHours(routeDate.getHours() - Math.floor(Math.random() * 12));
      
      activities.push({
        id: `route-${bus.id}-${busIndex}`,
        type: 'route_completed',
        description: `Completed route for ${bus.busName}`,
        date: routeDate,
        busName: bus.busName
      });

      // FIXED: Generate payment activities based on PAID subscribers only
      if (bus.subscribers && bus.subscribers.length > 0) {
        const paidSubscribers = bus.subscribers.filter((subscriber: any) => {
          if (typeof subscriber === 'object' && subscriber.paymentStatus) {
            return subscriber.paymentStatus === 'paid';
          }
          return false;
        });

        if (paidSubscribers.length > 0) {
          const paymentDate = new Date(now);
          paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 30));
          
          const estimatedEarnings = paidSubscribers.length * bus.pricePerMonth;
          activities.push({
            id: `payment-${bus.id}-${busIndex}`,
            type: 'payment_received',
            description: `Monthly payments received from ${paidSubscribers.length} subscriber${paidSubscribers.length !== 1 ? 's' : ''}`,
            date: paymentDate,
            busName: bus.busName,
            amount: estimatedEarnings
          });
        }
      }
    });

    // Sort by date (most recent first) and limit to 15
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 15);
  }, []);

  const calculateStats = useCallback((buses: BusData[]) => {
    console.log('🔍 CALCULATING DASHBOARD STATS:', buses.map(bus => ({
      busName: bus.busName,
      totalSubscribers: bus.subscribers?.length || 0,
      subscribersArray: bus.subscribers,
      paidSubscribers: bus.subscribers?.filter(s => s.paymentStatus === 'paid').length || 0
    })));

    const totalBuses = buses.length;
    const totalRiders = buses.reduce((sum, bus) => sum + (bus.currentRiders?.length || 0), 0);
    
    // FIXED: Only count subscribers with 'paid' payment status
    const totalSubscribers = buses.reduce((sum, bus) => {
      if (!bus.subscribers || !Array.isArray(bus.subscribers)) return sum;
      
      const paidSubscribers = bus.subscribers.filter((subscriber: any) => 
        subscriber.paymentStatus === 'paid'
      );
      
      console.log(`📊 Bus ${bus.busName}: ${paidSubscribers.length} paid subscribers out of ${bus.subscribers.length} total`);
      
      return sum + paidSubscribers.length;
    }, 0);
    
    const expectedCapacity = buses.reduce((sum, bus) => sum + (bus.maxCapacity || 0), 0);
    
    // FIXED: Calculate monthly earnings based on PAID subscribers only
    const monthlyEarnings = buses.reduce((sum, bus) => {
      if (!bus.subscribers || !Array.isArray(bus.subscribers)) return sum;
      
      const paidSubscribers = bus.subscribers.filter((subscriber: any) => 
        subscriber.paymentStatus === 'paid'
      );
      
      return sum + (paidSubscribers.length * (bus.pricePerMonth || 0));
    }, 0);

    const occupancyRate = expectedCapacity > 0 ? Math.round((totalRiders / expectedCapacity) * 100) : 0;

    console.log('📊 FINAL DASHBOARD STATS:', {
      totalBuses,
      totalRiders,
      totalSubscribers, // Now only paid subscribers
      monthlyEarnings, // Now based on paid subscribers only
      expectedCapacity,
      occupancyRate
    });

    return {
      totalBuses,
      totalRiders,
      totalSubscribers,
      monthlyEarnings,
      expectedCapacity,
      occupancyRate
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!userData?.uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('📊 Fetching driver dashboard data...');
      setError(null);
      
      const driverBuses = await fetchDriverBuses();
      setBuses(driverBuses);

      // Calculate statistics
      const calculatedStats = calculateStats(driverBuses);
      setStats(calculatedStats);

      // Generate recent activity
      const activities = generateRecentActivity(driverBuses);
      setRecentActivity(activities);

      console.log('📊 Driver dashboard data loaded:', {
        buses: driverBuses.length,
        stats: calculatedStats,
        activities: activities.length
      });

    } catch (error: any) {
      console.error('Error fetching driver dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      
      // Show user-friendly error alert
      Alert.alert(
        'Error Loading Dashboard',
        error.message || 'Failed to load dashboard data. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => fetchDashboardData()
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.uid, fetchDriverBuses, calculateStats, generateRecentActivity]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'rider_pickup': return 'people';
      case 'new_subscriber': return 'person-add';
      case 'route_completed': return 'checkmark-circle';
      case 'payment_received': return 'card';
      default: return 'information-circle';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'rider_pickup': return safeColors.info;
      case 'new_subscriber': return safeColors.success;
      case 'route_completed': return safeColors.primary;
      case 'payment_received': return safeColors.warning;
      default: return safeColors.textSecondary;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // Convert buses to routes format for the map
  const busRoutes = buses.map(bus => ({
    id: bus.id,
    name: bus.busName || bus.busLabel || 'Unknown Bus',
    locations: (bus.locations || []).map(loc => ({
      name: loc.name,
      latitude: loc.latitude,
      longitude: loc.longitude,
      order: loc.order || 0
    }))
  }));

  // Add this to force refresh when needed
  const forceRefresh = useCallback(() => {
    console.log('🔄 FORCE REFRESHING DASHBOARD...');
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Add useFocusEffect to refresh when returning to dashboard
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Dashboard focused - refreshing data...');
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: safeColors.background }]}>
        <ActivityIndicator size="large" color={safeColors.primary} />
        <Text style={[styles.loadingText, { color: safeColors.textSecondary }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: safeColors.background }]}>
        <Ionicons name="alert-circle" size={64} color={safeColors.error} />
        <Text style={[styles.errorTitle, { color: safeColors.text }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[styles.errorMessage, { color: safeColors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: safeColors.primary }]}
          onPress={fetchDashboardData}
        >
          <Text style={[styles.retryButtonText, { color: safeColors.textInverse }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: safeColors.background }]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={[safeColors.primary]}
          tintColor={safeColors.primary}
        />
      }
    >
      {/* Welcome Section */}
      <View style={[styles.welcomeSection, { backgroundColor: safeColors.primary }]}>
        <Text style={[styles.welcomeText, { color: safeColors.textInverse }]}>
          Welcome back, {userData?.name}!
        </Text>
        <Text style={[styles.welcomeSubtext, { color: safeColors.textInverse }]}>
          Here's your driving overview
        </Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="bus" size={24} color={safeColors.primary} />
            <Text style={[styles.statNumber, { color: safeColors.text }]}>
              {stats.totalBuses}
            </Text>
            <Text style={[styles.statLabel, { color: safeColors.textSecondary }]}>
              Total Buses
            </Text>
          </View>
          <View style={[
            styles.statCard,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="people" size={24} color={safeColors.info} />
            <Text style={[styles.statNumber, { color: safeColors.text }]}>
              {stats.totalRiders}
            </Text>
            <Text style={[styles.statLabel, { color: safeColors.textSecondary }]}>
              Current Riders
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
         
         
        </View>
        <View style={styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="speedometer" size={24} color={safeColors.secondary} />
            <Text style={[styles.statNumber, { color: safeColors.text }]}>
              {stats.expectedCapacity}
            </Text>
            <Text style={[styles.statLabel, { color: safeColors.textSecondary }]}>
              Total Capacity
            </Text>
          </View>
          <View style={[
            styles.statCard,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="analytics" size={24} color={safeColors.accent} />
            <Text style={[styles.statNumber, { color: safeColors.text }]}>
              {stats.occupancyRate}%
            </Text>
            <Text style={[styles.statLabel, { color: safeColors.textSecondary }]}>
              Occupancy Rate
            </Text>
          </View>
        </View>
      </View>

      {/* Map Section */}
      {buses.length > 0 && (
        <View style={styles.mapSection}>
          <Text style={[styles.sectionTitle, { color: safeColors.text }]}>
            Your Bus Routes
          </Text>
          <View style={[
            styles.mapContainer,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'md'),
            }
          ]}>
            <MapComponent 
              routes={busRoutes}
              height={300}
              centerLat={33.8547}
              centerLng={35.8623}
              zoom={9}
            />
          </View>
        </View>
      )}

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={[styles.sectionTitle, { color: safeColors.text }]}>
          Recent Activity
        </Text>
        {recentActivity.length === 0 ? (
          <View style={[
            styles.emptyState,
            {
              backgroundColor: safeColors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="time" size={48} color={safeColors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: safeColors.textSecondary }]}>
              No recent activity
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: safeColors.textTertiary }]}>
              Activity will appear here as you manage your buses
            </Text>
          </View>
        ) : (
          recentActivity.map((activity) => (
            <View 
              key={activity.id} 
              style={[
                styles.activityItem,
                {
                  backgroundColor: safeColors.card,
                  borderLeftColor: getActivityColor(activity.type),
                  ...getThemeShadow(isDark, 'sm'),
                }
              ]}
            >
              <View style={[
                styles.activityIcon,
                { backgroundColor: getActivityColor(activity.type) + '20' }
              ]}>
                <Ionicons 
                  name={getActivityIcon(activity.type)} 
                  size={20} 
                  color={getActivityColor(activity.type)} 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityDescription, { color: safeColors.text }]}>
                  {activity.description}
                </Text>
                <View style={styles.activityMeta}>
                  <Text style={[styles.activityDate, { color: safeColors.textSecondary }]}>
                    {formatDate(activity.date)}
                  </Text>
                  {activity.riderCount && (
                    <Text style={[styles.activityExtra, { color: safeColors.textTertiary }]}>
                      • {activity.riderCount} riders
                    </Text>
                  )}
                </View>
                {activity.busName && (
                  <Text style={[styles.activityBus, { color: safeColors.textTertiary }]}>
                    {activity.busName}
                  </Text>
                )}
              </View>
              {activity.amount && (
                <Text style={[styles.activityAmount, { color: safeColors.success }]}>
                  ${activity.amount}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.lg,
  },
  errorTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    marginBottom: AppSpacing.lg,
  },
  retryButton: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
  },
  retryButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  welcomeSection: {
    padding: AppSpacing.lg,
  },
  welcomeText: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  welcomeSubtext: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
  },
  statsContainer: {
    padding: AppSpacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.md,
  },
  statCard: {
    flex: 1,
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
    marginHorizontal: AppSpacing.xs,
  },
  statNumber: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.xs,
  },
  statLabel: {
    fontSize: AppFontSizes.sm,
    textAlign: 'center',
    marginTop: AppSpacing.xs,
  },
  mapSection: {
    padding: AppSpacing.lg,
  },
  sectionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginBottom: AppSpacing.md,
  },
  mapContainer: {
    borderRadius: AppBorderRadius.lg,
    overflow: 'hidden',
  },
  activitySection: {
    padding: AppSpacing.lg,
  },
  emptyState: {
    padding: AppSpacing.xl,
    borderRadius: AppBorderRadius.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginTop: AppSpacing.md,
  },
  emptyStateSubtext: {
    fontSize: AppFontSizes.sm,
    textAlign: 'center',
    marginTop: AppSpacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.sm,
    borderLeftWidth: 4,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: AppFontSizes.md,
    fontWeight: '500',
    marginBottom: AppSpacing.xs,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
  },
  activityDate: {
    fontSize: AppFontSizes.sm,
  },
  activityExtra: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.xs,
  },
  activityBus: {
    fontSize: AppFontSizes.xs,
  },
  activityAmount: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
});