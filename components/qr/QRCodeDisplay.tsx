import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '../../themes/colors';

interface QRCodeDisplayProps {
  qrData: string;
  title?: string;
  subtitle?: string;
  size?: number;
  showBorder?: boolean;
}

const { width } = Dimensions.get('window');

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrData,
  title = "Your Bus Pass",
  subtitle = "Show this QR code to the driver",
  size = Math.min(width * 0.6, 200),
  showBorder = true
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="qr-code" size={24} color={AppColors.light.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* QR Code Container */}
      <View style={[styles.qrContainer, showBorder && styles.qrBorder]}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.qrBackground}
        >
          <QRCode
            value={qrData}
            size={size}
            color={AppColors.light.text}
            backgroundColor="transparent"
            logoSize={30}
            logoBackgroundColor="transparent"
          />
        </LinearGradient>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.validityIndicator}>
          <View style={styles.validityDot} />
          <Text style={styles.validityText}>Valid Pass</Text>
        </View>
        <Text style={styles.instructionText}>
          Present this code when boarding the bus
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: AppSpacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  title: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginTop: AppSpacing.sm,
    marginBottom: AppSpacing.xs,
  },
  subtitle: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.lg,
  },
  qrBorder: {
    borderWidth: 2,
    borderColor: AppColors.light.border,
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
    shadowColor: AppColors.light.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrBackground: {
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
  },
  footer: {
    alignItems: 'center',
  },
  validityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  validityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.light.success,
    marginRight: AppSpacing.xs,
  },
  validityText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.success,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: AppFontSizes.xs,
    color: AppColors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
}); 