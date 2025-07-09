import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
import { QRScanner } from '../../components/qr/QRScanner';
import { RiderInfoModal } from '../../components/qr/RiderInfoModal';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ScannedRiderInfo } from '../../services/QRScannerService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface BusData {
  id: string;
  busName: string;
  busLabel: string;
  maxCapacity: number;
  currentRiders: Array<{
    id: string;
    name: string;
    email: string;
    paymentStatus: 'paid' | 'unpaid' | 'pending';
    status: 'active' | 'inactive';
    subscriptionType: 'monthly' | 'per_ride';
    // ... other currentRider fields
  }>;
  // ✅ REMOVED: subscribers array no longer exists
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
  const [showMap, setShowMap] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedRiderInfo, setScannedRiderInfo] = useState<ScannedRiderInfo | null>(null);
  const [showRiderInfo, setShowRiderInfo] = useState(false);
  // Add the missing error state
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

  // ✅ FIXED: Generate REAL activity based on actual subscription data
  const generateRecentActivity = useCallback((buses: BusData[]) => {
    const activities: RecentActivity[] = [];
    const now = new Date();

    buses.forEach((bus) => {
      if (bus.currentRiders && Array.isArray(bus.currentRiders)) {
        bus.currentRiders.forEach((rider: any) => {
          // Only process riders with valid data
          if (rider && rider.id && rider.assignedAt) {
            const assignedDate = new Date(rider.assignedAt);
            const updatedDate = rider.updatedAt ? new Date(rider.updatedAt) : assignedDate;
            
            // New subscriber activity (based on actual assignedAt timestamp)
            if (rider.status === 'active') {
              const daysSinceAssigned = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24);
              
              // Show new subscribers from last 30 days
              if (daysSinceAssigned <= 30) {
                activities.push({
                  id: `subscriber-${rider.id}-${rider.subscriptionId}`,
                  type: 'new_subscriber',
                  description: `${rider.name} subscribed to ${bus.busName} (${rider.subscriptionType})`,
                  date: assignedDate, // ✅ REAL timestamp
                  busName: bus.busName
                });
              }
            }

            // Payment activity (based on actual payment status changes)
            if (rider.paymentStatus === 'paid' && rider.paidAt) {
              const paidDate = new Date(rider.paidAt);
              const daysSincePaid = (now.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24);
              
              // Show payments from last 30 days
              if (daysSincePaid <= 30) {
                const amount = rider.subscriptionType === 'monthly' ? bus.pricePerMonth : bus.pricePerRide;
                activities.push({
                  id: `payment-${rider.id}-${rider.subscriptionId}`,
                  type: 'payment_received',
                  description: `Payment received from ${rider.name} (${rider.subscriptionType})`,
                  date: paidDate, // ✅ REAL timestamp
                  busName: bus.busName,
                  amount: amount
                });
              }
            }

            // Unsubscription activity (based on actual unsubscribedAt timestamp)
            if (rider.status === 'inactive' && rider.unsubscribedAt) {
              const unsubscribedDate = new Date(rider.unsubscribedAt);
              const daysSinceUnsubscribed = (now.getTime() - unsubscribedDate.getTime()) / (1000 * 60 * 60 * 24);
              
              // Show unsubscriptions from last 30 days
              if (daysSinceUnsubscribed <= 30) {
                activities.push({
                  id: `unsubscribe-${rider.id}-${rider.subscriptionId}`,
                  type: 'rider_pickup', // Using existing type, but with different description
                  description: `${rider.name} unsubscribed from ${bus.busName}`,
                  date: unsubscribedDate, // ✅ REAL timestamp
                  busName: bus.busName
                });
              }
            }
          }
        });
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
      totalCurrentRiders: bus.currentRiders?.length || 0,
      activeRiders: bus.currentRiders?.filter(r => r.status === 'active').length || 0,
      paidRiders: bus.currentRiders?.filter(r => r.status === 'active' && r.paymentStatus === 'paid').length || 0
    })));

    const totalBuses = buses.length;
    
    // ✅ FIXED: Count active riders from currentRiders
    const totalRiders = buses.reduce((sum, bus) => {
      if (!bus.currentRiders || !Array.isArray(bus.currentRiders)) return sum;
      
      const activeRiders = bus.currentRiders.filter((rider: any) => 
        rider.status === 'active'
      );
      
      return sum + activeRiders.length;
    }, 0);
    
    // ✅ FIXED: Count paid riders from currentRiders (these are the real subscribers)
    const totalSubscribers = buses.reduce((sum, bus) => {
      if (!bus.currentRiders || !Array.isArray(bus.currentRiders)) return sum;
      
      const paidActiveRiders = bus.currentRiders.filter((rider: any) => 
        rider.status === 'active' && rider.paymentStatus === 'paid'
      );
      
      console.log(`📊 Bus ${bus.busName}: ${paidActiveRiders.length} paid active riders out of ${bus.currentRiders.length} total`);
      
      return sum + paidActiveRiders.length;
    }, 0);
    
    const expectedCapacity = buses.reduce((sum, bus) => sum + (bus.maxCapacity || 0), 0);
    
    // ✅ FIXED: Calculate monthly earnings based on paid active riders
    const monthlyEarnings = buses.reduce((sum, bus) => {
      if (!bus.currentRiders || !Array.isArray(bus.currentRiders)) return sum;
      
      const paidActiveRiders = bus.currentRiders.filter((rider: any) => 
        rider.status === 'active' && rider.paymentStatus === 'paid'
      );
      
      return sum + (paidActiveRiders.length * (bus.pricePerMonth || 0));
    }, 0);

    const occupancyRate = expectedCapacity > 0 ? Math.round((totalRiders / expectedCapacity) * 100) : 0;

    console.log('📊 FINAL DASHBOARD STATS:', {
      totalBuses,
      totalRiders, // Active riders
      totalSubscribers, // Paid active riders
      monthlyEarnings, // Based on paid active riders
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

  // ✅ FIXED: Use real-time data refresh
  const fetchDashboardData = useCallback(async () => {
    if (!userData?.uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('📊 Fetching real-time driver dashboard data...');
      setError(null);
      
      const driverBuses = await fetchDriverBuses();
      setBuses(driverBuses);

      // Calculate real-time statistics
      const calculatedStats = calculateStats(driverBuses);
      setStats(calculatedStats);

      // Generate real activity based on actual events
      const activities = generateRecentActivity(driverBuses);
      setRecentActivity(activities);

      console.log('📊 Real-time driver dashboard data loaded:', {
        buses: driverBuses.length,
        stats: calculatedStats,
        activities: activities.length
      });

    } catch (error: any) {
      console.error('Error fetching driver dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.uid, fetchDriverBuses, calculateStats, generateRecentActivity]);

  // ✅ ADDED: Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing && !loading) {
        fetchDashboardData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshing, loading]);

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

  const handleQRScanSuccess = (riderInfo: ScannedRiderInfo) => {
    setScannedRiderInfo(riderInfo);
    setShowRiderInfo(true);
  };

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
      <View style={[styles.mapSection, { backgroundColor: safeColors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: safeColors.text }]}>
            🗺️ Your Routes in South Lebanon
          </Text>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: safeColors.primary }]}
            onPress={() => setShowMap(!showMap)}
          >
            <Ionicons 
              name={showMap ? 'list' : 'map'} 
              size={16} 
              color={safeColors.surface} 
            />
            <Text style={[styles.toggleButtonText, { color: safeColors.surface }]}>
              {showMap ? 'List' : 'Map'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showMap && (
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
              centerLat={33.27}
              centerLng={35.20}
              zoom={11}
              showRealTimeData={false}
            />
          </View>
        )}
      </View>

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

      {/* QR Scanner Button */}
      <TouchableOpacity
        style={[
          styles.scannerButton,
          {
            backgroundColor: safeColors.primary,
          }
        ]}
        onPress={() => setShowQRScanner(true)}
      >
        <Ionicons name="qr-code-outline" size={24} color={safeColors.textInverse} />
        <Text style={[styles.scannerButtonText, { color: safeColors.textInverse }]}>
          Scan QR Code
        </Text>
      </TouchableOpacity>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleQRScanSuccess}
        driverBusId={buses.length > 0 ? buses[0].id : undefined}
      />

      {/* Rider Info Modal */}
      <RiderInfoModal
        visible={showRiderInfo}
        riderInfo={scannedRiderInfo}
        onClose={() => {
          setShowRiderInfo(false);
          setScannedRiderInfo(null);
        }}
      />
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
  section: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
    ...getThemeShadow(false, 'md'),
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
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.sm,
  },
  toggleButtonText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
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
  scannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.lg,
    paddingHorizontal: AppSpacing.xl,
    borderRadius: AppBorderRadius.lg,
    marginHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.lg,
  },
  scannerButtonText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginLeft: AppSpacing.sm,
  },
});