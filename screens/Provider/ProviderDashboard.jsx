import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Switch,
} from 'react-native';
import { ServiceAPI, ProviderAPI, getApiError } from '../../api.service';
import { useAuthStore, useNotificationStore } from '../../store';

const COLORS = {
  primary: '#895bf5',
  primaryLight: '#F3F0FF',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  successLight: '#ECFDF5',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

const STATUS_BADGES = {
  pending: { label: 'Pendiente', color: COLORS.warning },
  accepted: { label: 'Aceptado', color: COLORS.primary },
  in_progress: { label: 'En curso', color: COLORS.success },
  completed: { label: 'Completado', color: '#10B981' },
};

export default function ProviderDashboard({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const [services, setServices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(user?.is_available ?? false);

  const loadServices = useCallback(async () => {
    try {
      const { data } = await ServiceAPI.getAll({ role: 'provider' });
      setServices(data.services || []);
    } catch (err) {
      console.log('Dashboard error:', getApiError(err));
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const toggleAvailability = async (value) => {
    setAvailable(value);
    try {
      await ProviderAPI.updateAvailability(value);
    } catch (err) {
      setAvailable(!value);
      console.log('Toggle error:', getApiError(err));
    }
  };

  const activeServices = services.filter((s) => ['accepted', 'in_progress'].includes(s.status));
  const pendingServices = services.filter((s) => s.status === 'pending');

  const renderService = ({ item }) => {
    const badge = STATUS_BADGES[item.status] || { label: item.status, color: COLORS.muted };
    return (
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => {
          if (['accepted', 'in_progress'].includes(item.status)) {
            navigation.navigate('ActiveService', { serviceId: item.id });
          } else {
            navigation.navigate('ServiceDetail', { serviceId: item.id });
          }
        }}
      >
        <View style={styles.serviceHeader}>
          <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {item.final_price && (
            <Text style={styles.servicePrice}>${item.final_price}</Text>
          )}
        </View>
        <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
        <Text style={styles.serviceAddr} numberOfLines={1}>{item.address}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.first_name || 'Proveedor'}</Text>
          <Text style={styles.subtitle}>Panel de servicios</Text>
        </View>
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={{ fontSize: 20 }}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availCard}>
        <View>
          <Text style={styles.availLabel}>Disponibilidad</Text>
          <Text style={styles.availSub}>
            {available ? 'Recibiendo solicitudes' : 'No disponible'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#D1D5DB', true: COLORS.primary + '60' }}
          thumbColor={available ? COLORS.primary : '#9CA3AF'}
        />
      </View>

      {/* Active Services */}
      {activeServices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios activos ({activeServices.length})</Text>
          {activeServices.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.serviceCard, { borderLeftWidth: 4, borderLeftColor: COLORS.success }]}
              onPress={() => navigation.navigate('ActiveService', { serviceId: s.id })}
            >
              <Text style={styles.serviceDesc} numberOfLines={1}>{s.description}</Text>
              <Text style={styles.serviceAddr}>{s.address}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* All Services */}
      <FlatList
        data={pendingServices}
        keyExtractor={(item) => item.id}
        renderItem={renderService}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Solicitudes disponibles ({pendingServices.length})</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay solicitudes por ahora</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.white },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  notifBtn: { position: 'relative', padding: 8 },
  notifBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  availCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  availLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  availSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  serviceCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  servicePrice: { fontSize: 16, fontWeight: '800', color: COLORS.success },
  serviceDesc: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  serviceAddr: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  emptyText: { textAlign: 'center', color: COLORS.muted, fontSize: 14, marginTop: 40 },
});
