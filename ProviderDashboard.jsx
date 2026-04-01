// ══════════════════════════════════════════════════════════════════════════════
// SCREEN: ProviderDashboard — Panel del operario
// Muestra: toggle disponibilidad, solicitudes entrantes en tiempo real,
//          estadísticas del día y historial de servicios
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Switch, StyleSheet, FlatList,
  TouchableOpacity, Alert, SafeAreaView, Vibration,
  StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { useAuthStore, useServiceStore, useNotificationStore } from '../../store';
import { ServiceAPI, ProviderAPI, getApiError } from '../../services/api.service';
import SocketService from '../../services/socket.service';
import { CategoryIcon } from '../../components/ServiceCard/ServiceCard';
import { useLocationTracking } from '../../hooks/useLocationTracking';

const C = {
  primary:  '#2563EB',
  success:  '#059669',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  bg:       '#F0F4FF',
  card:     '#FFFFFF',
  text:     '#111827',
  textSub:  '#6B7280',
};

// ══════════════════════════════════════════════════════════════════════════════
export default function ProviderDashboard({ navigation }) {
  const { profile }    = useAuthStore();
  const { myServices, isLoadingServices, loadMyServices } = useServiceStore();
  const { notifications } = useNotificationStore();

  const [isAvailable,    setIsAvailable]    = useState(true);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [stats,          setStats]          = useState({ today: 0, rating: 0, earnings: 0 });
  const [activeServiceId, setActiveServiceId] = useState(null);

  // GPS tracking activo solo cuando hay un servicio aceptado
  const { currentLocation } = useLocationTracking({
    serviceId: activeServiceId,
    isActive:  !!activeServiceId,
  });

  // ── Escuchar solicitudes entrantes via socket ─────────────────────────────
  useEffect(() => {
    const unsub = SocketService.subscribeToNewRequests((data) => {
      // Vibrar para notificar al operario
      Vibration.vibrate([0, 200, 100, 200]);
      setIncomingRequest(data);
    });

    // Escuchar confirmación de servicios aceptados
    SocketService.on('service:accept_ok', ({ serviceId }) => {
      setActiveServiceId(serviceId);
      setIncomingRequest(null);
    });

    return unsub;
  }, []);

  useEffect(() => {
    loadMyServices({ status: 'completed' });
  }, []);

  // ── Toggle de disponibilidad ──────────────────────────────────────────────
  const handleToggleAvailability = useCallback(async (value) => {
    try {
      setIsAvailable(value);
      await ProviderAPI.updateAvailability(value);
      SocketService.toggleAvailability(value);
    } catch (e) {
      setIsAvailable(!value); // Revertir en caso de error
      Alert.alert('Error', getApiError(e));
    }
  }, []);

  // ── Aceptar solicitud entrante ────────────────────────────────────────────
  const handleAcceptRequest = useCallback(async (serviceData) => {
    try {
      await ServiceAPI.accept(serviceData.serviceId, 10);
      SocketService.acceptServiceRealtime(serviceData.serviceId, 10);
      setIncomingRequest(null);
      setActiveServiceId(serviceData.serviceId);
      navigation.navigate('ActiveService', { serviceId: serviceData.serviceId });
    } catch (e) {
      Alert.alert('Error', getApiError(e));
    }
  }, [navigation]);

  // ── Rechazar solicitud ────────────────────────────────────────────────────
  const handleRejectRequest = useCallback(async (serviceData) => {
    try {
      await ServiceAPI.reject(serviceData.serviceId, 'No disponible en este momento');
      SocketService.rejectServiceRealtime(serviceData.serviceId, 'No disponible');
      setIncomingRequest(null);
    } catch (e) {
      setIncomingRequest(null); // Descartar de todas formas
    }
  }, []);

  const totalCompleted = myServices.filter((s) => s.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Modal de solicitud entrante ─────────────────────────────── */}
      {incomingRequest && (
        <IncomingRequestModal
          request={incomingRequest}
          onAccept={handleAcceptRequest}
          onReject={handleRejectRequest}
        />
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header con disponibilidad ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {profile?.first_name} 👷</Text>
            <Text style={styles.subtitle}>
              {isAvailable ? '🟢 Estás recibiendo solicitudes' : '🔴 No estás disponible'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
            thumbColor={isAvailable ? C.primary : '#9CA3AF'}
          />
        </Animated.View>

        {/* ── Estadísticas rápidas ─────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
          <StatCard icon="🔧" label="Servicios hoy" value={stats.today} color={C.primary} />
          <StatCard icon="⭐" label="Calificación" value={stats.rating > 0 ? stats.rating.toFixed(1) : '-'} color={C.warning} />
          <StatCard icon="💰" label="Total servicios" value={totalCompleted} color={C.success} />
        </Animated.View>

        {/* ── Servicio activo ──────────────────────────────────────────── */}
        {activeServiceId && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.activeServiceBanner}>
            <View style={styles.activeServiceLeft}>
              <View style={styles.activeDot} />
              <Text style={styles.activeServiceText}>Servicio activo en curso</Text>
            </View>
            <TouchableOpacity
              style={styles.activeServiceBtn}
              onPress={() => navigation.navigate('ActiveService', { serviceId: activeServiceId })}
            >
              <Text style={styles.activeServiceBtnText}>Ver servicio →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Historial reciente ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>Historial de servicios</Text>
          {isLoadingServices ? (
            <ActivityIndicator color={C.primary} style={{ padding: 24 }} />
          ) : myServices.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>Tus servicios aparecerán aquí</Text>
            </View>
          ) : (
            myServices.slice(0, 10).map((service, idx) => (
              <Animated.View key={service.id} entering={FadeInDown.delay(idx * 60)}>
                <ServiceHistoryItem
                  service={service}
                  onPress={() => navigation.navigate('ServiceDetail', { serviceId: service.id })}
                />
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subcomponente: Modal de solicitud entrante ────────────────────────────────
const IncomingRequestModal = ({ request, onAccept, onReject }) => {
  const scale = useSharedValue(0.8);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 150 });
  }, []);

  return (
    <View style={modalStyles.overlay}>
      <Animated.View style={[modalStyles.modal, animStyle]}>
        <View style={modalStyles.pulse} />
        <Text style={modalStyles.title}>📋 Nueva solicitud</Text>
        <Text style={modalStyles.category}>{request.categoryName}</Text>
        <Text style={modalStyles.address} numberOfLines={2}>📍 {request.address}</Text>
        {request.estimatedPrice && (
          <Text style={modalStyles.price}>
            💰 ${Number(request.estimatedPrice).toLocaleString('es-AR')}
          </Text>
        )}
        <View style={modalStyles.actions}>
          <TouchableOpacity style={[modalStyles.btn, modalStyles.btnReject]} onPress={() => onReject(request)}>
            <Text style={modalStyles.btnRejectText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[modalStyles.btn, modalStyles.btnAccept]} onPress={() => onAccept(request)}>
            <Text style={modalStyles.btnAcceptText}>✅ Aceptar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

// ── Subcomponentes ────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <View style={[statStyles.card, { borderTopColor: color }]}>
    <Text style={statStyles.icon}>{icon}</Text>
    <Text style={[statStyles.value, { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
  </View>
);

const ServiceHistoryItem = ({ service, onPress }) => {
  const statusColors = {
    completed:  { bg: '#D1FAE5', text: '#065F46' },
    cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
    rejected:   { bg: '#FEE2E2', text: '#991B1B' },
    pending:    { bg: '#FEF3C7', text: '#92400E' },
    accepted:   { bg: '#DBEAFE', text: '#1D4ED8' },
  };
  const colors = statusColors[service.status] || { bg: '#F3F4F6', text: '#374151' };

  return (
    <TouchableOpacity style={histStyles.item} onPress={onPress}>
      <CategoryIcon slug={service.category?.slug || ''} size={36} color="#2563EB" />
      <View style={histStyles.info}>
        <Text style={histStyles.category}>{service.category?.name}</Text>
        <Text style={histStyles.address} numberOfLines={1}>{service.address}</Text>
        <Text style={histStyles.date}>
          {new Date(service.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[histStyles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[histStyles.badgeText, { color: colors.text }]}>{service.status}</Text>
        </View>
        {service.final_price && (
          <Text style={histStyles.price}>${Number(service.final_price).toLocaleString('es-AR')}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { flex: 1, paddingHorizontal: 16 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  greeting:{ fontSize: 22, fontWeight: '800', color: C.text },
  subtitle:{ fontSize: 13, color: C.textSub, marginTop: 4 },
  statsRow:{ flexDirection: 'row', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12, marginTop: 8 },
  activeServiceBanner: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  activeServiceLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.success },
  activeServiceText: { fontWeight: '600', color: C.text, fontSize: 14 },
  activeServiceBtn: { backgroundColor: C.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  activeServiceBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyHistory: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: C.textSub, fontSize: 15 },
});

const statStyles = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  icon:  { fontSize: 22, marginBottom: 6 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modal:   { backgroundColor: '#fff', borderRadius: 24, padding: 28, width: '88%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24 },
  pulse:   { width: 60, height: 60, borderRadius: 30, backgroundColor: '#BFDBFE', marginBottom: 12 },
  title:   { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  category:{ fontSize: 17, fontWeight: '700', color: '#2563EB', marginBottom: 8 },
  address: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 8 },
  price:   { fontSize: 22, fontWeight: '800', color: '#059669', marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  btn:     { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnReject:     { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  btnAccept:     { backgroundColor: '#2563EB' },
  btnRejectText: { fontWeight: '700', color: '#EF4444', fontSize: 15 },
  btnAcceptText: { fontWeight: '700', color: '#fff',    fontSize: 15 },
});

const histStyles = StyleSheet.create({
  item:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  info:  { flex: 1, gap: 2 },
  category:{ fontWeight: '700', fontSize: 14, color: '#111827' },
  address: { fontSize: 12, color: '#6B7280' },
  date:    { fontSize: 11, color: '#9CA3AF' },
  badge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  price:   { fontSize: 13, fontWeight: '700', color: '#059669' },
});
