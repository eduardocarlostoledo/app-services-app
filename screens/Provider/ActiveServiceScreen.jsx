import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { ServiceAPI, getApiError } from '../../api.service';
import { useAuthStore } from '../../store';

const COLORS = {
  primary: '#895bf5',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
};

export default function ActiveServiceScreen({ navigation, route }) {
  const { serviceId } = route.params || {};
  const { user } = useAuthStore();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

  const loadService = async () => {
    try {
      const { data } = await ServiceAPI.getById(serviceId);
      setService(data.service);
    } catch (err) {
      console.log('ActiveService error:', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadService();
    pollRef.current = setInterval(loadService, 10000);
    return () => clearInterval(pollRef.current);
  }, [serviceId]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await ServiceAPI.accept(serviceId, 30);
      loadService();
    } catch (err) {
      Alert.alert('Error', getApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    Alert.alert('Rechazar servicio', 'Estas seguro de que queres rechazar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await ServiceAPI.reject(serviceId, 'Rechazado por proveedor');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', getApiError(err));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert('Completar servicio', 'Confirmas que el trabajo esta terminado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Completar',
        onPress: async () => {
          setActionLoading(true);
          try {
            const formData = new FormData();
            await ServiceAPI.complete(serviceId, formData);
            loadService();
            navigation.navigate('Review', { serviceId });
          } catch (err) {
            Alert.alert('Error', getApiError(err));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleChat = () => {
    if (!service) return;
    navigation.navigate('Chat', { serviceId: service.id, otherUserId: service.client_id });
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
        <Text style={styles.errorText}>Servicio no encontrado</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = service.status === 'pending';
  const isAccepted = service.status === 'accepted';
  const isInProgress = service.status === 'in_progress';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Servicio activo</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Service Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{service.description}</Text>
        <Text style={styles.cardSub}>{service.address}</Text>
        {service.final_price && (
          <Text style={styles.price}>${service.final_price}</Text>
        )}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.primary + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: COLORS.primary }]}>
              {service.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Client Info */}
      {service.client && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Cliente</Text>
          <Text style={styles.cardTitle}>
            {service.client.first_name} {service.client.last_name}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isPending && (
          <>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.success }]}
              onPress={handleAccept}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>
                {actionLoading ? 'Procesando...' : 'Aceptar servicio'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.danger }]}
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>Rechazar</Text>
            </TouchableOpacity>
          </>
        )}

        {(isAccepted || isInProgress) && (
          <>
            <TouchableOpacity style={styles.btn} onPress={handleChat}>
              <Text style={styles.btnText}>Chat con cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.success }]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <Text style={styles.btnText}>Marcar como completado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.danger }]}
              onPress={() => navigation.navigate('Dispute', { serviceId: service.id })}
            >
              <Text style={styles.btnText}>Reportar problema</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  errorText: { fontSize: 16, color: COLORS.muted, marginBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: COLORS.card },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  card: { backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  price: { fontSize: 22, fontWeight: '800', color: COLORS.success, marginTop: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  statusRow: { marginTop: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 13, fontWeight: '600' },

  actions: { marginHorizontal: 16, marginTop: 24, gap: 12 },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 24, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
