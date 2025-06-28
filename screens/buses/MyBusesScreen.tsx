import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
  driverName: string;
  operatingTimeFrom: string;
  operatingTimeTo: string;
  locations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    order: number;
    arrivalTimeFrom?: string;
    arrivalTimeTo?: string;
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
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

interface BusStats {
  totalSubscribers: number;
  currentRiders: number;
  occupancyRate: number;
  monthlyRevenue: number;
}

export const MyBusesScreen: React.FC = () => {
  const { userData } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyBuses = useCallback(async () => {
    if (!userData?.uid) return;

    try {
      console.log('🚌 Fetching buses for driver:', userData.uid);
      setError(null);
      
      const busesQuery = query(
        collection(db, 'buses'),
        where('driverId', '==', userData.uid)
      );
      
      const busesSnapshot = await getDocs(busesQuery);
      const driverBuses = busesSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // DEBUG: Log the actual bus data
        console.log('🚌 Bus data from Firebase:', {
          id: doc.id,
          busName: data.busName,
          busLabel: data.busLabel,
          hasName: !!data.busName,
          hasLabel: !!data.busLabel
        });
        
        return {
          id: doc.id,
          ...data
        };
      }) as BusData[];

      console.log('🚌 Found buses:', driverBuses.length);
      setBuses(driverBuses);
    } catch (error: any) {
      console.error('Error fetching driver buses:', error);
      setError('Failed to load your buses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.uid]);

  useEffect(() => {
    fetchMyBuses();
  }, [fetchMyBuses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyBuses();
  }, [fetchMyBuses]);

  const calculateBusStats = (bus: BusData): BusStats => {
    // FIXED: Only count subscribers with 'paid' payment status
    let totalSubscribers = 0;
    
    if (bus.subscribers && Array.isArray(bus.subscribers)) {
      const paidSubscribers = bus.subscribers.filter((subscriber: any) => {
        // Handle both string and object formats
        if (typeof subscriber === 'string') {
          // If it's just a string (legacy format), we can't check payment status
          // So we'll assume they're not paid unless we have payment data
          return false;
        } else if (typeof subscriber === 'object' && subscriber.paymentStatus) {
          return subscriber.paymentStatus === 'paid';
        }
        return false;
      });
      
      totalSubscribers = paidSubscribers.length;
    }
    
    const currentRiders = bus.currentRiders?.length || 0;
    const occupancyRate = bus.maxCapacity > 0 ? Math.round((currentRiders / bus.maxCapacity) * 100) : 0;
    
    // FIXED: Calculate monthly revenue based on PAID subscribers only
    const monthlyRevenue = totalSubscribers * (bus.pricePerMonth || 0);

    console.log(`📊 Bus ${bus.busName} stats:`, {
      totalSubscribers, // Now only paid subscribers
      currentRiders,
      occupancyRate,
      monthlyRevenue // Now based on paid subscribers only
    });

    return {
      totalSubscribers,
      currentRiders,
      occupancyRate,
      monthlyRevenue
    };
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return colors.success;
      case 'inactive': return colors.textSecondary;
      case 'maintenance': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'checkmark-circle';
      case 'inactive': return 'pause-circle';
      case 'maintenance': return 'construct';
      default: return 'help-circle';
    }
  };

  const getStatusText = (status: string | undefined) => {
    switch(status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'maintenance': return 'Maintenance';
      case 'unknown':
      case undefined:
      case null:
      default: return 'Active'; // Default to Active instead of Unknown
    }
  };

  const formatWorkingDays = (workingDays: BusData['workingDays'] | undefined) => {
    if (!workingDays) return 'Not specified';
    
    const days = [];
    if (workingDays.monday) days.push('Mon');
    if (workingDays.tuesday) days.push('Tue');
    if (workingDays.wednesday) days.push('Wed');
    if (workingDays.thursday) days.push('Thu');
    if (workingDays.friday) days.push('Fri');
    if (workingDays.saturday) days.push('Sat');
    if (workingDays.sunday) days.push('Sun');
    
    return days.length === 7 ? 'Every day' : days.length > 0 ? days.join(', ') : 'Not specified';
  };

  const handleViewRiders = (bus: BusData) => {
    // Navigate to riders screen for this bus
    router.push(`/buses/riders/${bus.id}`);
  };

  const handleAddNewBus = () => {
    // Navigate to add new bus screen
    Alert.alert('Add New Bus', 'Add new bus functionality will be implemented soon.');
  };

  const renderBusCard = (bus: BusData) => {
    const stats = calculateBusStats(bus);
    const busStatus = bus.status || 'active';
    
    // FIXED: Smart bus name display logic
    const getBusDisplayName = () => {
      if (bus.busName && bus.busName.trim()) {
        return bus.busName.trim();
      }
      if (bus.busLabel && bus.busLabel.trim()) {
        return bus.busLabel.trim();
      }
      return `Bus Route ${bus.id.slice(-6).toUpperCase()}`;
    };
    
    const getBusDisplayLabel = () => {
      // Only show label if it exists and is different from the name
      if (bus.busLabel && 
          bus.busLabel.trim() && 
          bus.busName && 
          bus.busLabel.trim() !== bus.busName.trim()) {
        return bus.busLabel.trim();
      }
      return null;
    };
    
    const displayName = getBusDisplayName();
    const displayLabel = getBusDisplayLabel();
    
    return (
      <View
        key={bus.id}
        style={[
          styles.busCard,
          {
            backgroundColor: colors.card,
            ...getThemeShadow(isDark, 'md'),
          }
        ]}
      >
        {/* Bus Header */}
        <View style={styles.busHeader}>
          <View style={styles.busInfo}>
            <Text style={[styles.busName, { color: colors.text }]}>
              {displayName}
            </Text>
            {/* FIXED: Only show label if it exists and is meaningful */}
            {displayLabel && (
              <Text style={[styles.busLabel, { color: colors.textSecondary }]}>
                {displayLabel}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(busStatus) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(busStatus)} 
              size={16} 
              color={getStatusColor(busStatus)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(busStatus) }]}>
              {getStatusText(busStatus)}
            </Text>
          </View>
        </View>

        {/* Bus Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.currentRiders}/{bus.maxCapacity || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Current
            </Text>
          </View>
        
          <View style={styles.statItem}>
            <Ionicons name="analytics" size={20} color={colors.info} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {stats.occupancyRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Occupancy
            </Text>
          </View>
        
          
        </View>

        {/* Operating Info */}
        <View style={styles.operatingInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {bus.operatingTimeFrom || 'N/A'} - {bus.operatingTimeTo || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {formatWorkingDays(bus.workingDays)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {bus.locations?.length || 0} stops
            </Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingContainer}>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
              Monthly
            </Text>
            <Text style={[styles.priceValue, { color: colors.success }]}>
              ${bus.pricePerMonth || 0}
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
              Per Ride
            </Text>
            <Text style={[styles.priceValue, { color: colors.info }]}>
              ${bus.pricePerRide || 0}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.viewRidersButton, { backgroundColor: colors.primary }]}
          onPress={() => handleViewRiders(bus)}
        >
          <Ionicons name="people" size={20} color={colors.textInverse} />
          <Text style={[styles.viewRidersButtonText, { color: colors.textInverse }]}>
            View Riders ({stats.currentRiders})
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your buses...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchMyBuses}
        >
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: colors.textInverse }]}>
          My Buses
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textInverse }]}>
          Manage your bus routes
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {buses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bus" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No buses yet
            </Text>
            <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
              You haven't added any buses yet. Start by adding your first bus route.
            </Text>
            <TouchableOpacity
              style={[styles.addFirstBusButton, { backgroundColor: colors.primary }]}
              onPress={handleAddNewBus}
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
              <Text style={[styles.addFirstBusButtonText, { color: colors.textInverse }]}>
                Add Your First Bus
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={styles.summaryContainer}>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Total Buses
                </Text>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>
                  {buses.length}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Total Riders
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {buses.reduce((sum, bus) => sum + (bus.currentRiders?.length || 0), 0)}
                </Text>
              </View>
             
            </View>

            {/* Bus Cards */}
            <View style={styles.busesContainer}>
              {buses.map(renderBusCard)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
  header: {
    padding: AppSpacing.lg,
    paddingTop: AppSpacing.xl,
  },
  headerTitle: {
    fontSize: AppFontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  headerSubtitle: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
  },
  scrollContainer: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.xs,
  },
  summaryValue: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
  },
  busesContainer: {
    padding: AppSpacing.lg,
    paddingTop: 0,
  },
  busCard: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
    marginBottom: AppSpacing.lg,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AppSpacing.md,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.full,
    gap: AppSpacing.xs,
  },
  statusText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginTop: AppSpacing.xs,
  },
  statLabel: {
    fontSize: AppFontSizes.xs,
    marginTop: AppSpacing.xs,
  },
  operatingInfo: {
    marginBottom: AppSpacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
    gap: AppSpacing.sm,
  },
  infoText: {
    fontSize: AppFontSizes.sm,
  },
  pricingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: AppBorderRadius.md,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: AppFontSizes.xs,
    marginBottom: AppSpacing.xs,
  },
  priceValue: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
  viewRidersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    gap: AppSpacing.sm,
  },
  viewRidersButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xl,
    minHeight: 400,
  },
  emptyStateTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.sm,
  },
  emptyStateMessage: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    marginBottom: AppSpacing.xl,
    lineHeight: 22,
  },
  addFirstBusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    gap: AppSpacing.sm,
  },
  addFirstBusButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
});