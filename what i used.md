# 1.4) Technology Constraints

**The Mobile Application must conform to the following information technology standards:**

## **React Native (0.79.3)**
- **What did you use this technology/feature for?**: Core framework for building the cross-platform mobile application, providing native iOS and Android components like View, Text, TextInput, TouchableOpacity, ScrollView, and StyleSheet for UI development.
- **Why did you choose it?**: Enables code reuse across iOS and Android platforms while maintaining native performance, reduces development time, and provides access to native device features.
- **How did you implement it in your project?**: Used throughout all screen components (LoginScreen.tsx, RegisterScreen.tsx, RiderDashboard.tsx, etc.), implemented native components for UI elements, and utilized React Native's StyleSheet for component styling.

## **Expo (SDK ~53.0.10)**
- **What did you use this technology/feature for?**: Development platform providing tools for building, testing, and deploying the React Native application with integrated services like splash screens, secure storage, and routing.
- **Why did you choose it?**: Simplifies development workflow, provides easy access to native device features, and streamlines the build and deployment process.
- **How did you implement it in your project?**: Configured in `app.json` with plugins for expo-router, expo-splash-screen, and expo-secure-store. Used Expo CLI commands in package.json scripts for running on different platforms.

## **TypeScript (~5.8.3)**
- **What did you use this technology/feature for?**: Adding static type checking to JavaScript code, defining interfaces for data structures like UserData, BusData, and component props.
- **Why did you choose it?**: Improves code quality, catches errors at compile time, provides better IDE support, and makes the codebase more maintainable.
- **How did you implement it in your project?**: Configured in `tsconfig.json` with strict mode, used throughout all `.tsx` files, defined interfaces in contexts (AuthContext.tsx, ThemeContext.tsx), and typed Firebase data structures.

## **Firebase (^10.7.1)**
- **What did you use this technology/feature for?**: Backend-as-a-Service providing authentication, real-time database, and user management for the bus college application.
- **Why did you choose it?**: Offers real-time data synchronization, handles authentication complexity, provides scalable backend infrastructure, and has excellent React Native integration.
- **How did you implement it in your project?**: Configured in `config/firebase.ts` with project credentials, initialized Firebase app, authentication, and Firestore services. Used throughout the app for user management and data operations.

## **Firestore (Firebase Database)**
- **What did you use this technology/feature for?**: NoSQL document database storing user data, bus routes, driver assignments, and rider subscriptions with real-time synchronization.
- **Why did you choose it?**: Provides real-time updates, offline support, automatic scaling, and seamless integration with Firebase Authentication.
- **How did you implement it in your project?**: Implemented in `contexts/AuthContext.tsx` for user data management, used in `services/SubscriptionService.ts` for handling bus subscriptions, and integrated in dashboard screens for fetching and updating bus information.

## **Expo Router (~5.0.7)**
- **What did you use this technology/feature for?**: File-based routing system for navigation between screens, handling deep linking, and organizing the app's navigation structure.
- **Why did you choose it?**: Provides intuitive file-based routing, supports typed routes, handles deep linking automatically, and integrates well with Expo.
- **How did you implement it in your project?**: Used `useRouter()` hook in components for navigation, configured in `app.json` with typedRoutes experiment, and implemented programmatic navigation in authentication flows and dashboard components.

## **React Context API**
- **What did you use this technology/feature for?**: Global state management for authentication, theme preferences, toast notifications, and user data across the application.
- **Why did you choose it?**: Built into React, eliminates prop drilling, provides centralized state management, and is sufficient for the app's complexity level.
- **How did you implement it in your project?**: Created `AuthContext.tsx` for user authentication state, `ThemeContext.tsx` for light/dark mode management, `ToastContext.tsx` for notifications, and `FavoritesContext.tsx` for user preferences.

## **Expo Vector Icons (^14.1.0)**
- **What did you use this technology/feature for?**: Comprehensive icon library providing Ionicons for UI elements, buttons, navigation, and status indicators throughout the application.
- **Why did you choose it?**: Offers extensive icon collection, optimized for mobile performance, consistent styling, and excellent React Native integration.
- **How did you implement it in your project?**: Used `@expo/vector-icons` Ionicons throughout components like Sidebar.tsx, Toast.tsx, ThemeToggle.tsx, and various screens for visual elements and user interface icons.

## **React Native Reanimated (~3.17.4)**
- **What did you use this technology/feature for?**: Creating smooth, performant animations for UI transitions, toast notifications, and interactive elements.
- **Why did you choose it?**: Runs animations on the UI thread for better performance, provides powerful animation APIs, and offers smooth user experience.
- **How did you implement it in your project?**: Implemented in `components/ui/Toast.tsx` for slide-in/slide-out animations using Animated.timing, and used for smooth transitions in UI components.

## **React Native Maps (^1.10.0)**
- **What did you use this technology/feature for?**: Displaying interactive maps showing bus routes, locations, and real-time tracking for riders and drivers.
- **Why did you choose it?**: Provides native map performance, supports both iOS and Android, offers customizable markers and routes, and integrates with location services.
- **How did you implement it in your project?**: Created `components/map/MapComponent.tsx` with conditional rendering for web and mobile platforms, integrated with bus route data, and implemented location-based features for the dashboard.

## **React Native QR Code SVG (^6.3.15)**
- **What did you use this technology/feature for?**: Generating QR codes for bus subscriptions, ticket verification, and digital pass functionality.
- **Why did you choose it?**: Lightweight, customizable QR code generation, supports SVG format, and provides good performance on mobile devices.
- **How did you implement it in your project?**: Integrated for subscription management and digital ticket generation in the rider dashboard and bus booking system.

## **Expo Secure Store (~14.2.3)**
- **What did you use this technology/feature for?**: Securely storing sensitive user data like authentication tokens, user preferences, and credentials with hardware-backed encryption.
- **Why did you choose it?**: Provides secure storage with hardware encryption when available, better security than AsyncStorage for sensitive data, and easy integration with Expo.
- **How did you implement it in your project?**: Configured as plugin in `app.json`, used for storing authentication tokens and secure user data in the authentication flow.

## **Custom Theme System**
- **What did you use this technology/feature for?**: Implementing light/dark mode support with dynamic color schemes, consistent styling, and user preference management.
- **Why did you choose it?**: Provides better user experience, supports accessibility requirements, allows personalization, and maintains consistent design across the app.
- **How did you implement it in your project?**: Created `ThemeContext.tsx` for theme management, `themes/colors.ts` for color definitions, implemented `ThemeToggle.tsx` component, and applied dynamic styling throughout all components.

## **React Native Gesture Handler (~2.24.0)**
- **What did you use this technology/feature for?**: Handling advanced touch interactions, swipe gestures, and smooth user interactions throughout the mobile application.
- **Why did you choose it?**: Provides better touch handling than basic React Native gestures, runs on UI thread for smooth performance, and offers comprehensive gesture recognition.
- **How did you implement it in your project?**: Integrated for enhanced touch interactions in navigation, scrollable components, and interactive UI elements across the application.

**Additional Mobile-Specific Requirements:**

- **Internet Connectivity**: The application requires internet access via mobile network (3G/4G/5G) or Wi-Fi for real-time Firebase synchronization, authentication, and map services. Stronger signal ensures better application performance.

- **Platform Support**: The application supports both iOS and Android platforms with adaptive UI components, platform-specific optimizations configured in `app.json`, and edge-to-edge display support.
