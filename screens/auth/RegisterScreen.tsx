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
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    const { name, email, password, confirmPassword, phoneNumber, address } = formData;

    if (!name || !email || !password || !phoneNumber || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        name,
        email,
        phoneNumber,
        address,
        emergencyContact: formData.emergencyContact,
        role: 'rider',
        busAssignments: [],
      }, password);

      console.log('Registration completed successfully');
      // After successful registration, redirect to index which will handle role-based routing
      router.replace('/');
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholderTextColor={AppColors.light.textTertiary}
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
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
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
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
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
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    marginBottom: AppSpacing.xl,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.light.surface,
    borderRadius: AppBorderRadius.lg,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    marginBottom: AppSpacing.md,
    borderWidth: 1,
    borderColor: AppColors.light.border,
    ...AppShadows.sm,
  },
  input: {
    flex: 1,
    fontSize: AppFontSizes.md,
    color: AppColors.light.text,
    marginLeft: AppSpacing.sm,
  },
  registerButton: {
    backgroundColor: AppColors.light.secondary,
    borderRadius: AppBorderRadius.lg,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    marginTop: AppSpacing.md,
    ...AppShadows.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
    color: AppColors.light.textInverse,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: AppSpacing.lg,
  },
  loginText: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.textSecondary,
  },
  loginLink: {
    fontSize: AppFontSizes.md,
    color: AppColors.light.primary,
    fontWeight: '600',
  },
}); 