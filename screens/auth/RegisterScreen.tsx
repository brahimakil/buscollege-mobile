import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { AppBorderRadius, AppColors, AppFontSizes, AppShadows, AppSpacing } from '../../themes/colors';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    address: '',
    emergencyContact: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'email_sent' | 'completed'>('form');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { register } = useAuth();
  const router = useRouter();

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    
    if (Platform.OS === 'web') {
      setTimeout(() => {
        window.alert(`❌ ${message}`);
      }, 100);
    } else {
      Alert.alert('Error', message);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
  };

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email address is already registered! Please use a different email or go to login.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/weak-password':
        return 'Password is too weak. Please choose a stronger password (at least 6 characters).';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      default:
        return 'Registration failed. Please try again.';
    }
  };

  const handleRegister = async () => {
    clearMessages();
    
    const { name, email, password, confirmPassword, phoneNumber, address } = formData;

    if (!name.trim()) {
      showError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      showError('Please enter your email address.');
      return;
    }

    if (!password) {
      showError('Please enter a password.');
      return;
    }

    if (!phoneNumber.trim()) {
      showError('Please enter your phone number.');
      return;
    }

    if (!address.trim()) {
      showError('Please enter your address.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match. Please check and try again.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setRegistrationStep('form');
      
      console.log('🔄 Starting registration process...');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      console.log('✅ User account created:', user.uid);
      
      await sendEmailVerification(user);
      
      console.log('✅ Verification email sent');
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'rider',
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        emergencyContact: formData.emergencyContact.trim() || '',
        emailVerified: false,
        accountStatus: 'pending_verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ User document created');
      
      await signOut(auth);
      
      console.log('✅ User signed out');
      
      setRegistrationStep('email_sent');
      showSuccess(`Account created successfully! Verification email sent to ${email}`);
      
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code) {
        errorMessage = getFirebaseErrorMessage(error.code);
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
      
      setRegistrationStep('form');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearMessages();
  };

  if (registrationStep === 'email_sent') {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-outline" size={80} color={AppColors.light.success} />
          </View>
          <Text style={styles.successTitle}>Check Your Email!</Text>
          <Text style={styles.successMessage}>
            We've sent a verification link to{'\n'}
            <Text style={styles.emailText}>{formData.email}</Text>
          </Text>
          <Text style={styles.instructionText}>
            Please check your email (including spam folder) and click the verification link to activate your account.
          </Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onNavigateToLogin()}
          >
            <Text style={styles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setRegistrationStep('form')}
          >
            <Text style={styles.secondaryButtonText}>Back to Registration</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="person-add" size={60} color={AppColors.light.secondary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join as a rider</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={AppColors.light.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={clearMessages} style={styles.closeButton}>
              <Ionicons name="close" size={16} color={AppColors.light.error} />
            </TouchableOpacity>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={20} color={AppColors.light.success} />
            <Text style={styles.successText}>{successMessage}</Text>
            <TouchableOpacity onPress={clearMessages} style={styles.closeButton}>
              <Ionicons name="close" size={16} color={AppColors.light.success} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              keyboardType="phone-pad"
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Address *"
              value={formData.address}
              onChangeText={(value) => updateFormData('address', value)}
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="call" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Emergency Contact"
              value={formData.emergencyContact}
              onChangeText={(value) => updateFormData('emergencyContact', value)}
              keyboardType="phone-pad"
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password *"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              secureTextEntry={!showPassword}
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={AppColors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              secureTextEntry={!showConfirmPassword}
              placeholderTextColor={AppColors.light.textTertiary}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={AppColors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={AppColors.light.textInverse} />
                <Text style={styles.loadingText}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={onNavigateToLogin} disabled={loading}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
    padding: AppSpacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: AppSpacing.xl,
  },
  logoContainer: {
    marginBottom: AppSpacing.md,
  },
  title: {
    fontSize: AppFontSizes.xxl,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginBottom: AppSpacing.xs,
  },
  subtitle: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.error + '15',
    borderColor: AppColors.light.error,
    borderWidth: 1,
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.lg,
  },
  errorText: {
    flex: 1,
    color: AppColors.light.error,
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
    marginLeft: AppSpacing.sm,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.success + '15',
    borderColor: AppColors.light.success,
    borderWidth: 1,
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.md,
    marginBottom: AppSpacing.lg,
  },
  successText: {
    flex: 1,
    color: AppColors.light.success,
    fontSize: AppFontSizes.sm,
    fontWeight: '500',
    marginLeft: AppSpacing.sm,
  },
  closeButton: {
    padding: AppSpacing.xs,
  },
  form: {
    gap: AppSpacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.card,
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderWidth: 1,
    borderColor: AppColors.light.border,
  },
  input: {
    flex: 1,
    fontSize: AppFontSizes.md,
    color: AppColors.light.text,
    marginLeft: AppSpacing.sm,
  },
  registerButton: {
    backgroundColor: AppColors.light.primary,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
    marginTop: AppSpacing.lg,
    ...AppShadows.sm,
  },
  registerButtonText: {
    color: AppColors.light.textInverse,
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: AppColors.light.textInverse,
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginLeft: AppSpacing.sm,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: AppSpacing.md,
  },
  loginLinkText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
  },
  loginLinkHighlight: {
    color: AppColors.light.primary,
    fontWeight: 'bold',
  },
  successIconContainer: {
    marginBottom: AppSpacing.xl,
  },
  successTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    color: AppColors.light.text,
    marginBottom: AppSpacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.lg,
  },
  emailText: {
    fontWeight: 'bold',
    color: AppColors.light.primary,
  },
  instructionText: {
    fontSize: AppFontSizes.sm,
    color: AppColors.light.textSecondary,
    textAlign: 'center',
    marginBottom: AppSpacing.xl,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: AppColors.light.primary,
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.xl,
    borderRadius: AppBorderRadius.lg,
    marginBottom: AppSpacing.md,
    minWidth: 200,
  },
  primaryButtonText: {
    color: AppColors.light.textInverse,
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.lg,
  },
  secondaryButtonText: {
    color: AppColors.light.primary,
    fontSize: AppFontSizes.sm,
    textAlign: 'center',
  },
}); 