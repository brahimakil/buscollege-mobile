import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { QRScannerService, ScannedRiderInfo } from '../../services/QRScannerService';
import { AppBorderRadius, AppFontSizes, AppSpacing } from '../../themes/colors';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanSuccess: (riderInfo: ScannedRiderInfo) => void;
  driverBusId?: string;
}

const { width, height } = Dimensions.get('window');

export const QRScanner: React.FC<QRScannerProps> = ({
  visible,
  onClose,
  onScanSuccess,
  driverBusId
}) => {
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');

  // Reset scanning state when modal opens
  useEffect(() => {
    if (visible) {
      setIsScanning(false);
      setScannedData('');
    }
  }, [visible]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isScanning || data === scannedData) return;

    setIsScanning(true);
    setScannedData(data);
    
    // Haptic feedback
    Vibration.vibrate(100);

    console.log('📱 QR Code scanned:', data);

    try {
      // Validate QR code and get rider information
      const riderInfo = await QRScannerService.validateQRCodeAndGetRiderInfo(data, driverBusId);
      
      if (riderInfo.isValid) {
        // Success - valid QR code
        onScanSuccess(riderInfo);
        onClose();
      } else {
        // Invalid QR code - show error
        Alert.alert(
          'Invalid QR Code',
          riderInfo.message,
          [
            {
              text: 'Scan Again',
              onPress: () => {
                setIsScanning(false);
                setScannedData('');
              }
            },
            {
              text: 'Close',
              onPress: onClose
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert(
        'Scan Error',
        'Failed to process QR code. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setIsScanning(false);
              setScannedData('');
            }
          },
          {
            text: 'Close',
            onPress: onClose
          }
        ]
      );
    }
  };

  const requestCameraPermission = async () => {
    const { granted } = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan QR codes.',
        [
          { text: 'Cancel', onPress: onClose },
          { text: 'Settings', onPress: () => {
            // In a real app, you'd open settings here
            Alert.alert('Please enable camera permission in your device settings.');
          }}
        ]
      );
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="camera-outline" size={64} color={colors.primary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            We need access to your camera to scan QR codes
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={requestCameraPermission}
          >
            <Text style={[styles.permissionButtonText, { color: colors.textInverse }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="black" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Scan QR Code
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr']
            }}
          />
          
          {/* Scanning overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: colors.background }]}>
          <Ionicons name="qr-code" size={32} color={colors.primary} style={styles.instructionIcon} />
          <Text style={[styles.instructionTitle, { color: colors.text }]}>
            {isScanning ? 'Processing...' : 'Position QR code in the frame'}
          </Text>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {isScanning 
              ? 'Please wait while we validate the ticket'
              : 'Make sure the QR code is clearly visible and well-lit'
            }
          </Text>
          
          {isScanning && (
            <View style={styles.processingIndicator}>
              <View style={[styles.processingDot, { backgroundColor: colors.primary }]} />
              <View style={[styles.processingDot, { backgroundColor: colors.primary }]} />
              <View style={[styles.processingDot, { backgroundColor: colors.primary }]} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    padding: AppSpacing.xl,
    alignItems: 'center',
  },
  instructionIcon: {
    marginBottom: AppSpacing.md,
  },
  instructionTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  processingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: AppSpacing.lg,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  // Permission screen styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AppSpacing.xl,
  },
  permissionTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: AppFontSizes.md,
    textAlign: 'center',
    marginBottom: AppSpacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.md,
  },
  permissionButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: AppSpacing.xl,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
}); 