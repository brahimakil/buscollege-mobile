export const AppColors = {
  light: {
    // Primary colors - Professional Deep Blue
    primary: '#1E40AF', // Deep professional blue
    primaryLight: '#3B82F6',
    primaryDark: '#1E3A8A',
    
    // Secondary colors - Vibrant Orange
    secondary: '#EA580C', // Deep energetic orange
    secondaryLight: '#F97316',
    secondaryDark: '#C2410C',
    
    // Accent colors - Keep the great green
    accent: '#10B981', // Emerald green
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
    info: '#1E40AF', // Use our new blue for info
    
    // Card colors
    card: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
    
    // Sidebar colors
    sidebarBackground: '#1E293B',
    sidebarText: '#F1F5F9',
    sidebarActive: '#1E40AF', // Use new blue
    sidebarActiveBackground: 'rgba(30, 64, 175, 0.1)',
    
    // Additional UI colors
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#94A3B8',
    placeholder: '#CBD5E1',
    divider: '#E2E8F0',
    
    // Button colors
    buttonPrimary: '#1E40AF', // New blue
    buttonSecondary: '#F1F5F9',
    buttonDanger: '#EF4444',
    buttonSuccess: '#10B981',
    
    // Input colors
    inputBackground: '#FFFFFF',
    inputBorder: '#E2E8F0',
    inputFocus: '#1E40AF', // New blue
    inputError: '#EF4444',
  },
  dark: {
    // Primary colors - Brighter Blue for dark theme
    primary: '#3B82F6', // Bright beautiful blue
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    
    // Secondary colors - Vibrant Orange for dark theme
    secondary: '#F97316', // Bright energetic orange
    secondaryLight: '#FB923C',
    secondaryDark: '#EA580C',
    
    // Accent colors - Enhanced green
    accent: '#10B981',
    accentLight: '#34D399',
    accentDark: '#059669',
    
    // Background colors - MUCH DARKER
    background: '#000000', // Pure black for ultimate darkness
    backgroundSecondary: '#0A0A0B', // Near black
    backgroundTertiary: '#111111', // Very dark gray
    
    // Surface colors - Super dark
    surface: '#0A0A0B',
    surfaceSecondary: '#111111',
    
    // Text colors - High contrast on dark
    text: '#FFFFFF', // Pure white for maximum contrast
    textSecondary: '#E5E7EB', // Very light gray
    textTertiary: '#9CA3AF', // Medium light gray
    textInverse: '#000000',
    
    // Border colors - Dark but visible
    border: '#1F1F23', // Very dark border
    borderSecondary: '#2D2D30', // Slightly lighter dark border
    
    // Status colors - More vibrant on dark
    success: '#22C55E', // Brighter green
    warning: '#F59E0B', // Bright orange
    error: '#EF4444', // Bright red
    info: '#3B82F6', // Our new bright blue
    
    // Card colors - Deep dark
    card: '#0A0A0B',
    cardShadow: 'rgba(0, 0, 0, 0.9)', // Much stronger shadow
    
    // Sidebar colors - Ultra dark
    sidebarBackground: '#000000', // Pure black sidebar
    sidebarText: '#E5E7EB',
    sidebarActive: '#3B82F6', // New bright blue
    sidebarActiveBackground: 'rgba(59, 130, 246, 0.2)', // More visible active state
    
    // Additional UI colors - Enhanced for dark
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.95)', // Much darker overlay
    disabled: '#4B5563', // Darker disabled state
    placeholder: '#6B7280', // Darker placeholder
    divider: '#1F1F23', // Very dark divider
    
    // Button colors - More vibrant
    buttonPrimary: '#3B82F6', // New bright blue
    buttonSecondary: '#1F1F23', // Very dark secondary button
    buttonDanger: '#EF4444',
    buttonSuccess: '#22C55E',
    
    // Input colors - Ultra dark
    inputBackground: '#0A0A0B', // Almost black input
    inputBorder: '#1F1F23', // Dark border
    inputFocus: '#3B82F6', // New bright blue focus
    inputError: '#EF4444',
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
      shadowOpacity: 0.8, // Much stronger shadow
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.9, // Very strong shadow
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.95, // Ultra strong shadow
      shadowRadius: 20,
      elevation: 8,
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