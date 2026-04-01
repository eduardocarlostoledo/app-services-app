import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, SafeAreaView, Modal, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getRandomExamples } from '../../src/constants/serviceExamples';
import { getRandomActivities, getDailyCompletedCount } from '../../src/constants/activityFeed';
import { on, off } from '../../socket.service';
import { DEFAULT_NOTIFICATION_PREFS, isNotificationTypeEnabled } from '../../src/lib/notificationPreferences';
import * as Location from 'expo-location';

const LILAC = '#A855F7';
const LILAC_BG = '#F3E8FF';

function formatMoney(n: number) {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

const SERVICE_ICONS: { [key: string]: { icon: string; color: string; bg: string } } = {
  'canilla': { icon: 'water', color: '#3b82f6', bg: '#dbeafe' },
  'agua': { icon: 'water', color: '#3b82f6', bg: '#dbeafe' },
  'plom': { icon: 'water', color: '#3b82f6', bg: '#dbeafe' },
  'pasto': { icon: 'leaf', color: '#ef4444', bg: '#fee2e2' },
  'jardin': { icon: 'leaf', color: '#ef4444', bg: '#fee2e2' },
  'podar': { icon: 'leaf', color: '#ef4444', bg: '#fee2e2' },
  'pint': { icon: 'color-palette', color: '#f59e0b', bg: '#fef3c7' },
  'mueble': { icon: 'cube', color: '#f97316', bg: '#ffedd5' },
  'mudar': { icon: 'cube', color: '#f97316', bg: '#ffedd5' },
  'aire': { icon: 'snow', color: '#06b6d4', bg: '#cffafe' },
  'electric': { icon: 'flash', color: '#eab308', bg: '#fef9c3' },
  'luz': { icon: 'flash', color: '#eab308', bg: '#fef9c3' },
  'limpi': { icon: 'sparkles', color: '#8b5cf6', bg: '#ede9fe' },
  'arreglo': { icon: 'construct', color: '#f59e0b', bg: '#fef3c7' },
  'repar': { icon: 'construct', color: '#f59e0b', bg: '#fef3c7' },
};
const DEFAULT_ICON = { icon: 'hammer', color: '#f59e0b', bg: '#fef3c7' };

function getServiceIcon(title: string) {
  const lower = title.toLowerCase();
  for (const key of Object.keys(SERVICE_ICONS)) {
    if (lower.includes(key)) return SERVICE_ICONS[key];
  }
  return DEFAULT_ICON;
}

const statusConfig: any = {
  published: { label: 'Publicado', color: '#059669', bg: '#ecfdf5' },
  in_offers: { label: 'En ofertas', color: '#f59e0b', bg: '#fef3c7' },
  provider_selected: { label: 'Elegido', color: '#895bf5', bg: '#f2f0ff' },
  paid: { label: 'Pagado', color: '#059669', bg: '#ecfdf5' },
  in_progress: { label: 'En progreso', color: '#3b82f6', bg: '#dbeafe' },
  work_finished: { label: 'Finalizado', color: '#059669', bg: '#ecfdf5' },
  completed: { label: 'Completado', color: '#059669', bg: '#ecfdf5' },
  in_dispute: { label: 'En disputa', color: '#db2424', bg: '#fef1f1' },
};

function ClientHome() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [examples, setExamples] = useState<{ title: string; description: string }[]>([]);

  const loadExamples = useCallback(() => { setExamples(getRandomExamples(8)); }, []);

  const load = useCallback(async () => {
    try {
      const [svc, notif] = await Promise.all([
        api('/services/my'),
        api('/notifications/unread-count').catch(() => ({ count: 0 }))
      ]);
      const list = svc.services || svc || [];
      setServices(list.filter((c: any) => !['completed', 'cancelled'].includes(c.status)));
      setUnread(notif.count || 0);
    } catch (e) { console.log(e); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); loadExamples(); }, [load, loadExamples]));

  useEffect(() => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_preferences || {}) };
    const handleNewOffer = (data: any) => {
      if (!isNotificationTypeEnabled('new_offer', prefs)) return;
      setUnread((value) => value + 1);
      load();
      Alert.alert(
        'Nueva oferta recibida',
        `${data?.offer?.provider_name || 'Un proveedor'} te cotizo ${data?.offer?.price ? `$${Number(data.offer.price).toLocaleString('es-AR')}` : 'tu servicio'}.`,
        [
          { text: 'Ver', onPress: () => router.push(`/service/${data.serviceId}` as any) },
          { text: 'Despues', style: 'cancel' },
        ]
      );
    };

    const handleGenericNotification = (notification: any) => {
      if (notification?.type === 'new_offer') return;
      if (!isNotificationTypeEnabled(notification?.type || 'system', prefs)) return;
      setUnread((value) => value + 1);
    };

    on('service:new_offer', handleNewOffer);
    on('notification:new', handleGenericNotification);
    return () => {
      off('service:new_offer');
      off('notification:new');
    };
  }, [load, router, user?.notification_preferences]);

  const onRefresh = async () => { setRefreshing(true); await load(); loadExamples(); setRefreshing(false); };

  const handleExamplePress = (example: { title: string; description: string }) => {
    router.push({ pathname: '/publish', params: { title: example.title, description: example.description } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.first_name || 'Cliente'}</Text>
            <View style={styles.modeBadge}>
              <MaterialCommunityIcons name="briefcase-outline" size={14} color={LILAC} />
              <Text style={styles.modeBadgeText}>Cliente</Text>
            </View>
          </View>
          <TouchableOpacity testID="notif-bell" style={styles.bellBtn} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {unread > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity testID="publish-service-btn" style={styles.publishBtn}
          onPress={() => router.push('/publish')} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={24} color={Colors.white} />
          <Text style={styles.publishText}>Publicar servicio</Text>
        </TouchableOpacity>

        {services.length > 0 && (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>Tus servicios activos</Text>
            {services.map(c => {
              const ic = getServiceIcon(c.title);
              const st = statusConfig[c.status] || statusConfig.published;
              return (
                <TouchableOpacity testID={`service-card-${c.id}`} key={c.id} style={styles.serviceCard}
                  onPress={() => {
                    if (['in_progress', 'paid'].includes(c.status)) router.push(`/progress/${c.id}`);
                    else if (c.status === 'work_finished') router.push(`/confirm/${c.id}`);
                    else router.push(`/service/${c.id}`);
                  }} activeOpacity={0.8}>
                  <View style={[styles.serviceIcon, { backgroundColor: ic.bg }]}>
                    <Ionicons name={ic.icon as any} size={22} color={ic.color} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>{c.title}</Text>
                    <View style={styles.serviceMetaRow}>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.examplesSection}>
          <Text style={styles.sectionTitle}>Que necesitas hoy?</Text>
          <Text style={styles.sectionSubtitle}>Elegi un ejemplo o publica tu propio servicio</Text>
          <View style={styles.examplesList}>
            {examples.map((ex, index) => {
              const ic = getServiceIcon(ex.title);
              return (
                <TouchableOpacity key={index} testID={`example-${index}`} style={styles.exampleCard}
                  onPress={() => handleExamplePress(ex)} activeOpacity={0.7}>
                  <View style={[styles.exampleIcon, { backgroundColor: ic.bg }]}>
                    <Ionicons name={ic.icon as any} size={18} color={ic.color} />
                  </View>
                  <Text style={styles.exampleTitle} numberOfLines={2}>{ex.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProviderHome() {
  const { user, api, updateUser } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [newRequestAlert, setNewRequestAlert] = useState<any>(null);

  const loadActivityData = useCallback(() => {
    setActivities(getRandomActivities(8));
    setDailyCount(getDailyCompletedCount());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          await updateUser({ lat: loc.coords.latitude, lng: loc.coords.longitude }).catch(() => {});
        }
      } catch (e) { console.log('GPS error', e); }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const [feed, notif] = await Promise.all([
        api('/services/feed'),
        api('/notifications/unread-count').catch(() => ({ count: 0 }))
      ]);
      const list = feed.services || feed || [];
      setServices(list);
      setUnread(notif.count || 0);
    } catch (e) { console.log(e); }
  }, [api]);

  useFocusEffect(useCallback(() => {
    load(); loadActivityData();
  }, [load, loadActivityData]));

  // Listen for new service requests via Socket.io
  useEffect(() => {
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_preferences || {}) };
    const handleNewRequest = (data: any) => {
      // Reload feed to show the new service
      load();
      if (!isNotificationTypeEnabled('service_request', prefs)) return;
      setUnread((value) => value + 1);
      Alert.alert(
        'Nuevo servicio disponible',
        `${data.categoryName || 'Servicio'} en ${data.address || 'tu zona'}`,
        [
          { text: 'Ver', onPress: () => router.push(`/service/${data.serviceId}`) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    };

    on('service:new_request', handleNewRequest);
    on('notification:new', (notification: any) => {
      if (notification?.type === 'service_request') return;
      if (!isNotificationTypeEnabled(notification?.type || 'system', prefs)) return;
      setUnread((value) => value + 1);
    });
    return () => {
      off('service:new_request');
      off('notification:new');
    };
  }, [load, router, user?.notification_preferences]);

  const onRefresh = async () => { setRefreshing(true); await load(); loadActivityData(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Este trabajo ya fue completado.</Text>
            <Text style={styles.modalText}>Pronto apareceran nuevos servicios cerca tuyo.</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowModal(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.first_name || 'Operario'}</Text>
            <View style={styles.modeBadge}>
              <MaterialCommunityIcons name="hammer-wrench" size={14} color={LILAC} />
              <Text style={styles.modeBadgeText}>Operario</Text>
            </View>
          </View>
          <TouchableOpacity testID="notif-bell" style={styles.bellBtn} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {unread > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="star" size={22} color="#eab308" />
            <Text style={styles.statValue}>{user?.Provider?.rating || user?.rating || 0}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-done" size={22} color="#22c55e" />
            <Text style={styles.statValue}>{user?.Provider?.total_services || user?.total_services || 0}</Text>
            <Text style={styles.statLabel}>Servicios</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="wallet" size={22} color="#3b82f6" />
            <Text style={styles.statValue}>{formatMoney(0)}</Text>
            <Text style={styles.statLabel}>Ganado</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Servicios cerca tuyo</Text>

        {services.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <Ionicons name="location-outline" size={32} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyStateTitle}>Todavia no encontramos servicios cerca tuyo.</Text>
            <Text style={styles.emptyStateText}>Nuevos servicios se publican todo el tiempo. Volve a revisar en unos minutos.</Text>
          </View>
        ) : (
          services.map(c => {
            const ic = getServiceIcon(c.title);
            const st = statusConfig[c.status] || statusConfig.published;
            return (
              <TouchableOpacity testID={`feed-service-${c.id}`} key={c.id} style={styles.serviceCard}
                onPress={() => router.push(`/service/${c.id}`)} activeOpacity={0.8}>
                <View style={[styles.serviceIcon, { backgroundColor: ic.bg }]}>
                  <Ionicons name={ic.icon as any} size={22} color={ic.color} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle} numberOfLines={1}>{c.title}</Text>
                  <View style={styles.serviceLocRow}>
                    <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.serviceMeta}>{c.distance} km</Text>
                  </View>
                  <View style={styles.serviceMetaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Actividad reciente</Text>
          <View style={styles.dailyCountRow}>
            <Ionicons name="flash" size={16} color="#22c55e" />
            <Text style={styles.dailyCountText}>Hoy se completaron <Text style={styles.dailyCountNumber}>{dailyCount}</Text> servicios</Text>
          </View>
        </View>
        {activities.map((activity, index) => (
          <TouchableOpacity key={index} testID={`activity-${index}`} style={styles.activityItem}
            onPress={() => setShowModal(true)} activeOpacity={0.7}>
            <Text style={styles.activityText}>{activity.text}</Text>
            <Text style={styles.activityMeta}>${activity.price.toLocaleString('es-AR')} - {activity.distance_km} km</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen() {
  const { user, loading } = useAuth();
  if (loading) return <View style={styles.safe}><Text style={styles.loadingText}>Cargando...</Text></View>;
  if (user?.role === 'provider') return <ProviderHome />;
  return <ClientHome />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  loadingText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 28, fontWeight: '800', color: Colors.text },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: LILAC_BG },
  modeBadgeText: { fontSize: 12, fontWeight: '600', color: LILAC },
  bellBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f4f4f5', justifyContent: 'center', alignItems: 'center' },
  bellBadge: { position: 'absolute', top: 10, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: '#db2424', borderWidth: 2, borderColor: '#f4f4f5' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#f4f4f5', borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  publishBtn: { backgroundColor: Colors.primary, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  publishText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  sectionSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 14 },
  activeSection: { marginBottom: 20 },
  examplesSection: { marginBottom: 20 },
  examplesList: { gap: 10 },
  exampleCard: { width: '100%', backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f0f0f2', flexDirection: 'row', alignItems: 'center', gap: 10 },
  exampleIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  exampleTitle: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f2' },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceInfo: { flex: 1, marginRight: 8 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  serviceLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  serviceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  serviceMeta: { fontSize: 12, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyStateBox: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f2', marginBottom: 10 },
  emptyStateTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  emptyStateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 28, alignItems: 'center', width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  modalText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  modalBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  activitySection: { marginTop: 24, marginBottom: 12 },
  dailyCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8 },
  dailyCountText: { fontSize: 14, color: Colors.textSecondary },
  dailyCountNumber: { fontWeight: '800', color: '#22c55e' },
  activityItem: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f2' },
  activityText: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  activityMeta: { fontSize: 13, color: Colors.textMuted },
});
