import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { SubscriptionService } from '../../services/SubscriptionService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';
Dimensions.get('window');

interface BusData {
  id: string;
  busName: string;
  busLabel: string;
  driverName: string;
  locations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    order: number;
  }>;
  maxCapacity: number;
  currentRiders: string[];
  pricePerMonth: number;
  pricePerRide: number;
}

interface RiderStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingPayments: number;
  totalPaid: number;
  monthlySubscriptions: number;
  perRideSubscriptions: number;
}

interface RecentActivity {
  id: string;
  type: 'subscription' | 'payment' | 'ride' | 'cancellation';
  description: string;
  date: Date;
  amount?: number;
  busName?: string;
  status?: 'completed' | 'pending' | 'failed';
}

export const RiderDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { colors, isDark } = useTheme();
  const [buses, setBuses] = useState<BusData[]>([]);
  const [stats, setStats] = useState<RiderStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pendingPayments: 0,
    totalPaid: 0,
    monthlySubscriptions: 0,
    perRideSubscriptions: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true); // Default to map view

  // FIX: Correctly generate map routes
  const mapRoutes = buses
    .filter(bus => bus && bus.locations && Array.isArray(bus.locations))
    .map((bus, index) => ({
      id: bus.id || `bus-${index}`,
      name: bus.busName || 'Unknown Bus',
      locations: bus.locations.filter(loc => 
        loc && 
        typeof loc.latitude === 'number' && 
        typeof loc.longitude === 'number' &&
        !isNaN(loc.latitude) && 
        !isNaN(loc.longitude)
      ),
      color: [colors.primary, colors.secondary, colors.accent, colors.warning][index % 4]
    }))
    .filter(route => route.locations.length > 0);

  const fetchUserSubscriptions = useCallback(async () => {
    if (!userData?.uid) return { subscriptions: [], buses: [] };

    try {
      console.log('📊 Fetching user subscriptions for dashboard...');
      const subscriptions = await SubscriptionService.getUserSubscriptions(userData.uid);
      
      // Add detailed logging to see what subscriptions we're getting
      console.log('📊 Raw subscriptions:', subscriptions.map(sub => ({
        busId: sub.busId,
        status: sub.status,
        paymentStatus: sub.paymentStatus,
        subscriptionType: sub.subscriptionType,
        assignedAt: sub.assignedAt
      })));
      
      // Fetch bus details first to validate currentRiders
      const busPromises = subscriptions.map(async (sub) => {
        try {
          const busDoc = await getDoc(doc(db, 'buses', sub.busId));
          if (busDoc.exists()) {
            const busData = { id: busDoc.id, ...busDoc.data() } as BusData;
            
            // Check if user is in currentRiders
            const isInCurrentRiders = busData.currentRiders?.some((rider: any) => {
              if (typeof rider === 'string') {
                return rider === userData.uid;
              } else if (typeof rider === 'object' && rider.id) {
                return rider.id === userData.uid;
              }
              return false;
            }) || false;
            
            return { bus: busData, subscription: sub, isInCurrentRiders };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching bus ${sub.busId}:`, error);
          return null;
        }
      });

      const busResults = await Promise.all(busPromises);
      const validResults = busResults.filter(result => result !== null);
      
      // Filter to only TRULY active subscriptions (status active AND in currentRiders)
      const trueActiveSubscriptions = validResults.filter(result => 
        result.subscription.status === 'active' && result.isInCurrentRiders
      );
      
      const allActiveSubscriptions = subscriptions.filter(sub => sub.status === 'active');
      
      console.log('📊 Subscription validation:', {
        totalSubscriptions: subscriptions.length,
        statusActiveSubscriptions: allActiveSubscriptions.length,
        trueActiveSubscriptions: trueActiveSubscriptions.length,
        removedFromBuses: allActiveSubscriptions.length - trueActiveSubscriptions.length
      });
      
      const validBuses = validResults.map(result => result.bus);
      const validSubscriptions = trueActiveSubscriptions.map(result => result.subscription);

      console.log('📊 Dashboard data:', {
        totalSubscriptions: subscriptions.length,
        trueActiveSubscriptions: validSubscriptions.length,
        buses: validBuses.length
      });

      return { subscriptions: validSubscriptions, buses: validBuses };
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      return { subscriptions: [], buses: [] };
    }
  }, [userData?.uid]);

  const generateRecentActivity = useCallback(async (subscriptions: any[], buses: BusData[]) => {
    const activities: RecentActivity[] = [];

    // Filter to only active subscriptions for recent activity
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

    // Generate activity from active subscriptions only
    activeSubscriptions.forEach((sub, index) => {
      const bus = buses.find(b => b.id === sub.busId);
      const busName = bus?.busName || 'Unknown Bus';

      // Helper function to safely convert date
      const safeDate = (dateValue: any) => {
        if (!dateValue) return new Date();
        if (typeof dateValue === 'string') return new Date(dateValue);
        if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
        return new Date();
      };

      // Subscription activity
      activities.push({
        id: `sub-${sub.busId}-${index}`,
        type: 'subscription',
        description: `Subscribed to ${busName} (${sub.subscriptionType})`,
        date: safeDate(sub.assignedAt),
        amount: sub.subscriptionType === 'monthly' ? bus?.pricePerMonth : bus?.pricePerRide,
        busName,
        status: sub.paymentStatus === 'paid' ? 'completed' : 'pending'
      });

      // Payment activity (if paid)
      if (sub.paymentStatus === 'paid') {
        activities.push({
          id: `payment-${sub.busId}-${index}`,
          type: 'payment',
          description: `Payment processed for ${busName}`,
          date: safeDate(sub.updatedAt),
          amount: sub.subscriptionType === 'monthly' ? bus?.pricePerMonth : bus?.pricePerRide,
          busName,
          status: 'completed'
        });
      }

      // Simulated ride activities for paid subscriptions
      if (sub.paymentStatus === 'paid') {
        const rideDate = new Date();
        rideDate.setDate(rideDate.getDate() - Math.floor(Math.random() * 7)); // Random ride in last week
        
        activities.push({
          id: `ride-${sub.busId}-${index}`,
          type: 'ride',
          description: `Completed ride on ${busName}`,
          date: rideDate,
          busName,
          status: 'completed'
        });
      }
    });

    // Sort by date (most recent first) and limit to 10
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, []);

  const calculateStats = useCallback((subscriptions: any[]) => {
    // These are already filtered to true active subscriptions
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptionsWithPayment = subscriptions.filter(sub => sub.paymentStatus === 'paid').length;
    const pendingPayments = subscriptions.filter(sub => sub.paymentStatus === 'pending').length;
    const monthlySubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'monthly').length;
    const perRideSubscriptions = subscriptions.filter(sub => sub.subscriptionType === 'per_ride').length;
    
    // Calculate total paid
    const totalPaid = subscriptions
      .filter(sub => sub.paymentStatus === 'paid')
      .reduce((sum, sub) => {
        const amount = sub.subscriptionType === 'monthly' ? 100 : 5;
        return sum + amount;
      }, 0);

    console.log('📊 Stats calculation (true active only):', {
      totalActiveSubscriptions: totalSubscriptions,
      paidSubscriptions: activeSubscriptionsWithPayment,
      pendingPayments: pendingPayments,
      monthlySubscriptions: monthlySubscriptions,
      perRideSubscriptions: perRideSubscriptions
    });

    return {
      totalSubscriptions,
      activeSubscriptions: activeSubscriptionsWithPayment,
      pendingPayments,
      totalPaid,
      monthlySubscriptions,
      perRideSubscriptions
    };
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!userData?.uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('📊 Fetching dashboard data...');
      
      const { subscriptions, buses } = await fetchUserSubscriptions();
      setBuses(buses);

      // Calculate statistics
      const calculatedStats = calculateStats(subscriptions);
      setStats(calculatedStats);

      // Generate recent activity
      const activities = await generateRecentActivity(subscriptions, buses);
      setRecentActivity(activities);

      console.log('📊 Dashboard data loaded:', {
        stats: calculatedStats,
        activities: activities.length,
        buses: buses.length
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.uid, fetchUserSubscriptions, calculateStats, generateRecentActivity]);

  const fetchRecentActivity = useCallback(async () => {
    if (!userData?.uid) return;
    
    try {
      console.log('📅 Fetching recent activity for user:', userData.uid);
      
      // Fetch user-specific activity
      const activityQuery = query(
        collection(db, 'activity'),
        where('userId', '==', userData.uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      
      const activitySnapshot = await getDocs(activityQuery);
      const userActivity = activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RecentActivity[];
      
      setRecentActivity(userActivity);
      console.log('📅 Loaded recent activity:', userActivity.length);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  }, [userData?.uid]);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivity();
  }, [fetchDashboardData, fetchRecentActivity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'subscription': return 'add-circle';
      case 'payment': return 'card';
      case 'ride': return 'bus';
      case 'cancellation': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const getActivityColor = (type: string, status?: string) => {
    if (status === 'pending') return colors.warning;
    if (status === 'failed') return colors.error;
    
    switch (type) {
      case 'subscription': return colors.primary;
      case 'payment': return colors.success;
      case 'ride': return colors.info;
      case 'cancellation': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Welcome Section */}
        <View style={[styles.welcomeSection, { backgroundColor: colors.primary }]}>
          <Text style={[styles.welcomeText, { color: colors.textInverse }]}>
            Welcome back, {userData?.name}!
          </Text>
          <Text style={[styles.welcomeSubtext, { color: colors.textInverse }]}>
            Here's your riding overview
          </Text>
        </View>
          {/* Statistics Cards */}
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="list" size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.totalSubscriptions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Subscriptions
            </Text>
          </View>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.activeSubscriptions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Active Subscriptions
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="time" size={24} color={colors.warning} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.pendingPayments}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Pending Payments
            </Text>
          </View>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="wallet" size={24} color={colors.success} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              ${stats.totalPaid}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Paid
            </Text>
          </View>
        </View>
      </View>
          {/* Subscription Types */}
      {/* Subscription Types */}
      <View style={styles.subscriptionTypesContainer}>
        <View style={styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="calendar" size={24} color={colors.info} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.monthlySubscriptions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Monthly Plans
            </Text>
          </View>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="ticket" size={24} color={colors.secondary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.perRideSubscriptions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Per-Ride Plans
            </Text>
          </View>
        </View>
      </View>
          {/* Map Section */}
      {/* Map Section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🗺️ South Lebanon Bus Routes
          </Text>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowMap(!showMap)}
          >
            <Ionicons 
              name={showMap ? 'list' : 'map'} 
              size={16} 
              color={colors.surface} 
            />
            <Text style={[styles.toggleButtonText, { color: colors.surface }]}>
              {showMap ? 'List' : 'Map'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showMap && (
          <View style={styles.mapContainer}>
            <MapComponent 
              height={300}
              centerLat={33.4}
              centerLng={35.4}
              zoom={10}
              showRealTimeData={true}
            />
          </View>
        )}
      </View>
          {/* Recent Activity */}
      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Recent Activity
        </Text>
        {recentActivity.length === 0 ? (
          <View style={[
            styles.emptyState,
            {
              backgroundColor: colors.card,
              ...getThemeShadow(isDark, 'sm'),
            }
          ]}>
            <Ionicons name="time" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No recent activity
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textTertiary }]}>
              Subscribe to buses to see your activity here
            </Text>
          </View>
        ) : (
          recentActivity.map((activity) => (
            <View 
              key={activity.id} 
              style={[
                styles.activityItem,
                {
                  backgroundColor: colors.card,
                  borderLeftColor: getActivityColor(activity.type, activity.status),
                  ...getThemeShadow(isDark, 'sm'),
                }
              ]}
            >
              <View style={[
                styles.activityIcon,
                { backgroundColor: getActivityColor(activity.type, activity.status) + '20' }
              ]}>
                <Ionicons 
                  name={getActivityIcon(activity.type)} 
                  size={20} 
                  color={getActivityColor(activity.type, activity.status)} 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityDescription, { color: colors.text }]}>
                  {activity.description}
                </Text>
                <View style={styles.activityMeta}>
                  <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                    {formatDate(activity.date)}
                  </Text>
                  {activity.status && (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getActivityColor(activity.type, activity.status) + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getActivityColor(activity.type, activity.status) }
                      ]}>
                        {activity.status}
                      </Text>
                    </View>
                  )}
                </View>
                {activity.busName && (
                  <Text style={[styles.activityBus, { color: colors.textTertiary }]}>
                    {activity.busName}
                  </Text>
                )}
              </View>
              {activity.amount && (
                <Text style={[styles.activityAmount, { color: colors.success }]}>
                  ${activity.amount}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  subscriptionTypesContainer: {
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.lg,
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
  section: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  sectionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.xs,
    paddingHorizontal: AppSpacing.sm,
    borderRadius: AppBorderRadius.sm,
  },
  toggleButtonText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.xs,
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
    marginRight: AppSpacing.sm,
  },
  statusBadge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppBorderRadius.sm,
  },
  statusText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityBus: {
    fontSize: AppFontSizes.xs,
  },
  activityAmount: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
});
