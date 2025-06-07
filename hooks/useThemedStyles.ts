import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { AppColors } from '../themes/colors';

export const useThemedStyles = <T extends Record<string, any>>(
  createStyles: (colors: typeof AppColors.light, isDark: boolean) => T
): T => {
  const { colors, isDark } = useTheme();
  
  return useMemo(() => createStyles(colors, isDark), [colors, isDark]);
};

// Example usage:
// const styles = useThemedStyles((colors, isDark) => StyleSheet.create({
//   container: {
//     backgroundColor: colors.background,
//     borderColor: colors.border,
//   },
//   text: {
//     color: colors.text,
//   },
// })); 