import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
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
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    subscription: SubscriptionWithBus | null;
  }>({ visible: false, subscription: null });

  const fetchSubscriptions = useCallback(async () => {
    if (!userData?.uid) return;

    try {
      setLoading(true);
      
      // ✅ Clean up any old busAssignments data (one-time cleanup)
      await SubscriptionService.cleanupUserBusAssignments(userData.uid);
      
      // ✅ Get subscriptions by searching all buses' currentRiders
      const subscriptions = await SubscriptionService.getUserSubscriptions(userData.uid);
      
      console.log(`📱 Fetched ${subscriptions.length} subscriptions from currentRiders only`);
      
      // Fetch bus details for each subscription
      const subscriptionsWithBus = await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            const busRef = doc(db, 'buses', subscription.busId);
            const busDoc = await getDoc(busRef);
            
            if (busDoc.exists()) {
              const busData = { id: busDoc.id, ...busDoc.data() } as Bus;
              
              console.log(`🚌 Bus ${busData.busName}:`, {
                subscriptionStatus: subscription.status, // active or inactive
                paymentStatus: subscription.paymentStatus,
                canAccessQR: subscription.status === 'active'
              });
              
              return {
                ...subscription,
                bus: busData,
                isUserInBus: true, // Always true since data comes from currentRiders
                canAccessQR: subscription.status === 'active' // ✅ active status means paid
              };
            }
            
            return null; // Skip if bus doesn't exist
          } catch (error) {
            console.error(`Error fetching bus ${subscription.busId}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null entries
      const validSubscriptions = subscriptionsWithBus.filter(sub => sub !== null);
      
      console.log(`📱 Final subscriptions from currentRiders only: ${validSubscriptions.length}`);
      setSubscriptions(validSubscriptions);
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

  const handleCancelSubscription = useCallback(async (subscription: SubscriptionWithBus) => {
    console.log('🔥 CANCEL BUTTON PRESSED - Starting cancel process');
    console.log('🔥 User ID:', userData?.uid);
    console.log('🔥 Subscription:', subscription);
    
    if (!userData?.uid) {
      console.log('❌ No user data found');
      return;
    }

    // Only allow canceling pending subscriptions
    if (subscription.paymentStatus !== 'pending') {
      console.log('❌ Cannot cancel - payment status is:', subscription.paymentStatus);
      Alert.alert(
        'Cannot Cancel', 
        subscription.paymentStatus === 'paid' 
          ? 'Cannot cancel confirmed subscriptions. Contact support if needed.'
          : 'This subscription cannot be canceled.'
      );
      return;
    }

    console.log('✅ Payment status is pending, showing confirmation modal');
    
    // Show custom modal instead of Alert.alert for web compatibility
    setCancelModal({ visible: true, subscription });
  }, [userData?.uid]);

  const confirmCancelSubscription = useCallback(async () => {
    if (!userData?.uid || !cancelModal.subscription) return;
    
    console.log('🔥 User confirmed cancellation, calling SubscriptionService...');
    
    try {
      // Use the new cancelPendingSubscription method
      await SubscriptionService.cancelPendingSubscription(userData.uid, cancelModal.subscription.busId);
      console.log('✅ SubscriptionService.cancelPendingSubscription completed successfully');
      
      setCancelModal({ visible: false, subscription: null });
      
      await fetchSubscriptions(); // Refresh the list
      console.log('✅ fetchSubscriptions completed, showing success alert');
      
      Alert.alert(
        'Subscription Canceled', 
        'Your pending subscription has been completely removed. You can subscribe again anytime.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Error in cancel process:', error);
      setCancelModal({ visible: false, subscription: null });
      Alert.alert('Error', error.message || 'Failed to cancel subscription');
    }
  }, [userData?.uid, cancelModal.subscription, fetchSubscriptions]);

  const handleUnsubscribe = useCallback(async (subscription: SubscriptionWithBus) => {
    if (!userData?.uid) return;

    // ✅ FIXED: Only allow unsubscribing from active subscriptions
    if (subscription.status !== 'active') {
      Alert.alert('Cannot Unsubscribe', 'This subscription is not active.');
      return;
    }

    Alert.alert(
      'Unsubscribe',
      `Are you sure you want to unsubscribe from ${subscription.bus?.busName || 'this bus route'}?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Unsubscribe',
          style: 'destructive',
          onPress: async () => {
            try {
              await SubscriptionService.unsubscribeFromBus(userData.uid, subscription.busId);
              await fetchSubscriptions(); // Refresh the list
              Alert.alert('Success', 'Successfully unsubscribed from bus route');
            } catch (error: any) {
              console.error('Error unsubscribing:', error);
              Alert.alert('Error', error.message || 'Failed to unsubscribe');
            }
          }
        }
      ]
    );
  }, [userData?.uid, fetchSubscriptions]);

  const getStatusColor = (subscription: SubscriptionWithBus) => {
    // ✅ FIXED: Color based on both status and payment
    if (subscription.status === 'inactive') {
      return colors.textSecondary; // Gray for unsubscribed
    }
    
    if (subscription.status === 'active') {
      switch (subscription.paymentStatus) {
        case 'paid':
          return colors.success; // Green for paid
        case 'pending':
          return colors.warning; // Orange for pending
        case 'unpaid':
          return colors.error; // Red for unpaid
        default:
          return colors.success;
      }
    }
    
    return colors.textSecondary;
  };

  const getStatusText = (subscription: SubscriptionWithBus) => {
    // ✅ FIXED: Status logic based on subscription status and payment status
    if (subscription.status === 'inactive') {
      return 'Unsubscribed';
    }
    
    if (subscription.status === 'active') {
      switch (subscription.paymentStatus) {
        case 'paid':
          return 'Active';
        case 'pending':
          return 'Pending Payment';
        case 'unpaid':
          return 'Payment Required';
        default:
          return 'Active';
      }
    }
    
    return subscription.status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isSubscriptionActive = (subscription: SubscriptionWithBus) => {
    // ✅ FIXED: Active means subscribed (regardless of payment)
    return subscription.status === 'active';
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

  const getSubscribedLocation = (subscription: SubscriptionWithBus) => {
    if (!subscription.locationId || !subscription.bus?.locations) {
      return null;
    }

    // Find the location by name (locationId contains the location name)
    const location = subscription.bus.locations.find(loc => loc.name === subscription.locationId);
    return location;
  };

  const renderSubscriptionCard = ({ item: subscription }: { item: SubscriptionWithBus }) => {
    const statusColor = getStatusColor(subscription);
    const statusText = getStatusText(subscription);
    const isActive = isSubscriptionActive(subscription);
    const canShowQR = subscription.canAccessQR;
    
    // FIXED: Allow canceling pending subscriptions regardless of isUserInBus status
    const canCancel = subscription.status === 'active' && subscription.paymentStatus === 'pending';
    
    // UPDATED: Prevent unsubscribing when payment is confirmed (paid)
    // Only allow unsubscribing for unpaid subscriptions - paid subscriptions can only be removed by admin
    const canUnsubscribe = subscription.isUserInBus && 
                          subscription.status === 'active' && 
                          subscription.paymentStatus === 'unpaid'; // Changed from 'paid' to 'unpaid'
    
    const isEnded = !subscription.isUserInBus || subscription.status === 'unsubscribed';

    // Add debugging logs
    console.log('🔥 RENDER SUBSCRIPTION CARD DEBUG:', {
      busName: subscription.bus?.busName,
      status: subscription.status,
      paymentStatus: subscription.paymentStatus,
      isUserInBus: subscription.isUserInBus,
      canCancel,
      canUnsubscribe
    });

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

          {/* Subscribed Location Section */}
          {subscription.locationId && (
            <View style={styles.locationSection}>
              <View style={styles.locationHeader}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={[styles.locationTitle, { color: colors.text }]}>
                  Your Subscribed Location
                </Text>
              </View>
              {(() => {
                const subscribedLocation = getSubscribedLocation(subscription);
                if (subscribedLocation) {
                  return (
                    <View style={[
                      styles.locationCard, 
                      { 
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.primary + '30'
                      }
                    ]}>
                      <View style={styles.locationInfo}>
                        <Text style={[styles.locationName, { color: colors.text }]}>
                          {subscribedLocation.name}
                        </Text>
                        {subscribedLocation.address && (
                          <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
                            {subscribedLocation.address.city}, {subscribedLocation.address.governorate}
                          </Text>
                        )}
                      </View>
                      <View style={styles.locationDetails}>
                        <View style={styles.locationDetailItem}>
                          <Ionicons name="time" size={14} color={colors.textSecondary} />
                          <Text style={[styles.locationDetailText, { color: colors.textSecondary }]}>
                            Arrival: {subscribedLocation.arrivalTimeFrom} - {subscribedLocation.arrivalTimeTo}
                          </Text>
                        </View>
                        <View style={styles.locationDetailItem}>
                          <Ionicons name="navigate" size={14} color={colors.textSecondary} />
                          <Text style={[styles.locationDetailText, { color: colors.textSecondary }]}>
                            Stop #{subscribedLocation.order + 1}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                } else {
                  return (
                    <View style={[
                      styles.locationCard, 
                      { 
                        backgroundColor: colors.error + '10',
                        borderColor: colors.error + '30'
                      }
                    ]}>
                      <Text style={[styles.locationName, { color: colors.error }]}>
                        {subscription.locationId}
                      </Text>
                      <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
                        Location details not found
                      </Text>
                    </View>
                  );
                }
              })()}
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

          {/* Action Buttons */}
          {(canCancel || canUnsubscribe) && (
            <View style={styles.actionButtons}>
              {canCancel && (
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: colors.warning,
                      borderColor: colors.warning,
                    }
                  ]}
                  onPress={() => handleCancelSubscription(subscription)}
                >
                  <Ionicons name="close-circle" size={16} color={colors.textInverse} />
                  <Text style={[styles.cancelButtonText, { color: colors.textInverse }]}>
                    Cancel Subscription
                  </Text>
                </TouchableOpacity>
              )}
              
              {canUnsubscribe && (
                <TouchableOpacity
                  style={[
                    styles.unsubscribeButton,
                    {
                      backgroundColor: 'transparent',
                      borderColor: colors.error,
                    }
                  ]}
                  onPress={() => handleUnsubscribe(subscription)}
                >
                  <Ionicons name="exit" size={16} color={colors.error} />
                  <Text style={[styles.unsubscribeButtonText, { color: colors.error }]}>
                    Unsubscribe
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Updated Status Info for Non-Actionable Subscriptions */}
          {!canCancel && !canUnsubscribe && subscription.isUserInBus && subscription.status === 'active' && (
            <View style={[
              styles.statusInfoSection,
              {
                backgroundColor: subscription.paymentStatus === 'paid' 
                  ? colors.success + '10' 
                  : subscription.paymentStatus === 'unpaid' 
                    ? colors.error + '10' 
                    : colors.backgroundSecondary,
                borderColor: subscription.paymentStatus === 'paid' 
                  ? colors.success + '30' 
                  : subscription.paymentStatus === 'unpaid' 
                    ? colors.error + '30' 
                    : colors.border,
              }
            ]}>
              <Ionicons 
                name={subscription.paymentStatus === 'paid' 
                  ? "shield-checkmark" 
                  : subscription.paymentStatus === 'unpaid' 
                    ? "alert-circle" 
                    : "information-circle"
                } 
                size={16} 
                color={subscription.paymentStatus === 'paid' 
                  ? colors.success 
                  : subscription.paymentStatus === 'unpaid' 
                    ? colors.error 
                    : colors.textSecondary
                } 
              />
              <Text style={[
                styles.statusInfoText, 
                { 
                  color: subscription.paymentStatus === 'paid' 
                    ? colors.success 
                    : subscription.paymentStatus === 'unpaid' 
                      ? colors.error 
                      : colors.textSecondary 
                }
              ]}>
                {subscription.paymentStatus === 'paid' 
                  ? 'Payment confirmed - Only admin can remove this subscription'
                  : subscription.paymentStatus === 'unpaid' 
                    ? 'Payment required - Contact administrator'
                    : 'Subscription management unavailable'
                }
              </Text>
            </View>
          )}
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

      {/* Cancel Subscription Modal */}
      <Modal
        visible={cancelModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModal({ visible: false, subscription: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color={colors.warning} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Cancel Subscription
              </Text>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={[styles.modalMessage, { color: colors.text }]}>
                Are you sure you want to cancel your pending subscription to{' '}
                <Text style={{ fontWeight: 'bold' }}>
                  {cancelModal.subscription?.bus?.busName || 'this bus route'}
                </Text>
                ?
              </Text>
              
              <Text style={[styles.modalWarning, { color: colors.textSecondary }]}>
                This will completely remove your subscription and cannot be undone. You will need to subscribe again if you change your mind.
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { borderColor: colors.border }
                ]}
                onPress={() => {
                  console.log('🔥 User chose to keep subscription');
                  setCancelModal({ visible: false, subscription: null });
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                  Keep Subscription
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  { backgroundColor: colors.error }
                ]}
                onPress={confirmCancelSubscription}
              >
                <Text style={[styles.modalButtonText, { color: colors.textInverse }]}>
                  Yes, Cancel It
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  locationSection: {
    marginBottom: AppSpacing.lg,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  locationTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  locationCard: {
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
  },
  locationInfo: {
    marginBottom: AppSpacing.sm,
  },
  locationName: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  locationAddress: {
    fontSize: AppFontSizes.sm,
  },
  locationDetails: {
    gap: AppSpacing.xs,
  },
  locationDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationDetailText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.xs,
  },
  statusInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginTop: AppSpacing.md,
  },
  statusInfoText: {
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.lg,
  },
  modalContainer: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.xl,
    maxWidth: 400,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  modalTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.sm,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: AppSpacing.xl,
  },
  modalMessage: {
    fontSize: AppFontSizes.md,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: AppSpacing.md,
  },
  modalWarning: {
    fontSize: AppFontSizes.sm,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: AppSpacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalConfirmButton: {
    // backgroundColor will be set dynamically
  },
  modalButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
}); 