import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  showMenu?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onMenuPress, 
  showMenu = true 
}) => {
  const { userData } = useAuth();
  const { colors, isDark } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.primary,
        ...getThemeShadow(isDark, 'md'),
      }
    ]}>
      <View style={styles.leftSection}>
        {showMenu && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.textInverse }]}>{title}</Text>
      </View>
      
      <View style={styles.rightSection}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textInverse }]}>
            {userData?.name}
          </Text>
          <Text style={[styles.userRole, { color: colors.primaryLight }]}>
            {userData?.role}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primaryDark }]}>
          <Ionicons name="person" size={20} color={colors.textInverse} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    paddingTop: AppSpacing.xl + 20, // Account for status bar
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: AppSpacing.md,
    padding: AppSpacing.xs,
  },
  title: {
    fontSize: AppFontSizes.xl,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: AppSpacing.sm,
  },
  userName: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
  },
  userRole: {
    fontSize: AppFontSizes.xs,
    textTransform: 'capitalize',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 