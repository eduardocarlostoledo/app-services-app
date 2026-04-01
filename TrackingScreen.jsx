// ══════════════════════════════════════════════════════════════════════════════
// SCREEN: TrackingScreen — Seguimiento en tiempo real del operario
// Muestra: mapa con posición del operario, estado del servicio, chat básico
// GPS stream: recibido via Socket.io cada 5 segundos
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Animated as RNAnimated, Alert, ScrollView,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { useServiceStore } from '../../store';
import { ServiceAPI, PaymentAPI, getApiError } from '../../services/api.service';
import { useProviderLocation } from '../../hooks/useLocationTracking';
import ServiceStatusBadge from '../../components/ServiceCard/ServiceStatusBadge';

const { width: W, height: H } = Dimensions.get('window');

// Paleta de colores
const C = {
  primary:  '#2563EB',
  success:  '#059669',
  warning:  '#F59E0B',
  danger:   '#EF4444',
  bg:       '#F8FAFF',
  card:     '#FFFFFF',
  text:     '#111827',
  textSub:  '#6B7280',
};

// ── Mapa de progreso del servicio ─────────────────────────────────────────────
const SERVICE_STEPS = [
  { status: 'pending',     label: 'Buscando operario', icon: '🔍' },
  { status: 'accepted',    label: 'En camino',         icon: '🚗' },
  { status: 'in_progress', label: 'Trabajando',        icon: '🔧' },
  { status: 'completed',   label: '¡Listo!',           icon: '✅' },
];

export default function TrackingScreen({ route, navigation }) {
  const { serviceId } = route.params;

  const activeService    = useServiceStore((s) => s.activeService);
  const updateStatus     = useServiceStore((s) => s.updateServiceStatus);
  const clearActive      = useServiceStore((s) => s.clearActiveService);

  const { providerLocation, isOnline } = useProviderLocation(serviceId);

  const [service,       setService]       = useState(activeService);
  const [routeCoords,   setRouteCoords]   = useState([]);
  const [showPayment,   setShowPayment]   = useState(false);
  const [isProcessing,  setIsProcessing]  = useState(false);
  const [mpInitPoint,   setMpInitPoint]   = useState(null);

  const mapRef = useRef(null);

  // ── Cargar servicio si no está en store ───────────────────────────────────
  useEffect(() => {
    if (!service) {
      ServiceAPI.getById(serviceId)
        .then(({ data }) => setService(data.service))
        .catch(() => navigation.goBack());
    }
  }, [serviceId]);

  // ── Sincronizar estado desde el store ────────────────────────────────────
  useEffect(() => {
    if (activeService?.id === serviceId) {
      setService(activeService);
      // Mostrar modal de pago al completarse
      if (activeService.status === 'completed') {
        setShowPayment(true);
      }
    }
  }, [activeService?.status]);

  // ── Animar mapa cuando llega nueva ubicación del operario ─────────────────
  useEffect(() => {
    if (providerLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude: providerLocation.lat, longitude: providerLocation.lng },
        zoom:   15,
      }, { duration: 800 });
    }
  }, [providerLocation]);

  // ── Cancelar servicio ─────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancelar servicio',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      [
        { text: 'No, volver', style: 'cancel' },
        {
          text: 'Sí, cancelar', style: 'destructive',
          onPress: async () => {
            try {
              await ServiceAPI.cancel(serviceId, 'Cancelado por el cliente');
              clearActive();
              navigation.replace('Home');
            } catch (e) {
              Alert.alert('Error', getApiError(e));
            }
          },
        },
      ]
    );
  }, [serviceId]);

  // ── Checkout MercadoPago ──────────────────────────────────────────────────
  const handleMPPayment = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data } = await PaymentAPI.createMPPreference(serviceId);
      setMpInitPoint(data.init_point);
      // Abrir WebView de MercadoPago
      navigation.navigate('MPCheckout', {
        initPoint: data.init_point,
        serviceId,
        onSuccess: () => {
          clearActive();
          navigation.navigate('Review', { serviceId });
        },
      });
    } catch (e) {
      Alert.alert('Error', getApiError(e));
    } finally {
      setIsProcessing(false);
    }
  }, [serviceId]);

  // ── Confirmar pago en efectivo ────────────────────────────────────────────
  const handleCashPayment = useCallback(async () => {
    setIsProcessing(true);
    try {
      const transactions = service?.transactions || [];
      const cashTx = transactions.find((t) => t.method === 'cash' && t.status === 'pending');
      if (cashTx) {
        navigation.navigate('Review', { serviceId });
      } else {
        await PaymentAPI.registerCash(serviceId);
        navigation.navigate('Review', { serviceId });
      }
    } catch (e) {
      Alert.alert('Error', getApiError(e));
    } finally {
      setIsProcessing(false);
    }
  }, [service, serviceId]);

  // ── Indicador de progreso ─────────────────────────────────────────────────
  const currentStep = SERVICE_STEPS.findIndex((s) => s.status === service?.status);

  if (!service) {
    return (
      <View style={styles.loadingFull}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Mapa ──────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude:       service.client_lat  || -34.6037,
          longitude:      service.client_lng  || -58.3816,
          latitudeDelta:  0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Marcador del cliente */}
        {service.client_lat && (
          <Marker
            coordinate={{ latitude: parseFloat(service.client_lat), longitude: parseFloat(service.client_lng) }}
            title="Tu ubicación"
            pinColor={C.primary}
          />
        )}

        {/* Marcador del operario (actualización en tiempo real) */}
        {providerLocation && (
          <Marker
            coordinate={{ latitude: providerLocation.lat, longitude: providerLocation.lng }}
            title={`${service.provider?.profile?.first_name || 'Operario'}`}
            description={isOnline ? 'En camino 🚗' : 'Desconectado'}
          >
            <ProviderMarker heading={providerLocation.heading} isOnline={isOnline} />
          </Marker>
        )}
      </MapView>

      {/* ── Panel inferior ───────────────────────────────────────────── */}
      <Animated.View entering={SlideInDown.duration(400)} style={styles.bottomPanel}>

        {/* Barra de progreso */}
        <View style={styles.progressBar}>
          {SERVICE_STEPS.map((step, idx) => (
            <React.Fragment key={step.status}>
              <View style={[styles.stepDot, idx <= currentStep && styles.stepDotActive]}>
                <Text style={styles.stepEmoji}>{step.icon}</Text>
              </View>
              {idx < SERVICE_STEPS.length - 1 && (
                <View style={[styles.stepLine, idx < currentStep && styles.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.stepLabel}>
          {SERVICE_STEPS[currentStep]?.label || 'Procesando...'}
        </Text>

        {/* Info del operario */}
        {service.provider && (
          <View style={styles.providerRow}>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {service.provider?.profile?.first_name} {service.provider?.profile?.last_name}
              </Text>
              <View style={styles.onlineRow}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? C.success : '#D1D5DB' }]} />
                <Text style={styles.onlineText}>{isOnline ? 'Transmitiendo ubicación' : 'Sin señal GPS'}</Text>
              </View>
            </View>

            {/* Botón de llamada */}
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Alert.alert('Teléfono', service.provider?.phone || 'No disponible')}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                  stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </TouchableOpacity>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actions}>
          {service.status === 'completed' && (
            <>
              {service.payment_method === 'mercadopago' ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnPrimary]}
                  onPress={handleMPPayment}
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.actionBtnText}>💳 Pagar con MercadoPago</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  onPress={handleCashPayment}
                >
                  <Text style={styles.actionBtnText}>💵 Confirmar pago en efectivo</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {['pending', 'accepted'].includes(service.status) && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleCancel}>
              <Text style={styles.actionBtnText}>Cancelar servicio</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Marcador personalizado del operario ───────────────────────────────────────
const ProviderMarker = ({ heading, isOnline }) => (
  <View style={[markerStyles.container, !isOnline && markerStyles.offline]}>
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={isOnline ? '#2563EB' : '#9CA3AF'} />
      <Path d="M12 8v8M8 12l4-4 4 4" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        transform={heading ? `rotate(${heading}, 12, 12)` : ''}
      />
    </Svg>
    <View style={[markerStyles.dot, { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }]} />
  </View>
);

const markerStyles = StyleSheet.create({
  container: { alignItems: 'center' },
  offline:   { opacity: 0.5 },
  dot:       { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#000' },
  loadingFull: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  map:         { flex: 1 },

  bottomPanel: {
    backgroundColor: C.card,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    padding:  20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },

  progressBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepDot:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepDotActive:{ backgroundColor: C.primary },
  stepEmoji:    { fontSize: 16 },
  stepLine:     { flex: 1, height: 3, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  stepLineActive:{ backgroundColor: C.primary },
  stepLabel:    { textAlign: 'center', fontWeight: '700', fontSize: 16, color: C.text, marginBottom: 16 },

  providerRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16 },
  providerInfo: { flex: 1 },
  providerName: { fontWeight: '700', fontSize: 16, color: C.text },
  onlineRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  onlineDot:    { width: 8, height: 8, borderRadius: 4 },
  onlineText:   { fontSize: 12, color: C.textSub },
  callBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: C.success, justifyContent: 'center', alignItems: 'center' },

  actions:          { gap: 10 },
  actionBtn:        { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnPrimary: { backgroundColor: C.primary },
  actionBtnSuccess: { backgroundColor: C.success },
  actionBtnDanger:  { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnText:    { fontWeight: '700', fontSize: 15, color: '#fff' },
});
