import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppBorderRadius, AppFontSizes, AppSpacing, getThemeShadow } from '../../themes/colors';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  roles: string[];
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'home',
    route: 'dashboard',
    roles: ['driver', 'rider'],
  },
  {
    id: 'my-buses',
    title: 'My Buses',
    icon: 'bus',
    route: 'my-buses',
    roles: ['driver'],
  },
  {
    id: 'all-buses',
    title: 'All Buses',
    icon: 'list',
    route: 'all-buses',
    roles: ['rider'],
  },
  {
    id: 'favorites',
    title: 'Favorites',
    icon: 'star',
    route: 'favorites',
    roles: ['rider'],
  },
  {
    id: 'my-subscriptions',
    title: 'My Subscriptions',
    icon: 'card',
    route: 'my-subscriptions',
    roles: ['rider'],
  },

];

export const Sidebar: React.FC<SidebarProps> = ({ 
  isVisible, 
  onClose, 
  onNavigate, 
  currentRoute 
}) => {
  const { userData, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const filteredMenuItems = menuItems.filter(item => 
    userData?.role && item.roles.includes(userData.role)
  );

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[
        styles.sidebar,
        {
          backgroundColor: colors.sidebarBackground,
          ...getThemeShadow(isDark, 'lg'),
        }
      ]}>
        {/* Header with User Info */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.userSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color={colors.textInverse} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.sidebarText }]}>
                {userData?.name}
              </Text>
              <Text style={[styles.userRole, { color: colors.textTertiary }]}>
                {userData?.role}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.sidebarText} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
          {filteredMenuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                currentRoute === item.route && [
                  styles.activeMenuItem,
                  { backgroundColor: colors.sidebarActive + '20' }
                ],
              ]}
              onPress={() => {
                onNavigate(item.route);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={
                  currentRoute === item.route
                    ? colors.sidebarActive
                    : colors.sidebarText
                }
              />
              <Text
                style={[
                  styles.menuText,
                  { color: colors.sidebarText },
                  currentRoute === item.route && [
                    styles.activeMenuText,
                    { color: colors.sidebarActive }
                  ],
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Profile Section */}
        <View style={[styles.profileSection, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.profileItem,
              currentRoute === 'profile' && [
                styles.activeMenuItem,
                { backgroundColor: colors.sidebarActive + '20' }
              ],
            ]}
            onPress={() => {
              onNavigate('profile');
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.profileIcon, { backgroundColor: colors.primary }]}>
              <Ionicons 
                name="person-circle" 
                size={20} 
                color={colors.textInverse} 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileTitle, { color: colors.sidebarText }]}>
                My Profile
              </Text>
              <Text style={[styles.profileSubtitle, { color: colors.textSecondary }]}>
                Edit your information
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {/* Theme Toggle Section */}
        <View style={[styles.themeSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.sidebarText }]}>
            Appearance
          </Text>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: colors.backgroundSecondary }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <View style={styles.themeToggleContent}>
              <View style={[styles.themeIcon, { backgroundColor: colors.primary }]}>
                <Ionicons 
                  name={isDark ? "sunny" : "moon"} 
                  size={18} 
                  color={colors.textInverse} 
                />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeTitle, { color: colors.text }]}>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </Text>
                <Text style={[styles.themeSubtitle, { color: colors.textSecondary }]}>
                  {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                </Text>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: colors.border }]}>
                <View style={[
                  styles.toggleIndicator,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ translateX: isDark ? 16 : 0 }]
                  }
                ]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer with Logout */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.logoutIcon, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="log-out" size={18} color={colors.error} />
            </View>
            <Text style={[styles.logoutText, { color: colors.error }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  sidebar: {
    width: 300,
    paddingTop: AppSpacing.xl + 20,
    elevation: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AppSpacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: AppFontSizes.md,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userRole: {
    fontSize: AppFontSizes.sm,
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: AppSpacing.xs,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: AppSpacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    marginHorizontal: AppSpacing.md,
    borderRadius: AppBorderRadius.md,
    marginBottom: AppSpacing.xs,
  },
  activeMenuItem: {
    // Background color applied dynamically
  },
  menuText: {
    marginLeft: AppSpacing.md,
    fontSize: AppFontSizes.md,
    fontWeight: '500',
  },
  activeMenuText: {
    fontWeight: 'bold',
  },
  profileSection: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderTopWidth: 1,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.sm,
    borderRadius: AppBorderRadius.md,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: AppBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppSpacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileSubtitle: {
    fontSize: AppFontSizes.xs,
  },
  themeSection: {
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: AppFontSizes.sm,
    fontWeight: '600',
    marginBottom: AppSpacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeToggle: {
    borderRadius: AppBorderRadius.lg,
    padding: AppSpacing.md,
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIcon: {
    width: 36,
    height: 36,
    borderRadius: AppBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppSpacing.md,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeSubtitle: {
    fontSize: AppFontSizes.xs,
  },
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: AppBorderRadius.full,
    padding: 2,
    justifyContent: 'center',
  },
  toggleIndicator: {
    width: 16,
    height: 16,
    borderRadius: AppBorderRadius.full,
  },
  footer: {
    padding: AppSpacing.lg,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: AppBorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AppSpacing.md,
  },
  logoutText: {
    fontSize: AppFontSizes.md,
    fontWeight: '600',
  },
}); 