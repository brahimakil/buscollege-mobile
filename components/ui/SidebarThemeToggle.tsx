import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing } from '../../themes/colors';

export const SidebarThemeToggle: React.FC = () => {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons 
            name={isDark ? "sunny" : "moon"} 
            size={16} 
            color={colors.textInverse} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap to switch
          </Text>
        </View>
        
        <View style={[styles.toggle, { backgroundColor: colors.border }]}>
          <Animated.View style={[
            styles.toggleIndicator,
            {
              backgroundColor: colors.primary,
              transform: [{ translateX: isDark ? 14 : 0 }]
            }
          ]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: AppBorderRadius.md,
    padding: AppSpacing.sm,
    marginVertical: AppSpacing.xs,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: AppBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppSpacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginBottom: 1,
  },
  subtitle: {
    fontSize: AppFontSizes.xs,
  },
  toggle: {
    width: 32,
    height: 18,
    borderRadius: AppBorderRadius.full,
    padding: 2,
    justifyContent: 'center',
  },
  toggleIndicator: {
    width: 14,
    height: 14,
    borderRadius: AppBorderRadius.full,
  },
}); 