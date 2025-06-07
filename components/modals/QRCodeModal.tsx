import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { SubscriptionService } from '../../services/SubscriptionService';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

interface QRCodeModalProps {
  visible: boolean;
  userId: string;
  busId: string;
  busName: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  userId,
  busId,
  busName,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadQRCode = async () => {
    if (!userId || !busId) return;

    try {
      setLoading(true);
      const qrData = await SubscriptionService.generateQRCodeData(userId, busId);
      setQrCode(qrData);
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && userId && busId) {
      loadQRCode();
    }
  }, [visible, userId, busId]);

  const renderQRContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="qr-code" size={64} color={colors.textTertiary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Generating QR Code...
          </Text>
        </View>
      );
    }

    if (!qrCode) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Failed to generate QR code
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadQRCode}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.qrContainer}>
        <View style={[
          styles.qrCodeWrapper,
          {
            backgroundColor: colors.surface,
            ...getThemeShadow(isDark, 'lg'),
          }
        ]}>
          <QRCode
            value={qrCode}
            size={200}
            backgroundColor={isDark ? colors.surface : "white"}
            color={isDark ? colors.text : "black"}
            logoSize={30}
            logoBackgroundColor="transparent"
          />
        </View>
        
        <View style={styles.qrInfo}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>
            Your Bus Ticket
          </Text>
          <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
            {busName}
          </Text>
          
          <View style={[
            styles.validBadge,
            { backgroundColor: colors.success + '20' }
          ]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.validText, { color: colors.success }]}>
              Valid Ticket
            </Text>
          </View>
          
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Show this QR code to the bus driver when boarding
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
    >
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={colors.primary} 
      />
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            Bus Ticket
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {renderQRContent()}
        </View>

        <View style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          }
        ]}>
          <TouchableOpacity 
            style={[
              styles.refreshButton,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.primary,
              }
            ]}
            onPress={loadQRCode}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={[styles.refreshText, { color: colors.primary }]}>
              Refresh
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xl,
  },
  qrContainer: {
    alignItems: 'center',
    width: '100%',
  },
  qrCodeWrapper: {
    padding: AppSpacing.lg,
    borderRadius: AppBorderRadius.xl,
    marginBottom: AppSpacing.xl,
  },
  qrInfo: {
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: AppFontSizes.lg,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.lg,
  },
  validText: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginLeft: AppSpacing.xs,
  },
  instructionText: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: AppSpacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppSpacing.xl,
  },
  loadingText: {
    fontSize: AppFontSizes.lg,
    marginTop: AppSpacing.lg,
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppSpacing.xl,
  },
  errorText: {
    fontSize: AppFontSizes.lg,
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
  },
  retryButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  footer: {
    padding: AppSpacing.lg,
    borderTopWidth: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.lg,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginLeft: AppSpacing.sm,
  },
}); 