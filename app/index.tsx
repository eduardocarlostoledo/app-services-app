import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';

export default function Splash() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (user && user.role) router.replace('/(tabs)');
      else if (user && !user.role) router.replace('/role-select');
      else router.replace('/login');
    }, 1500);
    return () => clearTimeout(timer);
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logo}>CHANGAS</Text>
        <Text style={styles.sub}>Servicios Competitivos</Text>
      </View>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center' },
  logoBox: { alignItems: 'center' },
  logo: { fontSize: 38, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  sub: { fontSize: 18, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  loader: { position: 'absolute', bottom: 80 },
});
