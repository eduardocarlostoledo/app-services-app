import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { ServiceAPI } from '../../api.service';
import { useAuthStore } from '../../store';
import { getApiError } from '../../api.service';

const COLORS = {
  primary: '#895bf5',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

const STATUS_LABELS = {
  pending: 'Buscando proveedor...',
  accepted: 'Proveedor en camino',
  in_progress: 'Servicio en curso',
  completed: 'Servicio finalizado',
  cancelled: 'Servicio cancelado',
};

const STATUS_COLORS = {
  pending: COLORS.warning,
  accepted: COLORS.primary,
  in_progress: COLORS.success,
  completed: COLORS.success,
  cancelled: '#EF4444',
};

export default function TrackingScreen({ navigation, route }) {
  const { serviceId } = route.params || {};
  const { user } = useAuthStore();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const loadService = async () => {
    try {
      const { data } = await ServiceAPI.getById(serviceId);
      setService(data.service);
    } catch (err) {
      console.log('TrackingScreen error:', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadService();
    pollRef.current = setInterval(loadService, 8000);
    return () => clearInterval(pollRef.current);
  }, [serviceId]);

  const handleChat = () => {
    if (!service) return;
    const otherId = user.role === 'client' ? service.provider_id : service.client_id;
    navigation.navigate('Chat', { serviceId: service.id, otherUserId: otherId });
  };

  const handleComplete = () => {
    Alert.alert(
      'Confirmar finalizacion',
      'El proveedor confirmo que el trabajo esta listo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Si, finalizar',
          onPress: () => navigation.navigate('Review', { serviceId: service.id }),
        },
      ]
    );
  };

  const handleDispute = () => {
    navigation.navigate('Dispute', { serviceId: service.id });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se encontro el servicio</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[service.status] || COLORS.muted;
  const statusLabel = STATUS_LABELS[service.status] || service.status;
  const isActive = ['accepted', 'in_progress'].includes(service.status);
  const isClient = user.role === 'client';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seguimiento</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Service Info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Servicio</Text>
        <Text style={styles.cardTitle}>{service.description}</Text>
        <Text style={styles.cardSub}>{service.address}</Text>
        {service.final_price && (
          <Text style={styles.price}>${service.final_price}</Text>
        )}
      </View>

      {/* Provider/Client Info */}
      {service.provider && isClient && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Proveedor asignado</Text>
          <Text style={styles.cardTitle}>
            {service.provider.first_name} {service.provider.last_name}
          </Text>
          {service.provider.phone && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${service.provider.phone}`)}
            >
              <Text style={[styles.cardSub, { color: COLORS.primary }]}>
                Llamar: {service.provider.phone}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isActive && service.provider_id && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleChat}>
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
        )}

        {isActive && isClient && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
            onPress={handleComplete}
          >
            <Text style={styles.actionBtnText}>Confirmar finalizacion</Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleDispute}
          >
            <Text style={styles.actionBtnText}>Reportar problema</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  errorText: { fontSize: 16, color: COLORS.muted, marginBottom: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: 20 },
  backBtnText: { color: COLORS.white, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: COLORS.white },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  statusBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusText: { fontSize: 16, fontWeight: '700' },

  card: { backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
  price: { fontSize: 20, fontWeight: '800', color: COLORS.success, marginTop: 8 },

  actions: { marginHorizontal: 16, marginTop: 24, gap: 12 },
  actionBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  actionBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
