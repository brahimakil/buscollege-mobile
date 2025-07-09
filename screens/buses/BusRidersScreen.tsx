import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';
import { SubscriptionService } from '../../services/SubscriptionService';

const { width, height } = Dimensions.get('window');

interface RiderData {
  uid: string;
  email: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  profilePicture?: string;
  subscriptionStatus: 'active' | 'inactive' | 'pending';
  subscriptionType: 'monthly' | 'per-ride';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  totalRides: number;
  lastRideDate?: string;
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  joinedDate: string;
  isCurrentRider: boolean;
  isSubscriber: boolean;
  busAssignments?: any[];
  qrCode?: string;
}

interface BusRiderObject {
  id: string;
  email: string;
  name: string;
  paymentStatus: string;
  subscriptionType: string;
}

interface BusData {
  id: string;
  busName: string;
  busLabel: string;
  maxCapacity: number;
  currentRiders: Array<{
    id: string;
    email: string;
    name: string;
    paymentStatus: 'paid' | 'unpaid' | 'pending';
    status: 'active' | 'inactive';
    subscriptionType: 'monthly' | 'per_ride';
    // ... other fields
  }>;
  // ✅ REMOVED: subscribers array no longer exists
  pricePerMonth: number;
  pricePerRide: number;
  driverId: string;
}

export const BusRidersScreen: React.FC = () => {
  const { busId } = useLocalSearchParams<{ busId: string }>();
  const { userData } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
  const [bus, setBus] = useState<BusData | null>(null);
  const [riders, setRiders] = useState<RiderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQRCode, setSelectedQRCode] = useState<{ qrCode: string; riderName: string } | null>(null);
  const [selectedRider, setSelectedRider] = useState<RiderData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBusAndRiders = useCallback(async (options: { background?: boolean } = {}) => {
    if (!options.background) {
      setLoading(true);
    }
    setError(null);

    try {
      console.log('🚌 Fetching bus and riders for:', busId);

      // Fetch bus data
      const busDoc = await getDoc(doc(db, 'buses', busId));
      if (!busDoc.exists()) {
        setError('Bus not found');
        return;
      }

      const busData = { id: busDoc.id, ...busDoc.data() } as BusData;
      
      // Verify this bus belongs to the current driver
      if (busData.driverId !== userData.uid) {
        setError('You are not authorized to view this bus');
        return;
      }

      setBus(busData);

      console.log('🚌 Bus data structure:', {
        currentRiders: busData.currentRiders,
        currentRidersType: Array.isArray(busData.currentRiders) ? 'array' : typeof busData.currentRiders,
        currentRidersLength: busData.currentRiders?.length || 0,
        firstRider: busData.currentRiders?.[0]
      });

      // ✅ FIXED: Process currentRiders directly (no more subscribers array)
      const processedRiders: RiderData[] = [];
      
      if (busData.currentRiders && Array.isArray(busData.currentRiders)) {
        for (const riderObj of busData.currentRiders) {
          try {
            // Get additional user info
            const userRef = doc(db, 'users', riderObj.id);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              const riderData: RiderData = {
                uid: riderObj.id,
                email: riderObj.email || userData.email,
                name: riderObj.name || userData.name,
                phoneNumber: userData.phoneNumber,
                address: userData.address,
                profilePicture: userData.profilePicture,
                
                // ✅ Use data from currentRiders
                subscriptionStatus: riderObj.status === 'active' ? 'active' : 'inactive',
                subscriptionType: riderObj.subscriptionType || 'monthly',
                subscriptionStartDate: riderObj.startDate || riderObj.assignedAt,
                subscriptionEndDate: riderObj.endDate,
                paymentStatus: riderObj.paymentStatus,
                
                totalRides: 0, // This would need to be tracked separately
                lastRideDate: undefined,
                joinedDate: riderObj.assignedAt || new Date().toISOString(),
                isCurrentRider: riderObj.status === 'active',
                isSubscriber: riderObj.status === 'active' && riderObj.paymentStatus === 'paid',
                qrCode: riderObj.qrCode,
                
                emergencyContact: userData.emergencyContact ? {
                  name: userData.emergencyContact.name || '',
                  phone: userData.emergencyContact.phone || '',
                  relationship: userData.emergencyContact.relationship || ''
                } : undefined
              };
              
              processedRiders.push(riderData);
            }
          } catch (userError) {
            console.error(`Error fetching user data for ${riderObj.id}:`, userError);
          }
        }
      }

      setRiders(processedRiders);
      console.log(`✅ Loaded ${processedRiders.length} riders from currentRiders`);

    } catch (error: any) {
      console.error('❌ Error fetching bus riders:', error);
      setError('Failed to load riders. Please try again.');
    } finally {
      if (!options.background) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [busId, userData?.uid]);

  useEffect(() => {
    fetchBusAndRiders();
  }, [fetchBusAndRiders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBusAndRiders();
  }, [fetchBusAndRiders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'pending': return colors.warning;
      case 'inactive': return colors.textSecondary;
      case 'overdue': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'unpaid': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'unpaid': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const handleCallRider = async (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This rider has no phone number on file.');
      return;
    }
    
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Cannot Open Phone', 'Unable to open phone app on this device.');
      }
    } catch (error) {
      console.error('Error opening phone app:', error);
      Alert.alert('Error', 'Failed to open phone app.');
    }
  };

  const handleEmailRider = async (email: string) => {
    if (!email) {
      Alert.alert('No Email', 'This rider has no email address.');
      return;
    }
    
    try {
      // Try Gmail first, then fallback to default mail app
      const gmailUrl = `googlegmail://co?to=${email}`;
      const mailtoUrl = `mailto:${email}`;
      
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      
      if (canOpenGmail) {
        await Linking.openURL(gmailUrl);
      } else {
        const canOpenMail = await Linking.canOpenURL(mailtoUrl);
        if (canOpenMail) {
          await Linking.openURL(mailtoUrl);
        } else {
          Alert.alert('Cannot Open Email', 'No email app found on this device.');
        }
      }
    } catch (error) {
      console.error('Error opening email app:', error);
      Alert.alert('Error', 'Failed to open email app.');
    }
  };

  const handleViewQRCode = (qrCode: string, riderName: string) => {
    setSelectedQRCode({ qrCode, riderName });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/buses/my-buses');
    }
  };

  const handleRemoveRider = async (rider: RiderData) => {
    // Optimistic UI update
    setRiders(prevRiders => prevRiders.filter(r => r.uid !== rider.uid));
    
    setActionLoading(true);
    try {
      // Only update the bus document
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (!busDoc.exists()) {
        throw new Error('Bus not found');
      }

      const busData = busDoc.data();
      const currentRiders = busData.currentRiders || [];
      
      // Remove rider from currentRiders array
      const updatedRiders = currentRiders.filter((r: any) => r.id !== rider.uid);
      
      await updateDoc(busRef, {
        currentRiders: updatedRiders,
        updatedAt: new Date().toISOString()
      });

      // Update bus state to reflect changes
      if (bus) {
        setBus({
          ...bus,
          currentRiders: updatedRiders
        });
      }

      Alert.alert('Success', `${rider.name} has been removed from the bus.`);
      setShowRemoveModal(false);
      setSelectedRider(null);
      
      // Don't refresh the list - rely on the optimistic UI update
    } catch (error: any) {
      // Revert optimistic UI update on error
      fetchBusAndRiders();
      console.error('Error removing rider:', error);
      Alert.alert('Error', 'Failed to remove rider. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (rider: RiderData, newStatus: 'paid' | 'unpaid' | 'pending') => {
    // Optimistic UI update
    setRiders(prevRiders => 
      prevRiders.map(r => 
        r.uid === rider.uid ? { ...r, paymentStatus: newStatus } : r
      )
    );
    
    setActionLoading(true);
    try {
      // ✅ NEW: Use SubscriptionService for consistent updates
      await SubscriptionService.updatePaymentStatus(rider.uid, busId, newStatus);

      // Update local state
      if (bus) {
        const updatedRiders = bus.currentRiders.map((r: any) => {
          if (r.id === rider.uid) {
            return { ...r, paymentStatus: newStatus };
          }
          return r;
        });

        setBus({
          ...bus,
          currentRiders: updatedRiders
          // ✅ REMOVED: No more subscribers array
        });
      }

      console.log(`✅ Payment status updated to ${newStatus} for ${rider.name}`);

      Alert.alert(
        'Success', 
        `Payment status updated to ${newStatus} for ${rider.name}`
      );
      
      setShowPaymentModal(false);
      setSelectedRider(null);
      
      // Refresh data
      setTimeout(() => {
        fetchBusAndRiders({ background: true });
      }, 500);
      
    } catch (error: any) {
      // Revert UI update on error
      setRiders(prevRiders => 
        prevRiders.map(r => 
          r.uid === rider.uid ? { ...r, paymentStatus: rider.paymentStatus } : r
        )
      );
      
      console.error('Error updating payment status:', error);
      Alert.alert('Error', 'Failed to update payment status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const debugBusData = useCallback(async () => {
    try {
      const busRef = doc(db, 'buses', busId);
      const busDoc = await getDoc(busRef);
      
      if (busDoc.exists()) {
        const busData = busDoc.data();
        console.log('🔍 CURRENT BUS DATA STRUCTURE:', {
          busName: busData.busName,
          subscribers: busData.subscribers,
          subscribersType: Array.isArray(busData.subscribers) ? 'array' : typeof busData.subscribers,
          subscribersLength: busData.subscribers?.length || 0,
          paidSubscribers: busData.subscribers?.filter((s: any) => s.paymentStatus === 'paid').length || 0
        });
      }
    } catch (error) {
      console.error('Error debugging bus data:', error);
    }
  }, [busId]);

  // Call this after payment status updates
  useEffect(() => {
    if (bus) {
      debugBusData();
    }
  }, [bus, debugBusData]);

  const renderQRCodeModal = () => {
    if (!selectedQRCode) return null;

    let qrValue = selectedQRCode.qrCode;
    
    // Try to parse if it's a JSON string
    try {
      const parsed = JSON.parse(selectedQRCode.qrCode);
      qrValue = JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, use as is
      qrValue = selectedQRCode.qrCode;
    }

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedQRCode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                QR Code - {selectedQRCode.riderName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedQRCode(null)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContainer}>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={selectedQRCode.qrCode}
                  size={200}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
              </View>
              
             
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRiderCard = (rider: RiderData) => {
    // Get dynamic styling based on payment status
    const getPaymentSectionStyle = (status: string) => {
      const baseStyle = {
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.md,
        borderWidth: 2,
      };

      switch (status) {
        case 'paid':
          return {
            ...baseStyle,
            backgroundColor: colors.success + '10',
            borderColor: colors.success + '40',
          };
        case 'pending':
          return {
            ...baseStyle,
            backgroundColor: colors.warning + '10',
            borderColor: colors.warning + '40',
          };
        case 'unpaid':
          return {
            ...baseStyle,
            backgroundColor: colors.error + '10',
            borderColor: colors.error + '40',
          };
        default:
          return {
            ...baseStyle,
            backgroundColor: colors.textSecondary + '10',
            borderColor: colors.textSecondary + '40',
          };
      }
    };

    const getCardStyle = (status: string) => {
      const baseStyle = {
        borderRadius: AppBorderRadius.lg,
        padding: AppSpacing.lg,
        marginBottom: AppSpacing.md,
        borderLeftWidth: 4,
      };

      switch (status) {
        case 'paid':
          return {
            ...baseStyle,
            backgroundColor: colors.card,
            borderLeftColor: colors.success,
          };
        case 'pending':
          return {
            ...baseStyle,
            backgroundColor: colors.card,
            borderLeftColor: colors.warning,
          };
        case 'unpaid':
          return {
            ...baseStyle,
            backgroundColor: colors.card,
            borderLeftColor: colors.error,
          };
        default:
          return {
            ...baseStyle,
            backgroundColor: colors.card,
            borderLeftColor: colors.textSecondary,
          };
      }
    };

    const getPaymentMessage = (status: string) => {
      switch (status) {
        case 'paid':
          return {
            message: '✅ Payment completed successfully',
            color: colors.success,
          };
        case 'pending':
          return {
            message: '⏳ Payment is being processed',
            color: colors.warning,
          };
        case 'unpaid':
          return {
            message: '❌ Payment required',
            color: colors.error,
          };
        default:
          return {
            message: '❓ Payment status unknown',
            color: colors.textSecondary,
          };
      }
    };

    const paymentMessage = getPaymentMessage(rider.paymentStatus);

    return (
      <View
        key={rider.uid}
        style={[
          getCardStyle(rider.paymentStatus),
          {
            ...getThemeShadow(isDark, 'sm'),
          }
        ]}
      >
        {/* Rider Header */}
        <View style={styles.riderHeader}>
          <View style={styles.riderInfo}>
            <Text style={[styles.riderName, { color: colors.text }]}>
              {rider.name}
            </Text>
            <Text style={[styles.riderEmail, { color: colors.textSecondary }]}>
              {rider.email}
            </Text>
            {rider.phoneNumber && (
              <Text style={[styles.riderPhone, { color: colors.textSecondary }]}>
                📞 {rider.phoneNumber}
              </Text>
            )}
            {rider.address && (
              <Text style={[styles.riderAddress, { color: colors.textSecondary }]}>
                📍 {rider.address}
              </Text>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            {rider.isCurrentRider && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  On Bus
                </Text>
              </View>
            )}
            {rider.isSubscriber && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="card" size={16} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  Subscriber
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* DYNAMIC Payment Status Section */}
        <View style={getPaymentSectionStyle(rider.paymentStatus)}>
          <View style={styles.paymentHeader}>
            <Ionicons 
              name={getPaymentStatusIcon(rider.paymentStatus)} 
              size={28} 
              color={getPaymentStatusColor(rider.paymentStatus)} 
            />
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentLabel, { color: colors.text }]}>
                Payment Status
              </Text>
              <Text style={[styles.paymentMessage, { color: paymentMessage.color }]}>
                {paymentMessage.message}
              </Text>
            </View>
            <View style={[
              styles.paymentBadge, 
              { backgroundColor: getPaymentStatusColor(rider.paymentStatus) }
            ]}>
              <Text style={[styles.paymentStatus, { color: 'white' }]}>
                {rider.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* CONDITIONAL: Show different content based on payment status */}
        {rider.paymentStatus === 'unpaid' && (
          <View style={[styles.urgentNotice, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <Text style={[styles.urgentText, { color: colors.error }]}>
              Payment overdue - Please follow up with rider
            </Text>
          </View>
        )}

        {rider.paymentStatus === 'pending' && (
          <View style={[styles.infoNotice, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.warning }]}>
              Payment processing - Check back later
            </Text>
          </View>
        )}

        {rider.paymentStatus === 'paid' && (
          <View style={[styles.successNotice, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>
              All payments up to date
            </Text>
          </View>
        )}

        {/* Subscription Info */}
        <View style={styles.subscriptionInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="card" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {rider.subscriptionType === 'monthly' ? 'Monthly Plan' : 'Per Ride'}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(rider.subscriptionStatus) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(rider.subscriptionStatus) }]}>
              {rider.subscriptionStatus}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="bus" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Bus Assignments: {rider.busAssignments?.length || 0}
            </Text>
          </View>

          {rider.lastRideDate && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Last Activity: {formatDate(rider.lastRideDate)}
              </Text>
            </View>
          )}

          {rider.subscriptionStartDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Started: {formatDate(rider.subscriptionStartDate)}
              </Text>
            </View>
          )}
        </View>


        {/* DYNAMIC Action Buttons - Different based on payment status */}
        <View style={styles.actionButtons}>
          {rider.phoneNumber && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
              onPress={() => handleCallRider(rider.phoneNumber)}
            >
              <Ionicons name="call" size={16} color={colors.success} />
              <Text style={[styles.actionButtonText, { color: colors.success }]}>
                Call
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
            onPress={() => handleEmailRider(rider.email)}
          >
            <Ionicons name="mail" size={16} color={colors.info} />
            <Text style={[styles.actionButtonText, { color: colors.info }]}>
              Email
            </Text>
          </TouchableOpacity>

          {rider.qrCode && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleViewQRCode(rider.qrCode!, rider.name)}
            >
              <Ionicons name="qr-code" size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                QR Code
              </Text>
            </TouchableOpacity>
          )}

          {/* DYNAMIC: Payment button changes based on status */}
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { 
                backgroundColor: getPaymentStatusColor(rider.paymentStatus) + '20',
                borderWidth: 1,
                borderColor: getPaymentStatusColor(rider.paymentStatus) + '40'
              }
            ]}
            onPress={() => {
              setSelectedRider(rider);
              setShowPaymentModal(true);
            }}
          >
            <Ionicons name="card" size={16} color={getPaymentStatusColor(rider.paymentStatus)} />
            <Text style={[styles.actionButtonText, { color: getPaymentStatusColor(rider.paymentStatus) }]}>
              {rider.paymentStatus === 'paid' ? 'Paid ✓' : 
               rider.paymentStatus === 'pending' ? 'Pending...' : 'Unpaid !'}
            </Text>
          </TouchableOpacity>

          {/* Remove Rider Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
            onPress={() => {
              setSelectedRider(rider);
              setShowRemoveModal(true);
            }}
          >
            <Ionicons name="person-remove" size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // NEW: Payment Status Modal
  const renderPaymentModal = () => {
    if (!selectedRider || !showPaymentModal) return null;

    return (
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Update Payment Status
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {selectedRider.name}
            </Text>

            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  { backgroundColor: colors.success + '20', borderColor: colors.success }
                ]}
                onPress={() => handleUpdatePaymentStatus(selectedRider, 'paid')}
                disabled={actionLoading}
              >
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={[styles.paymentOptionText, { color: colors.success }]}>Paid</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  { backgroundColor: colors.warning + '20', borderColor: colors.warning }
                ]}
                onPress={() => handleUpdatePaymentStatus(selectedRider, 'pending')}
                disabled={actionLoading}
              >
                <Ionicons name="time" size={24} color={colors.warning} />
                <Text style={[styles.paymentOptionText, { color: colors.warning }]}>Pending</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  { backgroundColor: colors.error + '20', borderColor: colors.error }
                ]}
                onPress={() => handleUpdatePaymentStatus(selectedRider, 'unpaid')}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
                <Text style={[styles.paymentOptionText, { color: colors.error }]}>Unpaid</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.textSecondary + '20' }]}
              onPress={() => setShowPaymentModal(false)}
              disabled={actionLoading}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            {actionLoading && (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>
                  Updating...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // NEW: Remove Rider Modal
  const renderRemoveModal = () => {
    if (!selectedRider || !showRemoveModal) return null;

    return (
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning" size={48} color={colors.error} style={styles.warningIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Remove Rider
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Are you sure you want to remove {selectedRider.name} from this bus?
            </Text>
            <Text style={[styles.modalWarning, { color: colors.error }]}>
              This action will deactivate their subscription and remove them from the current riders list.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={() => handleRemoveRider(selectedRider)}
                disabled={actionLoading}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                  {actionLoading ? 'Removing...' : 'Remove'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.textSecondary + '20' }]}
                onPress={() => setShowRemoveModal(false)}
                disabled={actionLoading}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {actionLoading && (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus (e.g., when navigating back from dashboard)
      fetchBusAndRiders({ background: true });
    }, [fetchBusAndRiders])
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading all riders...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchBusAndRiders}
        >
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentRiders = riders.filter(r => r.isCurrentRider);
  const paidSubscribers = riders.filter(r => r.paymentStatus === 'paid');
  const allRiders = riders;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.textInverse }]}>
              All Riders
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textInverse }]}>
              {bus?.busName || 'Bus'} - {bus?.busLabel || ''}
            </Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {paidSubscribers.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Paid Subscribers
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.info }]}>
              {allRiders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Riders
            </Text>
          </View>
        </View>

        {/* Content */}
        {allRiders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No riders found
            </Text>
            <Text style={[styles.emptyStateMessage, { color: colors.textSecondary }]}>
              No riders are associated with this bus yet. Check the console for debugging information.
            </Text>
          </View>
        ) : (
          <View style={styles.ridersContainer}>
            {allRiders.map(renderRiderCard)}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      {renderQRCodeModal()}
      {renderPaymentModal()}
      {renderRemoveModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    padding: AppSpacing.xl,
  },
  errorTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.lg,
    paddingTop: AppSpacing.xl,
  },
  backButton: {
    marginRight: AppSpacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  headerSubtitle: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    marginHorizontal: AppSpacing.lg,
    marginBottom: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  statLabel: {
    fontSize: AppFontSizes.sm,
  },
  ridersContainer: {
    padding: AppSpacing.lg,
  },
  riderCard: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  riderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: AppSpacing.md,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  riderEmail: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.xs,
  },
  riderPhone: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.xs,
  },
  riderAddress: {
    fontSize: AppFontSizes.sm,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: AppSpacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.full,
    gap: AppSpacing.xs,
  },
  badgeText: {
    fontSize: AppFontSizes.xs,
    fontWeight: '600',
  },
  paymentSection: {
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.md,
    borderWidth: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  paymentMessage: {
    fontSize: AppFontSizes.sm,
    marginTop: AppSpacing.xs,
    fontStyle: 'italic',
  },
  paymentBadge: {
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.full,
  },
  paymentStatus: {
    fontSize: AppFontSizes.sm,
    fontWeight: 'bold',
    color: 'white',
  },
  subscriptionInfo: {
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: AppSpacing.sm,
  },
  statusText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  emergencyContact: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.md,
  },
  emergencyTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  emergencyText: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.md,
    gap: AppSpacing.xs,
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xl,
    minHeight: 300,
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
    lineHeight: 22,
  },
  // QR Code Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  modalTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    padding: AppSpacing.sm,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodeWrapper: {
    padding: AppSpacing.lg,
    backgroundColor: 'white',
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.lg,
  },
  qrDataContainer: {
    width: '100%',
    maxHeight: 200,
  },
  qrDataTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginBottom: AppSpacing.sm,
  },
  qrDataScroll: {
    maxHeight: 150,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: AppBorderRadius.sm,
    padding: AppSpacing.sm,
  },
  qrDataText: {
    fontSize: AppFontSizes.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  // NEW: Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.lg,
  },
  modalContent: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: AppFontSizes.md,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  warningIcon: {
    marginBottom: AppSpacing.md,
  },
  paymentOptions: {
    width: '100%',
    gap: AppSpacing.md,
    marginBottom: AppSpacing.lg,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    gap: AppSpacing.sm,
  },
  paymentOptionText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  modalLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginTop: AppSpacing.md,
  },
  modalLoadingText: {
    fontSize: AppFontSizes.sm,
  },
  // NEW: Status-specific notice styles
  urgentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  urgentText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  infoText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  successText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginRight: AppSpacing.md,
  },
}); 
