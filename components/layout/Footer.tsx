import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AppFontSizes, AppSpacing } from '../../themes/colors';

export const Footer: React.FC = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.backgroundSecondary,
        borderTopColor: colors.border,
      }
    ]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        © 2025 Bus College Mobile. All rights reserved.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: AppSpacing.md,
    paddingHorizontal: AppSpacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  text: {
    fontSize: AppFontSizes.xs,
  },
}); 