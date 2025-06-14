import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { AppBorderRadius, AppColors, AppFontSizes, AppSpacing } from '../../themes/colors';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'info',
  duration = 4000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: AppColors.light.success,
          icon: 'checkmark-circle' as const,
          textColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: AppColors.light.error,
          icon: 'alert-circle' as const,
          textColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: AppColors.light.warning,
          icon: 'warning' as const,
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: AppColors.light.info,
          icon: 'information-circle' as const,
          textColor: '#FFFFFF',
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.backgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={config.icon} size={20} color={config.textColor} />
        <Text style={[styles.message, { color: config.textColor }]} numberOfLines={3}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={config.textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: AppSpacing.md,
    right: AppSpacing.md,
    zIndex: 9999,
    borderRadius: AppBorderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: AppSpacing.md,
  },
  message: {
    flex: 1,
    fontSize: AppFontSizes.md,
    marginLeft: AppSpacing.sm,
    marginRight: AppSpacing.sm,
    fontWeight: '500',
  },
  closeButton: {
    padding: AppSpacing.xs,
  },
}); 