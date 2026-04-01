import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: 'Publicado', color: '#059669', bg: '#ecfdf5' },
  in_offers: { label: 'Recibiendo ofertas', color: '#f59e0b', bg: '#fef3c7' },
  provider_selected: { label: 'Proveedor elegido', color: '#895bf5', bg: '#f2f0ff' },
  accepted: { label: 'Asignado', color: '#2563eb', bg: '#dbeafe' },
  paid: { label: 'Pago realizado', color: '#059669', bg: '#ecfdf5' },
  in_progress: { label: 'En progreso', color: '#3b82f6', bg: '#dbeafe' },
  work_finished: { label: 'Listo para confirmar', color: '#059669', bg: '#dcfce7' },
  completed: { label: 'Completado', color: '#059669', bg: '#ecfdf5' },
  in_dispute: { label: 'En disputa', color: '#db2424', bg: '#fef1f1' },
  cancelled: { label: 'Cancelado', color: '#71717a', bg: '#f4f4f5' },
};

const journeySteps = [
  { key: 'published', label: 'Publicado' },
  { key: 'in_offers', label: 'Ofertas' },
  { key: 'provider_selected', label: 'Elegido' },
  { key: 'paid', label: 'Pago' },
  { key: 'in_progress', label: 'Trabajo' },
  { key: 'work_finished', label: 'Revision' },
  { key: 'completed', label: 'Cerrado' },
];

function getPersonName(person: any, fallback: string) {
  if (!person) return fallback;
  if (person.first_name || person.last_name) return `${person.first_name || ''} ${person.last_name || ''}`.trim();
  if (person.profile?.first_name || person.profile?.last_name) return `${person.profile?.first_name || ''} ${person.profile?.last_name || ''}`.trim();
  return fallback;
}

function getOfferProviderName(offer: any) {
  if (offer.provider_name) return offer.provider_name;
  return getPersonName(offer.provider, 'Proveedor');
}

function getOfferStatusCopy(status: string) {
  if (status === 'accepted') return 'Elegida';
  if (status === 'rejected') return 'No seleccionada';
  return 'Pendiente';
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isClient = user?.role === 'client';
  const isProvider = user?.role === 'provider';

  const load = useCallback(async () => {
    try {
      const [serviceRes, offersRes] = await Promise.all([
        api(`/services/${id}`),
        api(`/services/${id}/offers`).catch(() => ({ offers: [] })),
      ]);
      setService(serviceRes.service || serviceRes);
      setOffers(offersRes.offers || []);
    } catch (e) {
      console.log(e);
    }
    setLoading(false);
  }, [api, id]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => {
      const statusRank = { accepted: 0, pending: 1, rejected: 2, withdrawn: 3 } as Record<string, number>;
      const aRank = statusRank[a.status] ?? 99;
      const bRank = statusRank[b.status] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return Number(a.price || 0) - Number(b.price || 0);
    });
  }, [offers]);

  const handleOffer = () => router.push(`/offer/${id}` as any);

  const handleAcceptOffer = async (offer: any) => {
    Alert.alert(
      'Elegir oferta',
      `Vas a elegir a ${getOfferProviderName(offer)}. Despues podras avanzar al pago y coordinar por chat.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Elegir',
          onPress: async () => {
            try {
              await api(`/services/${id}/offers/${offer.id}/accept`, { method: 'POST' });
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handlePay = () => router.push(`/payment/${id}` as any);
  const handleOpenProgress = () => router.push(`/progress/${id}` as any);

  const handleCancel = () => {
    Alert.alert('Cancelar servicio', 'Esta accion detiene la solicitud actual.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Si, cancelar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/services/${id}/cancel`, { method: 'PATCH', data: { reason: 'Cancelado por el usuario' } });
            router.replace('/(tabs)/my-services' as any);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Servicio no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const st = statusConfig[service.status] || statusConfig.published;
  const providerName = getPersonName(service.provider, 'Proveedor asignado');
  const shouldShowJourney = !['cancelled'].includes(service.status);
  const activeStepIndex = Math.max(0, journeySteps.findIndex((step) => step.key === service.status));

  let nextStepTitle = 'Tu pedido esta en marcha';
  let nextStepText = 'Desde aca vas a poder seguir todo el avance.';

  if (isClient && service.status === 'published') {
    nextStepTitle = 'Ahora esperamos las primeras ofertas';
    nextStepText = 'Te avisamos cuando un proveedor te envie una cotizacion para que puedas compararlas.';
  } else if (isClient && service.status === 'in_offers') {
    nextStepTitle = 'Compara precios, mensaje y experiencia';
    nextStepText = 'Cuando elijas una oferta, el siguiente paso sera confirmar el proveedor y avanzar al pago.';
  } else if (isClient && ['provider_selected', 'accepted'].includes(service.status)) {
    nextStepTitle = 'Ya elegiste proveedor';
    nextStepText = 'Falta completar el pago para abrir el seguimiento y la coordinacion final.';
  } else if (isClient && ['paid', 'in_progress'].includes(service.status)) {
    nextStepTitle = 'El trabajo ya esta en curso';
    nextStepText = 'Usa el chat y el seguimiento para coordinar detalles hasta la finalizacion.';
  } else if (isClient && service.status === 'work_finished') {
    nextStepTitle = 'El proveedor marco el trabajo como terminado';
    nextStepText = 'Revisa el resultado y confirma para cerrar el servicio y dejar una calificacion.';
  } else if (isProvider && ['published', 'in_offers'].includes(service.status)) {
    nextStepTitle = 'Todavia podes enviar o mejorar tu propuesta';
    nextStepText = 'Una oferta clara con precio, mensaje y tiempo estimado te da mas chances de ser elegido.';
  } else if (isProvider && ['provider_selected', 'accepted'].includes(service.status) && service.provider_id === user?.id) {
    nextStepTitle = 'Fuiste elegido para este trabajo';
    nextStepText = 'Queda esperar el pago y luego iniciar el servicio desde seguimiento.';
  } else if (isProvider && ['paid', 'in_progress'].includes(service.status) && service.provider_id === user?.id) {
    nextStepTitle = 'Este trabajo ya esta activo';
    nextStepText = 'En seguimiento podes iniciar o finalizar el trabajo y mantener la conversacion con el cliente.';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>

        <Text style={styles.title}>{service.title || service.description}</Text>
        {service.description && service.title && <Text style={styles.description}>{service.description}</Text>}

        <View style={styles.metaWrap}>
          <View style={styles.metaPill}>
            <Ionicons name="mail-open-outline" size={14} color={Colors.primary} />
            <Text style={styles.metaPillText}>{offers.length} ofertas</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="cash-outline" size={14} color={Colors.primary} />
            <Text style={styles.metaPillText}>{service.payment_method === 'mercadopago' ? 'Mercado Pago' : 'Efectivo'}</Text>
          </View>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepEyebrow}>Siguiente paso</Text>
          <Text style={styles.nextStepTitle}>{nextStepTitle}</Text>
          <Text style={styles.nextStepText}>{nextStepText}</Text>
        </View>

        {shouldShowJourney && (
          <View style={styles.journeyCard}>
            <Text style={styles.sectionTitle}>Estado del servicio</Text>
            <View style={styles.journeyRow}>
              {journeySteps.map((step, index) => {
                const isDone = index <= activeStepIndex;
                const isCurrent = step.key === service.status;
                return (
                  <View key={step.key} style={styles.stepItem}>
                    <View style={[styles.stepDot, isDone && styles.stepDotDone, isCurrent && styles.stepDotCurrent]} />
                    <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>{step.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {service.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{service.address}</Text>
          </View>
        )}

        {(service.final_price > 0 || service.estimated_price > 0) && (
          <Text style={styles.price}>${Number(service.final_price || service.estimated_price).toLocaleString('es-AR')}</Text>
        )}

        {service.provider && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Proveedor</Text>
            <Text style={styles.cardValue}>{providerName}</Text>
            {service.provider?.phone && <Text style={styles.cardSub}>Telefono: {service.provider.phone}</Text>}
          </View>
        )}

        {isClient && sortedOffers.length > 0 && (
          <View style={styles.offersSection}>
            <Text style={styles.sectionTitle}>Ofertas recibidas ({sortedOffers.length})</Text>
            {sortedOffers.map((offer: any) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTopRow}>
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerName}>{getOfferProviderName(offer)}</Text>
                    <Text style={styles.offerPrice}>${Number(offer.price || 0).toLocaleString('es-AR')}</Text>
                  </View>
                  <View style={[styles.offerStatusPill, offer.status === 'accepted' && styles.offerStatusAccepted, offer.status === 'rejected' && styles.offerStatusRejected]}>
                    <Text style={[styles.offerStatusText, offer.status === 'accepted' && styles.offerStatusTextStrong]}>
                      {getOfferStatusCopy(offer.status)}
                    </Text>
                  </View>
                </View>

                {!!offer.provider_stats && (
                  <Text style={styles.offerMeta}>
                    {offer.provider_stats.is_verified ? 'Verificado' : 'Perfil activo'} · {offer.provider_stats.total_services || 0} trabajos · Rating {Number(offer.provider_stats.rating || 0).toFixed(1)}
                  </Text>
                )}
                {!!offer.estimated_duration_minutes && (
                  <Text style={styles.offerMeta}>Tiempo estimado: {offer.estimated_duration_minutes} min</Text>
                )}
                {offer.message && <Text style={styles.offerMsg}>{offer.message}</Text>}

                {['published', 'in_offers'].includes(service.status) && offer.status === 'pending' && (
                  <TouchableOpacity style={styles.chooseBtn} onPress={() => handleAcceptOffer(offer)}>
                    <Text style={styles.chooseBtnText}>Elegir esta oferta</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {isClient && service.status === 'published' && offers.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.emptyCardTitle}>Todavia no llegaron ofertas</Text>
            <Text style={styles.emptyCardText}>Cuando un proveedor cotice te vamos a avisar por app y por email.</Text>
          </View>
        )}

        {isProvider && offers.length > 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={20} color={Colors.primary} />
            <Text style={styles.emptyCardTitle}>Estado de tu propuesta</Text>
            <Text style={styles.emptyCardText}>
              {sortedOffers[0]?.status === 'accepted'
                ? 'Tu oferta fue elegida. Queda esperar el pago para avanzar.'
                : sortedOffers[0]?.status === 'rejected'
                  ? 'El cliente eligio otra oferta para este trabajo.'
                  : 'Tu oferta esta enviada. Te avisamos si el cliente la elige.'}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {isProvider && ['published', 'in_offers'].includes(service.status) && offers.length === 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleOffer}>
              <Ionicons name="hand-left-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Enviar oferta</Text>
            </TouchableOpacity>
          )}

          {isClient && ['provider_selected', 'accepted'].includes(service.status) && (
            <TouchableOpacity style={styles.actionBtn} onPress={handlePay}>
              <Ionicons name="card-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Continuar al pago</Text>
            </TouchableOpacity>
          )}

          {service.provider_id && ['paid', 'in_progress', 'work_finished', 'completed'].includes(service.status) && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={handleOpenProgress}>
              <Ionicons name="navigate-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Ver seguimiento</Text>
            </TouchableOpacity>
          )}

          {service.provider_id && ['paid', 'in_progress', 'work_finished'].includes(service.status) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#0f766e' }]}
              onPress={() => router.push(`/chat/${id}?other=${isClient ? service.provider_id : service.client_id}` as any)}
            >
              <Ionicons name="chatbubble-outline" size={20} color={Colors.white} />
              <Text style={styles.actionBtnText}>Abrir chat</Text>
            </TouchableOpacity>
          )}

          {isClient && ['published', 'in_offers'].includes(service.status) && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.destructive }]} onPress={handleCancel}>
              <Text style={styles.actionBtnText}>Cancelar servicio</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  loadingText: { fontSize: 16, color: Colors.textSecondary },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  statusText: { fontSize: 13, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 16 },
  description: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, lineHeight: 22 },
  metaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  metaPillText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  nextStepCard: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginTop: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  nextStepEyebrow: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextStepTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 6 },
  nextStepText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginTop: 6 },
  journeyCard: { backgroundColor: '#fff7ed', borderRadius: 18, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#fed7aa' },
  journeyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#d4d4d8' },
  stepDotDone: { backgroundColor: '#f59e0b' },
  stepDotCurrent: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  stepLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  stepLabelDone: { color: Colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  infoText: { fontSize: 14, color: Colors.textMuted },
  price: { fontSize: 28, fontWeight: '800', color: Colors.money, marginTop: 16 },
  card: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#f0f0f2' },
  cardLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  offersSection: { marginTop: 20 },
  offerCard: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f0f0f2' },
  offerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  offerInfo: { flex: 1 },
  offerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  offerPrice: { fontSize: 18, fontWeight: '800', color: Colors.money, marginTop: 4 },
  offerMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  offerMsg: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 19 },
  offerStatusPill: { backgroundColor: '#f4f4f5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  offerStatusAccepted: { backgroundColor: '#dcfce7' },
  offerStatusRejected: { backgroundColor: '#fef2f2' },
  offerStatusText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  offerStatusTextStrong: { color: '#166534' },
  chooseBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginTop: 12, alignItems: 'center' },
  chooseBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  emptyCard: { backgroundColor: Colors.accent, borderRadius: 16, padding: 16, marginTop: 20, borderWidth: 1, borderColor: '#e9ddff' },
  emptyCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 8 },
  emptyCardText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  actions: { marginTop: 24, gap: 12 },
  actionBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});
