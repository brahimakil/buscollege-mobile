import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing } from '../../themes/colors';

interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabel = true, 
  size = 'medium' 
}) => {
  const { theme, toggleTheme, colors, isDark } = useTheme();

  const sizeConfig = {
    small: { iconSize: 20, padding: AppSpacing.sm },
    medium: { iconSize: 24, padding: AppSpacing.md },
    large: { iconSize: 28, padding: AppSpacing.lg },
  };

  const config = sizeConfig[size];

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
        <Ionicons 
          name={isDark ? "sunny" : "moon"} 
          size={config.iconSize} 
          color={colors.textInverse} 
        />
      </View>
      
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
            {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          </Text>
        </View>
      )}
      
      <View style={[styles.toggle, { backgroundColor: colors.border }]}>
        <View style={[
          styles.toggleIndicator, 
          { 
            backgroundColor: colors.primary,
            transform: [{ translateX: isDark ? 20 : 0 }]
          }
        ]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    borderRadius: AppBorderRadius.lg,
    marginVertical: AppSpacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: AppBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppSpacing.md,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  sublabel: {
    fontSize: AppFontSizes.sm,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: AppBorderRadius.full,
    padding: 2,
    justifyContent: 'center',
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: AppBorderRadius.full,
  },
}); 