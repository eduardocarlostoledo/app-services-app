import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/context/AuthContext';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '../src/lib/notificationPreferences';

const ITEMS: { key: keyof NotificationPrefs; title: string; description: string }[] = [
  { key: 'offers', title: 'Ofertas', description: 'Alertas cuando entran nuevas cotizaciones o cambia el estado de una oferta.' },
  { key: 'service_updates', title: 'Servicios', description: 'Novedades del trabajo, aceptaciones, finalizacion y seguimiento.' },
  { key: 'payments', title: 'Pagos', description: 'Cambios de estado relacionados con pagos y liberaciones.' },
  { key: 'promotions', title: 'Promociones', description: 'Mensajes del sistema, anuncios y promociones futuras.' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { api, user, refreshUser } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    if (user?.notification_preferences) {
      setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...user.notification_preferences });
      return;
    }
    api('/users/notification-preferences')
      .then((res: any) => setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...(res.notification_preferences || {}) }))
      .catch(() => {});
  }, [api, user?.notification_preferences]);

  const toggle = async (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await api('/users/notification-preferences', { method: 'PATCH', data: next });
    await refreshUser().catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Preferencias de notificacion</Text>
            <Text style={styles.subtitle}>Elegi que alertas queres ver en la app en tiempo real.</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>Estas preferencias controlan el badge, las alertas in-app y la bandeja local del dispositivo.</Text>
        </View>

        {ITEMS.map((item) => (
          <View key={item.key} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>{item.description}</Text>
            </View>
            <Switch
              value={prefs[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: '#d4d4d8', true: '#c4b5fd' }}
              thumbColor={prefs[item.key] ? Colors.primary : '#f4f4f5'}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 12 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 8 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 3, lineHeight: 20 },
  infoBox: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 16, backgroundColor: Colors.accent, borderWidth: 1, borderColor: '#e9ddff' },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, backgroundColor: Colors.card },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  cardText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
});
