import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AppBorderRadius, AppColors, AppFontSizes, AppShadows, AppSpacing } from '../../themes/colors';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string; general?: string}>({});
  const { login, resendVerificationEmail } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showErrorNotification = (message: string) => {
    // Check if this is an email verification error
    if (message.includes('verify your email')) {
      setShowResendButton(true);
    } else {
      setShowResendButton(false);
    }
    
    // Multiple notification approaches for better compatibility
    
    // 1. Set inline error message
    setErrors(prev => ({ ...prev, general: message }));
    
    // 2. Try native Alert (works on mobile)
    try {
      Alert.alert(
        'Login Failed', 
        message,
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    } catch (alertError) {
      console.warn('Alert.alert failed:', alertError);
    }
    
    // 3. Console error for debugging
    console.error('Login Error:', message);
    
    // 4. For web platforms, try to show browser notification
    if (Platform.OS === 'web') {
      try {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #EF4444;
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          max-width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          animation: slideInRight 0.3s ease-out;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#toast-animations')) {
          const style = document.createElement('style');
          style.id = 'toast-animations';
          style.textContent = `
            @keyframes slideInRight {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
              from { transform: translateX(0); opacity: 1; }
              to { transform: translateX(100%); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }
        
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">⚠️</span>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; margin-left: auto; padding: 0; line-height: 1;">
              ×
            </button>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.remove();
              }
            }, 300);
          }
        }, 5000);
        
      } catch (webError) {
        console.warn('Web notification failed:', webError);
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      showErrorNotification('Please enter your email and password to resend verification email.');
      return;
    }

    setResendingEmail(true);
    try {
      await resendVerificationEmail(email.trim().toLowerCase(), password);
      Alert.alert(
        'Verification Email Sent',
        `A new verification email has been sent to ${email}. Please check your inbox (including spam folder) and click the verification link.`,
        [{ text: 'OK', style: 'default' }]
      );
      setShowResendButton(false);
      setErrors({});
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend verification email. Please try again.';
      showErrorNotification(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    setShowResendButton(false);
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Navigation is handled in the AuthContext after successful login
    } catch (error: any) {
      // Show error notification using multiple approaches
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      showErrorNotification(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear errors when user starts typing
    if (errors.email || errors.general) {
      setErrors(prev => ({ ...prev, email: undefined, general: undefined }));
      setShowResendButton(false);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear errors when user starts typing
    if (errors.password || errors.general) {
      setErrors(prev => ({ ...prev, password: undefined, general: undefined }));
      setShowResendButton(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="bus" size={60} color={AppColors.light.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          {/* General error message */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <Ionicons name="alert-circle" size={20} color={AppColors.light.error} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
              <TouchableOpacity 
                onPress={() => setErrors(prev => ({ ...prev, general: undefined }))}
                style={styles.errorCloseButton}
              >
                <Ionicons name="close" size={16} color={AppColors.light.error} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[
            styles.inputContainer,
            errors.email && styles.inputError
          ]}>
            <Ionicons name="mail" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={AppColors.light.textTertiary}
            />
          </View>
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <View style={[
            styles.inputContainer,
            errors.password && styles.inputError
          ]}>
            <Ionicons name="lock-closed" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={AppColors.light.textTertiary}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={AppColors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {showResendButton && (
            <TouchableOpacity
              style={[styles.resendButton, resendingEmail && styles.disabledButton]}
              onPress={handleResendVerification}
              disabled={resendingEmail}
            >
              <Text style={styles.resendButtonText}>
                {resendingEmail ? 'Resending...' : 'Resend Verification Email'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.light.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: AppSpacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: AppSpacing.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AppColors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
    ...AppShadows.md,
  },
  title: {
    fontSize: AppFontSizes.xxxl,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginBottom: AppSpacing.sm,
  },
  subtitle: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.textSecondary,
  },
  form: {
    width: '100%',
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.error + '15',
    borderColor: AppColors.light.error,
    borderWidth: 1,
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  generalErrorText: {
    flex: 1,
    color: AppColors.light.error,
    fontSize: AppFontSizes.sm,
    marginLeft: AppSpacing.sm,
    fontWeight: '500',
  },
  errorCloseButton: {
    padding: AppSpacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.surface,
    borderRadius: AppBorderRadius.lg,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    marginBottom: AppSpacing.sm,
    borderWidth: 1,
    borderColor: AppColors.light.border,
    ...AppShadows.sm,
  },
  inputError: {
    borderColor: AppColors.light.error,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: AppFontSizes.md,
    color: AppColors.light.text,
    marginLeft: AppSpacing.sm,
  },
  errorText: {
    color: AppColors.light.error,
    fontSize: AppFontSizes.sm,
    marginBottom: AppSpacing.sm,
    marginLeft: AppSpacing.sm,
  },
  loginButton: {
    backgroundColor: AppColors.light.primary,
    borderRadius: AppBorderRadius.lg,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginTop: AppSpacing.md,
    ...AppShadows.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    color: AppColors.light.textInverse,
  },
  resendButton: {
    backgroundColor: AppColors.light.secondary,
    borderRadius: AppBorderRadius.md,
    paddingVertical: AppSpacing.sm,
    alignItems: 'center',
    marginTop: AppSpacing.sm,
    ...AppShadows.sm,
  },
  resendButtonText: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    color: AppColors.light.textInverse,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: AppSpacing.lg,
  },
  registerText: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.textSecondary,
  },
  registerLink: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.primary,
    fontWeight: '600',
  },
}); 