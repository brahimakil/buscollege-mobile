import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Alert,
    Dimensions,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { QRScannerService, ScannedRiderInfo } from '../../services/QRScannerService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

interface RiderInfoModalProps {
  visible: boolean;
  riderInfo: ScannedRiderInfo | null;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const RiderInfoModal: React.FC<RiderInfoModalProps> = ({
  visible,
  riderInfo,
  onClose
}) => {
  const { colors, isDark } = useTheme();

  if (!riderInfo) return null;

  const handleCall = async (phoneNumber?: string) => {
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

  const getStatusColor = () => {
    if (riderInfo.isValid) return colors.success;
    switch (riderInfo.scanResult) {
      case 'payment_pending':
        return colors.warning;
      default:
        return colors.error;
    }
  };

  const getStatusIcon = () => {
    if (riderInfo.isValid) return 'checkmark-circle';
    switch (riderInfo.scanResult) {
      case 'payment_pending':
        return 'time';
      default:
        return 'close-circle';
    }
  };

  const paymentStatus = riderInfo.subscription ? 
    QRScannerService.getPaymentStatusDisplay(riderInfo.subscription.paymentStatus) :
    { text: 'Unknown', color: 'error' as const };

  const subscriptionType = riderInfo.subscription ?
    QRScannerService.getSubscriptionTypeDisplay(riderInfo.subscription.subscriptionType) :
    'Unknown';

  const routeInfo = QRScannerService.getFormattedRoute(riderInfo);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[
          styles.header,
          {
            backgroundColor: colors.primary,
            ...getThemeShadow(isDark, 'sm'),
          }
        ]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textInverse }]}>
            Ticket Validation
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Card */}
          <LinearGradient
            colors={riderInfo.isValid 
              ? ['#22c55e20', '#16a34a20'] 
              : ['#ef444420', '#dc262620']
            }
            style={[
              styles.statusCard,
              {
                borderColor: getStatusColor(),
                ...getThemeShadow(isDark, 'md'),
              }
            ]}
          >
            <View style={styles.statusHeader}>
              <Ionicons 
                name={getStatusIcon()} 
                size={32} 
                color={getStatusColor()} 
              />
              <Text style={[
                styles.statusTitle,
                { color: getStatusColor() }
              ]}>
                {riderInfo.isValid ? 'VALID TICKET' : 'INVALID TICKET'}
              </Text>
            </View>
            <Text style={[styles.statusMessage, { color: colors.text }]}>
              {riderInfo.message}
            </Text>
          </LinearGradient>

          {/* Rider Information */}
          {riderInfo.rider && (
            <View style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                ...getThemeShadow(isDark, 'sm'),
              }
            ]}>
              <View style={styles.cardHeader}>
                <Ionicons name="person" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Rider Information
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Name:
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {riderInfo.rider.name}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Email:
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {riderInfo.rider.email}
                </Text>
              </View>
              
              {riderInfo.rider.phoneNumber && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Phone:
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleCall(riderInfo.rider?.phoneNumber)}
                    style={styles.phoneButton}
                  >
                    <Text style={[styles.phoneText, { color: colors.primary }]}>
                      {riderInfo.rider.phoneNumber}
                    </Text>
                    <Ionicons name="call" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              
              {riderInfo.rider.address && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Address:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {riderInfo.rider.address}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Subscription Information */}
          {riderInfo.subscription && (
            <View style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                ...getThemeShadow(isDark, 'sm'),
              }
            ]}>
              <View style={styles.cardHeader}>
                <Ionicons name="card" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Subscription Details
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Type:
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {subscriptionType}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Payment Status:
                </Text>
                <View style={[
                  styles.paymentBadge,
                  {
                    backgroundColor: paymentStatus.color === 'success' 
                      ? colors.success + '20'
                      : paymentStatus.color === 'warning'
                      ? colors.warning + '20'
                      : colors.error + '20'
                  }
                ]}>
                  <Text style={[
                    styles.paymentText,
                    {
                      color: paymentStatus.color === 'success' 
                        ? colors.success
                        : paymentStatus.color === 'warning'
                        ? colors.warning
                        : colors.error
                    }
                  ]}>
                    {paymentStatus.text}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Start Date:
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {new Date(riderInfo.subscription.startDate).toLocaleDateString()}
                </Text>
              </View>
              
              {riderInfo.subscription.endDate && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    End Date:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(riderInfo.subscription.endDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Route Information */}
          {riderInfo.bus && (
            <View style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                ...getThemeShadow(isDark, 'sm'),
              }
            ]}>
              <View style={styles.cardHeader}>
                <Ionicons name="bus" size={20} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Route Information
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Bus:
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {riderInfo.bus.busName} {riderInfo.bus.busLabel}
                </Text>
              </View>
              
              <View style={styles.routeContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  Route:
                </Text>
                <Text style={[styles.routeText, { color: colors.text }]}>
                  {routeInfo}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: riderInfo.isValid ? colors.success : colors.primary,
                ...getThemeShadow(isDark, 'md'),
              }
            ]}
            onPress={onClose}
          >
            <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
              {riderInfo.isValid ? 'Ok' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
    paddingTop: AppSpacing.xl,
  },
  closeButton: {
    padding: AppSpacing.sm,
  },
  headerTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: AppSpacing.lg,
  },
  statusCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 2,
    marginBottom: AppSpacing.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  statusTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginLeft: AppSpacing.sm,
  },
  statusMessage: {
    fontSize: AppFontSizes.md,
    lineHeight: 22,
  },
  infoCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  cardTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginLeft: AppSpacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    flex: 1,
    minWidth: 80,
  },
  infoValue: {
    fontSize: AppFontSizes.sm,
    flex: 2,
    textAlign: 'right',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  phoneText: {
    fontSize: AppFontSizes.sm,
    marginRight: AppSpacing.xs,
  },
  paymentBadge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppBorderRadius.sm,
  },
  paymentText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  routeContainer: {
    marginTop: AppSpacing.sm,
  },
  routeText: {
    fontSize: AppFontSizes.sm,
    lineHeight: 20,
    marginTop: AppSpacing.xs,
  },
  footer: {
    padding: AppSpacing.lg,
    paddingBottom: AppSpacing.xl,
  },
  actionButton: {
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
}); 