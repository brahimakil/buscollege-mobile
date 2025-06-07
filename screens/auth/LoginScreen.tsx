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
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
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
          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={AppColors.light.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={AppColors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

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