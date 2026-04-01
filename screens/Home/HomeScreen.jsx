import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, SafeAreaView, Modal } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore, useNotificationStore } from '../../store';
import { ServiceAPI } from '../../api.service';
import { Colors } from '../../constants/colors';
import { getRandomExamples } from '../../constants/serviceExamples';
import Svg, { Path, Circle } from 'react-native-svg';

const LILAC = '#A855F7';
const LILAC_BG = '#F3E8FF';

function formatMoney(n) {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

const statusConfig = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
  accepted: { label: 'Aceptado', color: '#895bf5', bg: '#f2f0ff' },
  in_progress: { label: 'En progreso', color: '#3b82f6', bg: '#dbeafe' },
  completed: { label: 'Completado', color: '#059669', bg: '#ecfdf5' },
  cancelled: { label: 'Cancelado', color: '#db2424', bg: '#fef1f1' },
  disputed: { label: 'En disputa', color: '#db2424', bg: '#fef1f1' },
};

// Simple icon component using SVG
const SimpleIcon = ({ name, size = 22, color = '#000' }) => {
  const icons = {
    home: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth={2}/><Path d="M9 22V12h6v10" stroke={color} strokeWidth={2}/></Svg>,
    add: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2}/><Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>,
    bell: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>,
    chevron: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>,
    star: <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></Svg>,
    check: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>,
    wallet: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 12V8H6a2 2 0 010-4h12v4" stroke={color} strokeWidth={2}/><Path d="M4 6v12a2 2 0 002 2h14V12" stroke={color} strokeWidth={2}/><Circle cx="18" cy="16" r="1" fill={color}/></Svg>,
    wrench: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={2}/></Svg>,
    location: <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth={2}/><Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2}/></Svg>,
  };
  return icons[name] || null;
};

function ClientHome({ navigation }) {
  const { user } = useAuthStore();
  const { unreadCount, loadUnreadCount } = useNotificationStore();
  const [services, setServices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [examples, setExamples] = useState([]);
  const isFocused = useIsFocused();

  const load = useCallback(async () => {
    try {
      const [svcRes] = await Promise.all([
        ServiceAPI.getAll({ status: 'pending,accepted,in_progress' }),
        loadUnreadCount(),
      ]);
      setServices(svcRes.data?.services || []);
    } catch (e) { console.log(e); }
  }, []);

  useEffect(() => {
    if (isFocused) {
      load();
      setExamples(getRandomExamples(8));
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setExamples(getRandomExamples(8));
    setRefreshing(false);
  };

  const profileName = user?.profile?.first_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hola, {profileName}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>Cliente</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <SimpleIcon name="bell" size={24} color={Colors.text} />
            {unreadCount > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.publishBtn}
          onPress={() => navigation.navigate('ServiceRequest')} activeOpacity={0.85}>
          <SimpleIcon name="add" size={24} color={Colors.white} />
          <Text style={styles.publishText}>Solicitar servicio</Text>
        </TouchableOpacity>

        {/* Active services */}
        {services.length > 0 && (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>Tus servicios activos</Text>
            {services.map((s) => {
              const st = statusConfig[s.status] || statusConfig.pending;
              return (
                <TouchableOpacity key={s.id} style={styles.serviceCard}
                  onPress={() => {
                    if (s.status === 'in_progress') navigation.navigate('Tracking', { serviceId: s.id });
                    else navigation.navigate('ServiceDetail', { serviceId: s.id });
                  }} activeOpacity={0.8}>
                  <View style={[styles.serviceIcon, { backgroundColor: '#fef3c7' }]}>
                    <SimpleIcon name="wrench" size={22} color="#f59e0b" />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>{s.description}</Text>
                    <View style={styles.serviceMetaRow}>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>
                  <SimpleIcon name="chevron" size={18} color={Colors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Examples */}
        <View style={styles.examplesSection}>
          <Text style={styles.sectionTitle}>¿Qué necesitas hoy?</Text>
          <Text style={styles.sectionSubtitle}>Elegí un ejemplo o solicitá tu propio servicio</Text>
          <View style={styles.examplesList}>
            {examples.map((ex, i) => (
              <TouchableOpacity key={i} style={styles.exampleCard}
                onPress={() => navigation.navigate('ServiceRequest', { title: ex.title, description: ex.description })}>
                <View style={[styles.exampleIcon, { backgroundColor: '#fef3c7' }]}>
                  <SimpleIcon name="wrench" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.exampleTitle} numberOfLines={2}>{ex.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProviderHome({ navigation }) {
  const { user } = useAuthStore();
  const { unreadCount, loadUnreadCount } = useNotificationStore();
  const [services, setServices] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const pollingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [svcRes] = await Promise.all([
        ServiceAPI.getAll({ status: 'pending,accepted,in_progress' }),
        loadUnreadCount(),
      ]);
      setServices(svcRes.data?.services || []);
    } catch (e) { console.log(e); }
  }, []);

  useEffect(() => {
    if (isFocused) {
      load();
      pollingRef.current = setInterval(load, 15000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const profileName = user?.profile?.first_name || 'Operario';
  const rating = user?.providerProfile?.rating || 0;
  const totalServices = user?.providerProfile?.total_services || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hola, {profileName}</Text>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>Operario</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <SimpleIcon name="bell" size={24} color={Colors.text} />
            {unreadCount > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <SimpleIcon name="star" size={22} color="#eab308" />
            <Text style={styles.statValue}>{rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <SimpleIcon name="check" size={22} color="#22c55e" />
            <Text style={styles.statValue}>{totalServices}</Text>
            <Text style={styles.statLabel}>Servicios</Text>
          </View>
          <View style={styles.statBox}>
            <SimpleIcon name="wallet" size={22} color="#3b82f6" />
            <Text style={styles.statValue}>{formatMoney(0)}</Text>
            <Text style={styles.statLabel}>Ganado</Text>
          </View>
        </View>

        {/* Feed */}
        <Text style={styles.sectionTitle}>Servicios disponibles</Text>
        {services.length === 0 ? (
          <View style={styles.emptyStateBox}>
            <SimpleIcon name="location" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No hay servicios disponibles cerca tuyo.</Text>
            <Text style={styles.emptyStateText}>Nuevos servicios se publican todo el tiempo.</Text>
          </View>
        ) : (
          services.map((s) => {
            const st = statusConfig[s.status] || statusConfig.pending;
            return (
              <TouchableOpacity key={s.id} style={styles.serviceCard}
                onPress={() => {
                  if (s.status === 'in_progress') navigation.navigate('ActiveService', { serviceId: s.id });
                  else navigation.navigate('ServiceDetail', { serviceId: s.id });
                }} activeOpacity={0.8}>
                <View style={[styles.serviceIcon, { backgroundColor: '#fef3c7' }]}>
                  <SimpleIcon name="wrench" size={22} color="#f59e0b" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle} numberOfLines={1}>{s.description}</Text>
                  <View style={styles.serviceMetaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
                <SimpleIcon name="chevron" size={18} color={Colors.muted} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <View style={styles.safe}><Text style={styles.loadingText}>Cargando...</Text></View>;
  }

  if (user?.role === 'provider') return <ProviderHome navigation={navigation} />;
  return <ClientHome navigation={navigation} />;
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
  serviceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyStateBox: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f2', marginBottom: 10 },
  emptyStateTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'center', marginBottom: 6, marginTop: 8 },
  emptyStateText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
