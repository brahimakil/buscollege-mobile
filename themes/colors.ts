export const AppColors = {
  light: {
    // Primary colors
    primary: '#6366F1', // Indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    
    // Secondary colors
    secondary: '#EC4899', // Pink
    secondaryLight: '#F472B6',
    secondaryDark: '#DB2777',
    
    // Accent colors
    accent: '#10B981', // Emerald
    accentLight: '#34D399',
    accentDark: '#059669',
    
    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',
    
    // Surface colors
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    
    // Text colors
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    
    // Border colors
    border: '#E2E8F0',
    borderSecondary: '#CBD5E1',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    // Card colors
    card: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
    
    // Sidebar colors
    sidebarBackground: '#1E293B',
    sidebarText: '#F1F5F9',
    sidebarActive: '#6366F1',
    sidebarActiveBackground: 'rgba(99, 102, 241, 0.1)',
    
    // Additional UI colors
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#94A3B8',
    placeholder: '#CBD5E1',
    divider: '#E2E8F0',
    
    // Button colors
    buttonPrimary: '#6366F1',
    buttonSecondary: '#F1F5F9',
    buttonDanger: '#EF4444',
    buttonSuccess: '#10B981',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#E2E8F0',
    inputFocus: '#6366F1',
    inputError: '#EF4444',
  },
  dark: {
    // Primary colors
    primary: '#818CF8',
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    
    // Secondary colors
    secondary: '#F472B6',
    secondaryLight: '#F9A8D4',
    secondaryDark: '#EC4899',
    
    // Accent colors
    accent: '#34D399',
    accentLight: '#6EE7B7',
    accentDark: '#10B981',
    
    // Background colors
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',
    
    // Surface colors
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    
    // Text colors
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    textInverse: '#1E293B',
    
    // Border colors
    border: '#334155',
    borderSecondary: '#475569',
    
    // Status colors
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    // Card colors
    card: '#1E293B',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    
    // Sidebar colors
    sidebarBackground: '#0F172A',
    sidebarText: '#CBD5E1',
    sidebarActive: '#818CF8',
    sidebarActiveBackground: 'rgba(129, 140, 248, 0.15)',
    
    // Additional UI colors
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    disabled: '#64748B',
    placeholder: '#64748B',
    divider: '#334155',
    
    // Button colors
    buttonPrimary: '#818CF8',
    buttonSecondary: '#334155',
    buttonDanger: '#F87171',
    buttonSuccess: '#34D399',
    
    // Input colors
    inputBackground: '#1E293B',
    inputBorder: '#334155',
    inputFocus: '#818CF8',
    inputError: '#F87171',
  },
};

export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const AppBorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const AppFontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const AppShadows = {
  light: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 5,
    },
  },
  dark: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 5,
    },
  },
};

// Theme-aware shadow helper
export const getThemeShadow = (isDark: boolean, size: 'sm' | 'md' | 'lg') => {
  return isDark ? AppShadows.dark[size] : AppShadows.light[size];
};

// Color utility functions
export const getOpacityColor = (color: string, opacity: number): string => {
  // Convert hex to rgba with opacity
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getContrastColor = (isDark: boolean): string => {
  return isDark ? AppColors.dark.text : AppColors.light.text;
};

export const getBackgroundColor = (isDark: boolean): string => {
  return isDark ? AppColors.dark.background : AppColors.light.background;
}; 