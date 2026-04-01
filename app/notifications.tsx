import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { DEFAULT_NOTIFICATION_PREFS, isNotificationTypeEnabled, type NotificationPrefs } from '../src/lib/notificationPreferences';

function formatRelative(dateStr?: string) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { api, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [filter, setFilter] = useState<'all' | 'offers' | 'services' | 'payments'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const loadedPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_preferences || {}) };
    const res = await api('/notifications');
    setPrefs(loadedPrefs);
    setItems((res.notifications || []).filter((item: any) => isNotificationTypeEnabled(item.type, loadedPrefs)));
  }, [api, user?.notification_preferences]);

  useFocusEffect(useCallback(() => {
    load().catch(() => {});
  }, [load]));

  useEffect(() => {
    api('/notifications/read', { method: 'PUT' }).catch(() => {});
  }, [api]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpen = async (item: any) => {
    try {
      await api(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
      if (item.payload?.service_id) {
        router.push(`/service/${item.payload.service_id}` as any);
        return;
      }
    } finally {
      if (!item.payload?.service_id) router.back();
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'offers') return ['new_offer', 'offer_accepted', 'offer_rejected'].includes(item.type);
    if (filter === 'services') return ['service_request', 'service_accepted', 'service_completed', 'review_received'].includes(item.type);
    if (filter === 'payments') return ['payment_received', 'payment_released'].includes(item.type);
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notificaciones</Text>
            <Text style={styles.subtitle}>Alertas de ofertas, cambios y actividad de tus servicios.</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'offers', label: 'Ofertas' },
            { key: 'services', label: 'Servicios' },
            { key: 'payments', label: 'Pagos' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key as any)}
            >
              <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Todavia no hay novedades</Text>
            <Text style={styles.emptyText}>
              {prefs ? 'Con tu filtro actual no hay alertas para mostrar.' : 'Cuando pase algo importante en tus servicios te lo mostramos aca.'}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => handleOpen(item)} activeOpacity={0.8}>
              <View style={[styles.iconWrap, !item.read_at && styles.iconWrapUnread]}>
                <Ionicons name="notifications-outline" size={18} color={!item.read_at ? Colors.white : Colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardTime}>{formatRelative(item.created_at)}</Text>
                </View>
                <Text style={styles.cardText}>{item.body}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 3, lineHeight: 20 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.primary },
  emptyBox: { paddingVertical: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: Colors.textMuted, marginTop: 6, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  card: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, marginBottom: 10, backgroundColor: Colors.card },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  iconWrapUnread: { backgroundColor: Colors.primary },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  cardTime: { fontSize: 12, color: Colors.textMuted },
  cardText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
