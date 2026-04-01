import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Buscando proveedor...',
  provider_selected: 'Proveedor elegido',
  accepted: 'Trabajo asignado',
  paid: 'Pago realizado',
  in_progress: 'Servicio en curso',
  work_finished: 'Esperando confirmacion',
  completed: 'Servicio completado',
  cancelled: 'Servicio cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  provider_selected: '#895bf5',
  accepted: '#2563eb',
  paid: '#059669',
  in_progress: '#3b82f6',
  work_finished: '#16a34a',
  completed: '#059669',
  cancelled: '#ef4444',
};

const FLOW_STEPS = [
  { key: 'provider_selected', label: 'Proveedor elegido' },
  { key: 'paid', label: 'Pago' },
  { key: 'in_progress', label: 'Trabajo en curso' },
  { key: 'work_finished', label: 'Revision del cliente' },
  { key: 'completed', label: 'Cierre' },
];

function getPersonName(person: any, fallback: string) {
  if (!person) return fallback;
  if (person.first_name || person.last_name) return `${person.first_name || ''} ${person.last_name || ''}`.trim();
  if (person.profile?.first_name || person.profile?.last_name) return `${person.profile?.first_name || ''} ${person.profile?.last_name || ''}`.trim();
  return fallback;
}

export default function Progress() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'start' | 'finish' | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadService = async () => {
    try {
      const res = await api(`/services/${id}`);
      setService(res.service || res);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadService();
    pollRef.current = setInterval(loadService, 8000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  const isClient = user?.role === 'client';
  const isAssignedProvider = user?.role === 'provider' && service?.provider_id === user?.id;

  const runAction = async (kind: 'start' | 'finish') => {
    const endpoint = kind === 'start' ? `/services/${id}/start` : `/services/${id}/finish-work`;
    setActionLoading(kind);
    try {
      await api(endpoint, { method: 'PATCH' });
      await loadService();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setActionLoading(null);
  };

  const confirmStart = () => {
    Alert.alert('Iniciar trabajo', 'Esto avisa al cliente que ya empezaste el servicio.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Iniciar', onPress: () => runAction('start') },
    ]);
  };

  const confirmFinish = () => {
    Alert.alert('Marcar trabajo como finalizado', 'El cliente recibira una solicitud para revisar y confirmar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', onPress: () => runAction('finish') },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se encontro el servicio</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[service.status] || Colors.textMuted;
  const statusLabel = STATUS_LABELS[service.status] || service.status;
  const partnerName = isClient ? getPersonName(service.provider, 'Proveedor') : getPersonName(service.client, 'Cliente');
  const partnerPhone = isClient ? service.provider?.phone : service.client?.phone;
  const activeStepIndex = Math.max(0, FLOW_STEPS.findIndex((step) => step.key === service.status));
  const hasAddressDetails = !!service.address;

  let summaryTitle = 'Estamos siguiendo el trabajo';
  let summaryText = 'Desde esta pantalla vas a poder ver el estado y hacer el siguiente paso cuando corresponda.';

  if (service.status === 'paid' && isAssignedProvider) {
    summaryTitle = 'Ya podes empezar';
    summaryText = 'Cuando llegues y arranques, marca el trabajo como iniciado para avisarle al cliente.';
  } else if (service.status === 'in_progress' && isAssignedProvider) {
    summaryTitle = 'Trabajo en curso';
    summaryText = 'Cuando termines, marca el servicio como finalizado para que el cliente lo revise.';
  } else if (service.status === 'work_finished' && isClient) {
    summaryTitle = 'Falta tu confirmacion';
    summaryText = 'Si todo quedo bien, confirma para cerrar el servicio y dejar una calificacion.';
  } else if (service.status === 'provider_selected' && isClient) {
    summaryTitle = 'Queda completar el pago';
    summaryText = 'Una vez pagado, el proveedor podra iniciar el trabajo y ambos tendran seguimiento.';
  } else if (service.status === 'paid' && isClient && !hasAddressDetails) {
    summaryTitle = 'Falta compartir la direccion final';
    summaryText = 'Antes de coordinar, comparti la direccion exacta y los detalles de acceso para que queden guardados en el chat.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seguimiento</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>Paso actual</Text>
          <Text style={styles.summaryTitle}>{summaryTitle}</Text>
          <Text style={styles.summaryText}>{summaryText}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Servicio</Text>
          <Text style={styles.cardTitle}>{service.description || service.title}</Text>
          {service.address && <Text style={styles.cardSub}>{service.address}</Text>}
          {!service.address && ['paid', 'in_progress', 'work_finished'].includes(service.status) && isClient && (
            <Text style={[styles.cardSub, { color: Colors.warning }]}>Todavia no compartiste la direccion exacta.</Text>
          )}
          {(service.final_price > 0 || service.estimated_price > 0) && (
            <Text style={styles.price}>${Number(service.final_price || service.estimated_price).toLocaleString('es-AR')}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{isClient ? 'Proveedor asignado' : 'Cliente'}</Text>
          <Text style={styles.cardTitle}>{partnerName}</Text>
          {!!partnerPhone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${partnerPhone}`)}>
              <Text style={[styles.cardSub, { color: Colors.primary }]}>Llamar: {partnerPhone}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Recorrido</Text>
          <View style={styles.timeline}>
            {FLOW_STEPS.map((step, index) => {
              const isDone = index <= activeStepIndex;
              const isCurrent = step.key === service.status;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, isDone && styles.timelineDotDone, isCurrent && styles.timelineDotCurrent]} />
                  <Text style={[styles.timelineText, isDone && styles.timelineTextDone]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          {isClient && ['paid', 'in_progress', 'work_finished'].includes(service.status) && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={() => router.push(`/address/${id}` as any)}>
              <Ionicons name="location-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>{hasAddressDetails ? 'Actualizar direccion y detalles' : 'Compartir direccion final'}</Text>
            </TouchableOpacity>
          )}

          {service.provider_id && ['paid', 'in_progress', 'work_finished'].includes(service.status) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push(`/chat/${id}?other=${isClient ? service.provider_id : service.client_id}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Abrir chat</Text>
            </TouchableOpacity>
          )}

          {service.status === 'provider_selected' && isClient && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={() => router.push(`/payment/${id}` as any)}>
              <Ionicons name="card-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Continuar al pago</Text>
            </TouchableOpacity>
          )}

          {service.status === 'paid' && isAssignedProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={confirmStart}>
              <Ionicons name="play-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>{actionLoading === 'start' ? 'Iniciando...' : 'Marcar trabajo iniciado'}</Text>
            </TouchableOpacity>
          )}

          {service.status === 'in_progress' && isAssignedProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={confirmFinish}>
              <Ionicons name="checkmark-done-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>{actionLoading === 'finish' ? 'Finalizando...' : 'Marcar trabajo finalizado'}</Text>
            </TouchableOpacity>
          )}

          {service.status === 'work_finished' && isClient && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => router.push(`/confirm/${id}` as any)}>
              <Text style={styles.actionBtnText}>Revisar y confirmar</Text>
            </TouchableOpacity>
          )}

          {['paid', 'in_progress', 'work_finished'].includes(service.status) && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.destructive }]} onPress={() => router.push(`/dispute/${id}` as any)}>
              <Text style={styles.actionBtnText}>Reportar problema</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { fontSize: 16, color: Colors.textMuted, marginBottom: 16 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, backgroundColor: Colors.primary, borderRadius: 20 },
  retryBtnText: { color: Colors.white, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: Colors.white },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  statusBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusText: { fontSize: 16, fontWeight: '700' },
  summaryCard: { backgroundColor: '#fff7ed', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#fdba74' },
  summaryEyebrow: { fontSize: 11, fontWeight: '700', color: '#c2410c', textTransform: 'uppercase' },
  summaryTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 6 },
  summaryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 6 },
  card: { backgroundColor: Colors.white, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  cardLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  price: { fontSize: 20, fontWeight: '800', color: Colors.money, marginTop: 8 },
  timeline: { gap: 10, marginTop: 4 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#d4d4d8' },
  timelineDotDone: { backgroundColor: '#f59e0b' },
  timelineDotCurrent: { backgroundColor: Colors.primary },
  timelineText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  timelineTextDone: { color: Colors.text },
  actions: { marginHorizontal: 16, marginTop: 24, gap: 12 },
  actionBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
