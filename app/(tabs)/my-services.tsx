import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const LILAC = '#A855F7';
const LILAC_BG = '#F3E8FF';

export default function MyServices() {
  const { user, api } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ as_client: any[]; as_provider: any[] }>({ as_client: [], as_provider: [] });
  const [refreshing, setRefreshing] = useState(false);
  const isProvider = user?.role === 'provider';

  const load = useCallback(async () => {
    try {
      const res = await api('/services/my');
      const services = res.services || res || [];
      if (Array.isArray(services)) {
        setData({ as_client: services, as_provider: services });
      } else {
        setData(services);
      }
    } catch (e) { console.log(e); }
  }, [api]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusLabel: any = {
    published: 'Publicado', in_offers: 'En ofertas', provider_selected: 'Elegido',
    paid: 'Pagado', in_progress: 'En progreso', work_finished: 'Finalizado',
    completed: 'Completado', in_dispute: 'En disputa', cancelled: 'Cancelado',
    offer_sent: 'Oferta enviada', offer_accepted: 'Aceptada', offer_rejected: 'Rechazada'
  };
  const statusColor: any = {
    completed: Colors.success, in_dispute: Colors.destructive, cancelled: Colors.textMuted,
    offer_rejected: Colors.destructive, offer_accepted: Colors.success, paid: Colors.money
  };
  const activeStatuses = ['published', 'in_offers', 'provider_selected', 'paid', 'in_progress', 'work_finished', 'in_dispute', 'offer_sent', 'offer_accepted'];

  const renderCard = (c: any) => (
    <TouchableOpacity testID={`my-service-${c.id}`} key={c.id} style={styles.card}
      onPress={() => {
        if (['in_progress', 'paid'].includes(c.status)) router.push(`/progress/${c.id}`);
        else if (c.status === 'work_finished') router.push(`/confirm/${c.id}`);
        else if (c.status === 'completed') router.push(`/rating/${c.id}`);
        else router.push(`/service/${c.id}`);
      }} activeOpacity={0.8}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
        <Text style={[styles.status, { color: statusColor[c.status] || Colors.primary }]}>
          {statusLabel[c.status] || c.status}
        </Text>
      </View>
      {c.price > 0 && <Text style={styles.price}>${c.price.toLocaleString()}</Text>}
    </TouchableOpacity>
  );

  const activeData = isProvider ? (data.as_provider || []) : (data.as_client || []);
  const activeItems = activeData.filter((item: any) => activeStatuses.includes(item.status));
  const archiveItems = activeData.filter((item: any) => !activeStatuses.includes(item.status));
  const title = isProvider ? 'Mis Ofertas' : 'Mis Servicios';
  const emptyText = isProvider ? 'No has enviado ofertas todavia.\nExplora servicios disponibles en Inicio.' : 'No has publicado servicios todavia.\nToca + para crear tu primer servicio.';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.modeBadge}>
            <MaterialCommunityIcons name={isProvider ? 'hammer-wrench' : 'briefcase-outline'} size={14} color={LILAC} />
            <Text style={styles.modeBadgeText}>{isProvider ? 'Operario' : 'Cliente'}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeItems.length}</Text>
            <Text style={styles.summaryLabel}>Activos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{archiveItems.length}</Text>
            <Text style={styles.summaryLabel}>Archivados</Text>
          </View>
        </View>

        {activeData.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name={isProvider ? 'hand-left-outline' : 'briefcase-outline'} size={48} color={Colors.muted} />
            <Text style={styles.emptyText}>{emptyText}</Text>
            {isProvider ? (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)' as any)} activeOpacity={0.8}>
                <Ionicons name="search" size={20} color={Colors.white} />
                <Text style={styles.emptyBtnText}>Ver servicios disponibles</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/publish')} activeOpacity={0.8}>
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.emptyBtnText}>Publicar servicio</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {activeItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>En curso</Text>
                {activeItems.map(renderCard)}
              </>
            )}
            {archiveItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Historial reciente</Text>
                {archiveItems.map(renderCard)}
              </>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10, marginTop: 12 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: LILAC_BG },
  modeBadgeText: { fontSize: 12, fontWeight: '600', color: LILAC },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginTop: 8 },
  emptyBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8 },
  status: { fontSize: 12, fontWeight: '600' },
  price: { fontSize: 14, fontWeight: '600', color: Colors.money, marginTop: 6 },
});
