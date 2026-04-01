import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { useAuthStore, useNotificationStore } from './store';
import SocketService from './socket.service';

// Auth Screens
import LoginScreen from './screens/Auth/LoginScreen';
import RegisterScreen from './screens/Auth/RegisterScreen';
import ForgotPasswordScreen from './screens/Auth/ForgotPasswordScreen';
import RoleSelectScreen from './screens/Auth/RoleSelectScreen';

// Client Screens
import HomeScreen from './screens/Home/HomeScreen';
import ServiceRequestScreen from './screens/Service/ServiceRequestScreen';
import ReviewScreen from './screens/Service/ReviewScreen';
import TrackingScreen from './screens/Tracking/TrackingScreen';
import NotificationsScreen from './screens/Notifications/NotificationsScreen';
import ProfileScreen from './screens/Profile/ProfileScreen';
import ChatScreen from './screens/Chat/ChatScreen';
import DisputeScreen from './screens/Dispute/DisputeScreen';

// Payment
import MPCheckoutScreen from './screens/Payment/MPCheckoutScreen';

// Provider Screens
import ProviderDashboard from './screens/Provider/ProviderDashboard';
import ActiveServiceScreen from './screens/Provider/ActiveServiceScreen';
import ProviderProfileEdit from './screens/Provider/ProviderProfileEdit';
import EarningsScreen from './screens/Provider/EarningsScreen';
import CreditsScreen from './screens/Provider/CreditsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, color, size = 22 }) => {
  const icons = {
    home: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/><Path d="M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>,
    tools: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>,
    history: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2}/><Path d="M12 6v6l4 2" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>,
    chat: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>,
    money: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth={2}/><Path d="M1 10h22" stroke={color} strokeWidth={2}/></Svg>,
    user: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round"/><Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2}/></Svg>,
    bell: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>,
  };
  return icons[name] || null;
};

const tabColors = {
  active: '#895bf5',
  inactive: '#9CA3AF',
};

const tabBarStyle = {
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: '#E5E7EB',
  height: 64,
  paddingBottom: 8,
  paddingTop: 6,
};

const tabBarLabelStyle = {
  fontSize: 11,
  fontWeight: '600',
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH STACK
// ═══════════════════════════════════════════════════════════════════════════════
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT TABS
// ═══════════════════════════════════════════════════════════════════════════════
const ClientTabs = () => {
  const { unreadCount } = useNotificationStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: tabColors.active,
        tabBarInactiveTintColor: tabColors.inactive,
        tabBarLabelStyle,
        tabBarIcon: ({ color }) => {
          const iconMap = { Home: 'home', Services: 'history', Messages: 'chat', Profile: 'user' };
          return <TabIcon name={iconMap[route.name] || 'home'} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={ClientHomeStack} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Services" component={ServiceHistoryScreen} options={{ title: 'Servicios' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{
        title: 'Mensajes',
        tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
};

const ClientHomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
    <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
    <Stack.Screen name="Tracking" component={TrackingScreen} />
    <Stack.Screen name="Review" component={ReviewScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Dispute" component={DisputeScreen} />
    <Stack.Screen name="MPCheckout" component={MPCheckoutScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// Placeholder screens
const ServiceHistoryScreen = () => {
  const { useServiceStore } = require('./store');
  const { myServices, loadMyServices } = useServiceStore();
  React.useEffect(() => { loadMyServices(); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16, marginTop: 48 }}>Mis servicios</Text>
    </View>
  );
};

const MessagesScreen = () => {
  const { ChatAPI } = require('./api.service');
  const [conversations, setConversations] = React.useState([]);
  React.useEffect(() => {
    ChatAPI.getConversations().then(({ data }) => setConversations(data.conversations || [])).catch(console.log);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16, marginTop: 48 }}>Mensajes</Text>
      {conversations.length === 0 && <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 40 }}>Sin conversaciones</Text>}
    </View>
  );
};

const ServiceDetailScreen = ({ navigation, route }) => {
  const { serviceId } = route.params || {};
  const [service, setService] = React.useState(null);
  React.useEffect(() => {
    if (serviceId) {
      const { ServiceAPI } = require('./api.service');
      ServiceAPI.getById(serviceId).then(({ data }) => setService(data.service)).catch(console.log);
    }
  }, [serviceId]);
  if (!service) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#895bf5" /></View>;
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 24, paddingTop: 48 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>{service.description}</Text>
      <Text style={{ color: '#71717a', marginBottom: 4 }}>Estado: {service.status}</Text>
      <Text style={{ color: '#71717a', marginBottom: 4 }}>Direccion: {service.address}</Text>
      {service.final_price && <Text style={{ color: '#059669', fontWeight: '700', fontSize: 18 }}>${service.final_price}</Text>}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER TABS
// ═══════════════════════════════════════════════════════════════════════════════
const ProviderTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle,
      tabBarActiveTintColor: tabColors.active,
      tabBarInactiveTintColor: tabColors.inactive,
      tabBarLabelStyle,
      tabBarIcon: ({ color }) => {
        const iconMap = { Dashboard: 'tools', Earnings: 'money', Credits: 'bell', ProviderProfile: 'user' };
        return <TabIcon name={iconMap[route.name] || 'home'} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={ProviderDashboardStack} options={{ title: 'Panel' }} />
    <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Ingresos' }} />
    <Tab.Screen name="Credits" component={CreditsScreen} options={{ title: 'Creditos' }} />
    <Tab.Screen name="ProviderProfile" component={ProviderProfileEdit} options={{ title: 'Mi Perfil' }} />
  </Tab.Navigator>
);

const ProviderDashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProviderHome" component={ProviderDashboard} />
    <Stack.Screen name="ActiveService" component={ActiveServiceScreen} />
    <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
    <Stack.Screen name="Chat" component={ChatScreen} />
    <Stack.Screen name="Dispute" component={DisputeScreen} />
    <Stack.Screen name="Review" component={ReviewScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT NAVIGATOR
// ═══════════════════════════════════════════════════════════════════════════════
export default function AppNavigator() {
  const { user, accessToken, loading, init, loadProfile } = useAuthStore();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (accessToken && user) {
      loadProfile();
      SocketService.connectSocket(accessToken, user.role);
    }
  }, [accessToken]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFF' }}>
        <ActivityIndicator size="large" color="#895bf5" />
      </View>
    );
  }

  const isProvider = user?.role === 'provider';
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const needsRoleSelect = user && !user.role;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!accessToken ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : needsRoleSelect ? (
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        ) : isProvider ? (
          <Stack.Screen name="ProviderApp" component={ProviderTabs} />
        ) : (
          <Stack.Screen name="ClientApp" component={ClientTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
