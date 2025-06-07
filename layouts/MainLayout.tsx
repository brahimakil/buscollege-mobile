import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { useTheme } from '../contexts/ThemeContext';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  currentRoute,
  onNavigate,
}) => {
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={title}
        onMenuPress={() => setSidebarVisible(true)}
      />
      
      <View style={styles.content}>
        {children}
      </View>
      
      <Footer />
      
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onNavigate={onNavigate}
        currentRoute={currentRoute}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
}); 