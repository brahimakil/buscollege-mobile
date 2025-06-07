import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const { width, height } = Dimensions.get('window');

interface Bus {
  id: string;
  busName: string;
  driverName: string;
  pricePerMonth: number;
  pricePerRide: number;
  operatingTimeFrom: string;
  operatingTimeTo: string;
  maxCapacity: number;
  currentRiders: string[];
  locations: Array<{
    name: string;
    order: number;
    arrivalTimeFrom: string;
    arrivalTimeTo: string;
  }>;
}

interface SubscriptionModalProps {
  visible: boolean;
  bus: Bus | null;
  onClose: () => void;
  onSubscribe: (type: 'monthly' | 'per_ride', locationId?: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  bus,
  onClose,
  onSubscribe,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedType, setSelectedType] = useState<'monthly' | 'per_ride'>('monthly');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!bus) return null;

  const availableSeats = bus.maxCapacity - (bus.currentRiders?.length || 0);

  const handleSubscribe = async () => {
    if (availableSeats <= 0) {
      Alert.alert('Bus Full', 'This bus is currently at full capacity.');
      return;
    }

    setLoading(true);
    try {
      await onSubscribe(selectedType, selectedLocation);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modalContainer,
          {
            backgroundColor: colors.background,
            ...getThemeShadow(isDark, 'xl'),
          }
        ]}>
          {/* Fixed Header */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark || colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.busInfo}>
                <Text style={[styles.busName, { color: colors.textInverse }]}>
                  {bus.busName}
                </Text>
                <Text style={[styles.driverName, { color: colors.textInverse }]}>
                  Driver: {bus.driverName}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textInverse} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Scrollable Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Capacity Info */}
            <View style={[styles.capacityCard, { backgroundColor: colors.card }]}>
              <View style={styles.capacityHeader}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <Text style={[styles.capacityTitle, { color: colors.text }]}>
                  Bus Capacity
                </Text>
              </View>
              <View style={styles.capacityInfo}>
                <Text style={[styles.capacityText, { color: colors.textSecondary }]}>
                  Available Seats: 
                  <Text style={[
                    styles.capacityNumber,
                    { color: availableSeats > 0 ? colors.success : colors.error }
                  ]}>
                    {' '}{availableSeats}/{bus.maxCapacity}
                  </Text>
                </Text>
              </View>
            </View>

            {/* Operating Hours */}
            <View style={[styles.scheduleCard, { backgroundColor: colors.card }]}>
              <View style={styles.scheduleHeader}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.scheduleTitle, { color: colors.text }]}>
                  Operating Hours
                </Text>
              </View>
              <Text style={[styles.scheduleTime, { color: colors.textSecondary }]}>
                {bus.operatingTimeFrom} - {bus.operatingTimeTo}
              </Text>
            </View>

            {/* Route Locations */}
            {bus.locations && bus.locations.length > 0 && (
              <View style={[styles.locationsCard, { backgroundColor: colors.card }]}>
                <View style={styles.locationsHeader}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                  <Text style={[styles.locationsTitle, { color: colors.text }]}>
                    Route Stops
                  </Text>
                </View>
                {bus.locations
                  .sort((a, b) => a.order - b.order)
                  .map((location, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.locationItem,
                        {
                          backgroundColor: selectedLocation === location.name 
                            ? colors.primary + '20' 
                            : colors.backgroundSecondary,
                          borderColor: selectedLocation === location.name 
                            ? colors.primary 
                            : colors.border,
                        }
                      ]}
                      onPress={() => setSelectedLocation(location.name)}
                    >
                      <View style={styles.locationInfo}>
                        <Text style={[styles.locationName, { color: colors.text }]}>
                          {location.name}
                        </Text>
                        <Text style={[styles.locationTime, { color: colors.textSecondary }]}>
                          {location.arrivalTimeFrom} - {location.arrivalTimeTo}
                        </Text>
                      </View>
                      {selectedLocation === location.name && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            )}

            {/* Subscription Type Selection */}
            <View style={[styles.subscriptionCard, { backgroundColor: colors.card }]}>
              <View style={styles.subscriptionHeader}>
                <Ionicons name="card" size={20} color={colors.primary} />
                <Text style={[styles.subscriptionTitle, { color: colors.text }]}>
                  Choose Subscription Type
                </Text>
              </View>

              {/* Monthly Option */}
              <TouchableOpacity
                style={[
                  styles.subscriptionOption,
                  {
                    backgroundColor: selectedType === 'monthly' 
                      ? colors.primary + '20' 
                      : colors.backgroundSecondary,
                    borderColor: selectedType === 'monthly' 
                      ? colors.primary 
                      : colors.border,
                  }
                ]}
                onPress={() => setSelectedType('monthly')}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Ionicons name="calendar" size={24} color={colors.primary} />
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Monthly Subscription
                      </Text>
                      <Text style={[styles.optionPrice, { color: colors.primary }]}>
                        ${bus.pricePerMonth}/month
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Unlimited rides for 30 days. Best value for regular commuters.
                  </Text>
                </View>
                {selectedType === 'monthly' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>

              {/* Per Ride Option */}
              <TouchableOpacity
                style={[
                  styles.subscriptionOption,
                  {
                    backgroundColor: selectedType === 'per_ride' 
                      ? colors.primary + '20' 
                      : colors.backgroundSecondary,
                    borderColor: selectedType === 'per_ride' 
                      ? colors.primary 
                      : colors.border,
                  }
                ]}
                onPress={() => setSelectedType('per_ride')}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Ionicons name="ticket" size={24} color={colors.secondary} />
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        Per Ride
                      </Text>
                      <Text style={[styles.optionPrice, { color: colors.secondary }]}>
                        ${bus.pricePerRide}/ride
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    Pay as you go. Perfect for occasional travelers.
                  </Text>
                </View>
                {selectedType === 'per_ride' && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Fixed Footer */}
          <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                {
                  opacity: (loading || availableSeats <= 0) ? 0.6 : 1,
                }
              ]}
              onPress={handleSubscribe}
              disabled={loading || availableSeats <= 0}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.subscribeGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
                <Text style={[styles.subscribeButtonText, { color: colors.textInverse }]}>
                  {loading ? 'Subscribing...' : `Subscribe ${selectedType === 'monthly' ? 'Monthly' : 'Per Ride'}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: height * 0.85,
    borderTopLeftRadius: AppBorderRadius.xl,
    borderTopRightRadius: AppBorderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.lg,
    paddingTop: AppSpacing.xl,
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
  driverName: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
  },
  closeButton: {
    padding: AppSpacing.sm,
  },
  content: {
    flex: 1,
    padding: AppSpacing.lg,
  },
  capacityCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  capacityTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: AppFontSizes.md,
  },
  capacityNumber: {
    fontWeight: 'bold',
  },
  scheduleCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  scheduleTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  scheduleTime: {
    fontSize: AppFontSizes.md,
  },
  locationsCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  locationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  locationsTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.sm,
    borderWidth: 1,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: AppFontSizes.md,
    fontWeight: '500',
    marginBottom: AppSpacing.xs,
  },
  locationTime: {
    fontSize: AppFontSizes.sm,
  },
  subscriptionCard: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  subscriptionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
  subscriptionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.md,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  optionInfo: {
    marginLeft: AppSpacing.md,
  },
  optionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: '600',
    marginBottom: AppSpacing.xs,
  },
  optionPrice: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
  optionDescription: {
    fontSize: AppFontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    padding: AppSpacing.lg,
    borderTopWidth: 1,
  },
  subscribeButton: {
    borderRadius: AppBorderRadius.lg,
    overflow: 'hidden',
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
  },
  subscribeButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginLeft: AppSpacing.sm,
  },
}); 
