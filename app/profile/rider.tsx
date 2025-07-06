import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React from 'react';
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
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MainLayout } from '../../layouts/MainLayout';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

const RiderProfile: React.FC = () => {
  const { userData, user } = useAuth();
  const { colors, isDark } = useTheme();
  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: userData?.name || '',
    phoneNumber: userData?.phoneNumber || '',
    address: userData?.address || '',
    emergencyContact: userData?.emergencyContact || '',
  });

  const handleSave = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: userData?.name || '',
      phoneNumber: userData?.phoneNumber || '',
      address: userData?.address || '',
      emergencyContact: userData?.emergencyContact || '',
    });
    setIsEditing(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.secondary }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={60} color={colors.secondary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.textInverse }]}>
            Rider Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textInverse }]}>
            {userData?.name}
          </Text>
        </View>

        {/* Profile Form */}
        <View style={styles.formContainer}>
          <View style={[styles.card, { backgroundColor: colors.card, ...getThemeShadow(isDark, 'sm') }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Personal Information
              </Text>
              {!isEditing && (
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: colors.secondary }]}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create" size={20} color={colors.textInverse} />
                </TouchableOpacity>
              )}
            </View>

            {/* Email (Read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Ionicons name="mail" size={20} color={colors.textSecondary} />
                <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                  {userData?.email}
                </Text>
              </View>
            </View>

            {/* Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="person" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  editable={isEditing}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="call" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                  editable={isEditing}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="location" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  editable={isEditing}
                  placeholder="Enter your address"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                />
              </View>
            </View>

            {/* Emergency Contact */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Emergency Contact</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Ionicons name="medical" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={formData.emergencyContact}
                  onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                  editable={isEditing}
                  placeholder="Enter emergency contact"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Action Buttons */}
            {isEditing && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.error }]}
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.success }]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default function RiderProfilePage() {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    switch (route) {
      case 'dashboard':
        router.push('/dashboard/rider');
        break;
      case 'profile':
        router.push('/profile/rider');
        break;
      case 'all-buses':
        router.push('/buses/all-buses');
        break;
      case 'favorites':
        router.push('/buses/favorites');
        break;
      case 'my-subscriptions':
        router.push('/subscriptions/my-subscriptions');
        break;
      default:
        router.push('/');
    }
  };

  return (
    <MainLayout
      title="Rider Profile"
      currentRoute="profile"
      onNavigate={handleNavigate}
    >
      <RiderProfile />
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    padding: AppSpacing.xl,
    paddingTop: AppSpacing.xl + 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  headerTitle: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
    marginBottom: AppSpacing.xs,
  },
  headerSubtitle: {
    fontSize: AppFontSizes.md,
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    padding: AppSpacing.lg,
  },
  card: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.lg,
  },
  cardTitle: {
    fontSize: AppFontSizes.lg,
    fontWeight: 'bold',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldContainer: {
    marginBottom: AppSpacing.md,
  },
  label: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginBottom: AppSpacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: AppBorderRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  input: {
    flex: 1,
    fontSize: AppFontSizes.md,
    marginLeft: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  readOnlyText: {
    flex: 1,
    fontSize: AppFontSizes.md,
    marginLeft: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: AppSpacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
    marginRight: AppSpacing.sm,
  },
  saveButton: {
    flex: 1,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    alignItems: 'center',
    marginLeft: AppSpacing.sm,
  },
  buttonText: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
  },
}); 