import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
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
import { QRCodeModal } from '../../components/modals/QRCodeModal';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { SubscriptionData, SubscriptionService } from '../../services/SubscriptionService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const { width } = Dimensions.get('window');

interface Bus {
  id: string;
  busName: string;
  busLabel: string;
  driverName: string;
  locations: Array<{
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
    };
    latitude: number;
    longitude: number;
    order: number;
  }>;
  maxCapacity: number;
  currentRiders: string[];
  pricePerMonth: number;
  pricePerRide: number;
  operatingTimeFrom: string;
  operatingTimeTo: string;
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

interface SubscriptionWithBus extends SubscriptionData {
  bus?: Bus;
  isUserInBus?: boolean; // Track if user is still in bus currentRiders
  canAccessQR?: boolean; // Track if user can access QR code (admin confirmed payment)
}

export const MySubscriptionsScreen: React.FC = () => {
  const { userData } = useAuth();
  const { colors, isDark } = useTheme();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModal, setQrModal] = useState<{
    visible: boolean;
    subscription: SubscriptionWithBus | null;
  }>({ visible: false, subscription: null });

  const fetchSubscriptions = useCallback(async () => {
    if (!userData?.uid) return;

    try {
      setLoading(true);
      
      // Get ALL subscriptions without filtering
      const subscriptions = await SubscriptionService.getUserSubscriptions(userData.uid);
      
      console.log(`📱 Fetched ${subscriptions.length} subscriptions from service`);
      
      // Fetch bus details for each subscription
      const subscriptionsWithBus = await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            const busRef = doc(db, 'buses', subscription.busId);
            const busDoc = await getDoc(busRef);
            
            if (busDoc.exists()) {
              const busData = { id: busDoc.id, ...busDoc.data() } as Bus;
              
              // FIX: Check if user is in currentRiders (handle both formats)
              const isUserInBus = busData.currentRiders?.some((rider: any) => {
                if (typeof rider === 'string') {
                  return rider === userData.uid;
                } else if (typeof rider === 'object' && rider.id) {
                  return rider.id === userData.uid;
                }
                return false;
              }) || false;
              
              console.log(`🚌 Bus ${busData.busName}: User in bus = ${isUserInBus}`);
              
              return {
                ...subscription,
                bus: busData,
                isUserInBus,
                canAccessQR: subscription.paymentStatus === 'paid' && subscription.status === 'active',
              };
            }
            
            // If bus doesn't exist, still show subscription with placeholder
            return {
              ...subscription,
              bus: {
                id: subscription.busId,
                busName: 'Bus Not Found',
                driverName: 'Unknown Driver',
                busLabel: 'N/A',
                locations: [],
                maxCapacity: 0,
                currentRiders: [],
                pricePerMonth: 0,
                pricePerRide: 0,
                operatingTimeFrom: '',
                operatingTimeTo: '',
                workingDays: {
                  monday: false,
                  tuesday: false,
                  wednesday: false,
                  thursday: false,
                  friday: false,
                  saturday: false,
                  sunday: false,
                }
              } as Bus,
              isUserInBus: false,
              canAccessQR: false,
            };
          } catch (error) {
            console.error(`Error fetching bus ${subscription.busId}:`, error);
            return {
              ...subscription,
              bus: undefined,
              isUserInBus: false,
              canAccessQR: false,
            };
          }
        })
      );
      
      console.log(`📱 Final subscriptions with bus data: ${subscriptionsWithBus.length}`);
      setSubscriptions(subscriptionsWithBus);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [userData?.uid]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSubscriptions();
    setRefreshing(false);
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleUnsubscribe = useCallback(async (subscription: SubscriptionWithBus) => {
    if (!userData?.uid) return;

    // Only allow unsubscribing from active subscriptions
    if (subscription.status !== 'active') {
      Alert.alert('Cannot Unsubscribe', 'This subscription is no longer active.');
      return;
    }

    Alert.alert(
      'Unsubscribe',
      `Are you sure you want to unsubscribe from ${subscription.bus?.busName || 'this bus route'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              await SubscriptionService.unsubscribeFromBus(userData.uid, subscription.busId);
              await fetchSubscriptions(); // Refresh the list
              Alert.alert('Success', 'Successfully unsubscribed from bus route');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unsubscribe');
            }
          }
        }
      ]
    );
  }, [userData?.uid, fetchSubscriptions]);

  const getStatusColor = (subscription: SubscriptionWithBus) => {
    // PRIORITY 1: Check if user was removed from bus (not in currentRiders)
    if (subscription.status === 'active' && !subscription.isUserInBus) {
      return colors.error; // Subscription ended by admin/system
    }

    // PRIORITY 2: Handle explicit unsubscribed status
    if (subscription.status === 'unsubscribed') {
      return colors.textSecondary;
    }

    // PRIORITY 3: Handle expired status
    if (subscription.status === 'expired') {
      return colors.error;
    }

    // PRIORITY 4: Handle monthly expiration (only if still in bus)
    if (subscription.isUserInBus && subscription.subscriptionType === 'monthly' && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      
      if (endDate < now) {
        return colors.error; // Expired
      } else if (endDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return colors.warning; // Expiring soon
      }
    }
    
    // PRIORITY 5: Payment status (only if still in bus)
    if (subscription.isUserInBus) {
      switch (subscription.paymentStatus) {
        case 'paid':
          return colors.success;
        case 'pending':
          return colors.warning;
        case 'unpaid':
          return colors.error;
        default:
          return colors.textSecondary;
      }
    }

    // Default for removed users
    return colors.error;
  };

  const getStatusText = (subscription: SubscriptionWithBus) => {
    // PRIORITY 1: Check if user was removed from bus (not in currentRiders)
    if (subscription.status === 'active' && !subscription.isUserInBus) {
      return 'Subscription Ended';
    }

    // PRIORITY 2: Handle returned users - show payment status
    if (subscription.status === 'active' && subscription.isUserInBus) {
      switch (subscription.paymentStatus) {
        case 'paid':
          return 'Active'; // Admin confirmed payment
        case 'pending':
          return 'Payment Pending'; // Waiting for admin confirmation
        case 'unpaid':
          return 'Payment Required'; // Admin marked as unpaid
        default:
          return 'Active';
      }
    }

    // PRIORITY 3: Handle explicit unsubscribed status
    if (subscription.status === 'unsubscribed') {
      return 'Unsubscribed';
    }

    // PRIORITY 4: Handle expired status
    if (subscription.status === 'expired') {
      return 'Expired';
    }

    // PRIORITY 5: Handle monthly expiration (only if still in bus)
    if (subscription.isUserInBus && subscription.subscriptionType === 'monthly' && subscription.endDate) {
      const endDate = new Date(subscription.endDate);
      const now = new Date();
      
      if (endDate < now) {
        return 'Expired';
      } else if (endDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return 'Expiring Soon';
      }
    }
    
    return 'Subscription Ended';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isSubscriptionActive = (subscription: SubscriptionWithBus) => {
    // Subscription is only truly active if user is still in the bus AND meets other criteria
    return subscription.isUserInBus && SubscriptionService.isSubscriptionActive(subscription);
  };

  const showQRCode = useCallback((subscription: SubscriptionWithBus) => {
    // Check if user is still in the bus first
    if (!subscription.isUserInBus) {
      Alert.alert(
        'QR Code Unavailable',
        'Your subscription has ended. QR code is no longer available.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Use the canAccessQR flag which checks both bus status and admin payment confirmation
    if (subscription.canAccessQR) {
      setQrModal({ visible: true, subscription });
    } else if (subscription.paymentStatus === 'pending') {
      Alert.alert(
        'Payment Pending',
        'Your payment is being reviewed by the administrator. QR code will be available once payment is confirmed.',
        [{ text: 'OK' }]
      );
    } else if (subscription.paymentStatus === 'unpaid') {
      Alert.alert(
        'Payment Required',
        'Please complete your payment. Contact the administrator for assistance.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'QR Code Unavailable',
        'QR code is only available for active, paid subscriptions.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const renderSubscriptionCard = ({ item: subscription }: { item: SubscriptionWithBus }) => {
    const statusColor = getStatusColor(subscription);
    const statusText = getStatusText(subscription);
    const isActive = isSubscriptionActive(subscription);
    const canShowQR = subscription.canAccessQR; // Use the new flag
    const canUnsubscribe = subscription.isUserInBus && subscription.status === 'active';
    const isEnded = !subscription.isUserInBus || subscription.status === 'unsubscribed';

    return (
      <View style={[
        styles.subscriptionCard,
        {
          backgroundColor: colors.surface,
          ...getThemeShadow(isDark, 'medium'),
          opacity: isEnded ? 0.7 : 1,
        }
      ]}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark || colors.primary]}
          style={styles.cardHeader}
        >
          <View style={styles.headerContent}>
            <View style={styles.busInfo}>
              <Text style={[styles.busName, { color: colors.textInverse }]}>
                {subscription.bus?.busName || 'Unknown Bus'}
              </Text>
              <Text style={[styles.busLabel, { color: colors.primaryLight || colors.textInverse }]}>
                {subscription.bus?.busLabel || ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={[styles.statusText, { color: colors.textInverse }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.cardContent}>
          {/* QR Code Section - Show for users in bus, highlight payment status */}
          {subscription.isUserInBus && subscription.status === 'active' && (
            <TouchableOpacity 
              style={styles.qrCodeSection}
              onPress={() => showQRCode(subscription)}
              disabled={!canShowQR}
            >
              <LinearGradient
                colors={isDark ? [colors.backgroundSecondary, colors.backgroundTertiary] : ['#f8fafc', '#e2e8f0']}
                style={[
                  styles.qrCodeContainer, 
                  { 
                    borderColor: canShowQR ? colors.success : colors.warning,
                    borderWidth: 2,
                    opacity: canShowQR ? 1 : 0.8,
                  }
                ]}
              >
                <Ionicons 
                  name="qr-code" 
                  size={32} 
                  color={canShowQR ? colors.success : colors.warning} 
                />
                <View style={styles.qrCodeText}>
                  <Text style={[styles.qrCodeTitle, { color: colors.text }]}>
                    Your Bus Pass
                  </Text>
                  <Text style={[styles.qrCodeSubtitle, { color: colors.textSecondary }]}>
                    {canShowQR 
                      ? 'Tap to show QR code' 
                      : subscription.paymentStatus === 'pending'
                        ? 'Payment being reviewed'
                        : 'Payment required'
                    }
                  </Text>
                </View>
                <Ionicons 
                  name={canShowQR ? "checkmark-circle" : "time"} 
                  size={20} 
                  color={canShowQR ? colors.success : colors.warning} 
                />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Payment Status Section for returned users */}
          {subscription.isUserInBus && subscription.status === 'active' && (
            <View style={[
              styles.paymentStatusSection, 
              { 
                backgroundColor: subscription.paymentStatus === 'paid' 
                  ? colors.success + '20' 
                  : subscription.paymentStatus === 'pending'
                    ? colors.warning + '20'
                    : colors.error + '20',
                borderColor: subscription.paymentStatus === 'paid' 
                  ? colors.success 
                  : subscription.paymentStatus === 'pending'
                    ? colors.warning
                    : colors.error
              }
            ]}>
              <Ionicons 
                name={subscription.paymentStatus === 'paid' 
                  ? "checkmark-circle" 
                  : subscription.paymentStatus === 'pending'
                    ? "time"
                    : "alert-circle"
                } 
                size={20} 
                color={subscription.paymentStatus === 'paid' 
                  ? colors.success 
                  : subscription.paymentStatus === 'pending'
                    ? colors.warning
                    : colors.error
                } 
              />
              <Text style={[
                styles.paymentStatusText, 
                { 
                  color: subscription.paymentStatus === 'paid' 
                    ? colors.success 
                    : subscription.paymentStatus === 'pending'
                      ? colors.warning
                      : colors.error
                }
              ]}>
                Payment Status: {subscription.paymentStatus === 'paid' 
                  ? 'Confirmed by Admin' 
                  : subscription.paymentStatus === 'pending'
                    ? 'Under Review'
                    : 'Required'
                }
              </Text>
            </View>
          )}

          {/* Subscription Details */}
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="card" size={16} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {subscription.subscriptionType === 'monthly' ? 'Monthly' : 'Per Ride'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash" size={16} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Price</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                ${subscription.subscriptionType === 'monthly' 
                  ? subscription.bus?.pricePerMonth || 0 
                  : subscription.bus?.pricePerRide || 0}
              </Text>
            </View>
          </View>

          {/* Bus Status */}
          <View style={styles.busStatusSection}>
            <View style={styles.busStatusItem}>
              <Ionicons 
                name={subscription.isUserInBus ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={subscription.isUserInBus ? colors.success : colors.error} 
              />
              <Text style={[
                styles.busStatusText, 
                { color: subscription.isUserInBus ? colors.success : colors.error }
              ]}>
                {subscription.isUserInBus ? 'Active on Bus' : 'Removed from Bus'}
              </Text>
            </View>
          </View>

          {/* Subscription Dates */}
          <View style={styles.dateSection}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                Subscribed: {formatDate(subscription.assignedAt)}
              </Text>
            </View>
            {subscription.unsubscribedAt && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color={colors.error} />
                <Text style={[styles.dateLabel, { color: colors.error }]}>
                  Unsubscribed: {formatDate(subscription.unsubscribedAt)}
                </Text>
              </View>
            )}
            {subscription.endDate && subscription.isUserInBus && subscription.status === 'active' && (
              <View style={styles.dateItem}>
                <Ionicons name="time" size={16} color={colors.textSecondary} />
                <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                  Expires: {formatDate(subscription.endDate)}
                </Text>
              </View>
            )}
          </View>

          {/* Driver Info */}
          <View style={styles.driverSection}>
            <Ionicons name="person" size={16} color={colors.textSecondary} />
            <Text style={[styles.driverText, { color: colors.textSecondary }]}>
              Driver: {subscription.bus?.driverName || 'Unknown'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <Ionicons name="bus" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyText, { color: colors.text }]}>
        No Subscriptions Yet
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Subscribe to bus routes to see them here
      </Text>
    </View>
  );

  if (loading && subscriptions.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your subscriptions...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={subscriptions}
        renderItem={renderSubscriptionCard}
        keyExtractor={(item) => `${item.busId}-${item.assignedAt}`}
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
        ListEmptyComponent={renderEmptyState}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        visible={qrModal.visible}
        userId={userData?.uid || ''}
        busId={qrModal.subscription?.busId || ''}
        busName={qrModal.subscription?.bus?.busName || ''}
        onClose={() => setQrModal({ visible: false, subscription: null })}
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
    paddingTop: AppSpacing.lg,
    paddingBottom: AppSpacing.md,
  },
  headerTitle: {
    fontSize: AppFontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  headerSubtitle: {
    fontSize: AppFontSizes.md,
    marginBottom: AppSpacing.md,
  },
  compactStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: AppBorderRadius.lg,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
  },
  statNumber: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: AppFontSizes.xs,
    marginTop: AppSpacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listContainer: {
    padding: AppSpacing.lg,
  },
  subscriptionCard: {
    borderRadius: AppBorderRadius.lg,
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
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  busLabel: {
    fontSize: AppFontSizes.sm,
    opacity: 0.9,
  },
  statusBadge: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.md,
  },
  statusText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  cardContent: {
    padding: AppSpacing.lg,
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.lg,
  },
  warningText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  qrCodeSection: {
    marginBottom: AppSpacing.lg,
  },
  qrCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
  },
  qrCodeText: {
    flex: 1,
    marginLeft: AppSpacing.md,
  },
  qrCodeTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: AppSpacing.xs,
  },
  qrCodeSubtitle: {
    fontSize: AppFontSizes.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: AppSpacing.md,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
    marginRight: AppSpacing.xs,
  },
  detailValue: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  busStatusSection: {
    marginBottom: AppSpacing.md,
  },
  busStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busStatusText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  dateSection: {
    marginBottom: AppSpacing.md,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.xs,
  },
  dateLabel: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  driverText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
  },
  qrButtonText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.xs,
  },
  unsubscribeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
  },
  unsubscribeButtonText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
  },
  emptyText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: AppFontSizes.md,
    marginTop: AppSpacing.md,
  },
  paymentStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.lg,
  },
  paymentStatusText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
    flex: 1,
  },
}); 