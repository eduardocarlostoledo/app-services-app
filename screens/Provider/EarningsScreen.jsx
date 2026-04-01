import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { PaymentAPI, getApiError } from '../../api.service';

const COLORS = {
  primary: '#895bf5',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  successLight: '#ECFDF5',
  white: '#FFFFFF',
};

export default function EarningsScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const { data } = await PaymentAPI.getHistory({ role: 'provider' });
      setPayments(data.transactions || []);
    } catch (err) {
      console.log('Earnings error:', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const totalEarnings = payments
    .filter((p) => p.status === 'approved' && p.confirmed_at)
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const pendingEarnings = payments
    .filter((p) => p.status === 'approved' && !p.confirmed_at)
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const renderPayment = ({ item }) => {
    const isConfirmed = !!item.confirmed_at;
    const date = new Date(item.created_at).toLocaleDateString('es-AR');
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentRow}>
          <View>
            <Text style={styles.paymentAmount}>${item.amount}</Text>
            <Text style={styles.paymentDate}>{date}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isConfirmed ? COLORS.successLight : '#FEF3C7' }]}>
            <Text style={[styles.badgeText, { color: isConfirmed ? COLORS.success : '#D97706' }]}>
              {isConfirmed ? 'Liberado' : 'Pendiente'}
            </Text>
          </View>
        </View>
        {item.method && (
          <Text style={styles.paymentMethod}>
            {item.method === 'mercadopago' ? 'MercadoPago' : item.method === 'cash' ? 'Efectivo' : item.method}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Ingresos</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.successLight }]}>
          <Text style={styles.summaryLabel}>Total cobrado</Text>
          <Text style={[styles.summaryAmount, { color: COLORS.success }]}>
            ${totalEarnings.toLocaleString('es-AR')}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.summaryLabel}>Pendiente</Text>
          <Text style={[styles.summaryAmount, { color: '#D97706' }]}>
            ${pendingEarnings.toLocaleString('es-AR')}
          </Text>
        </View>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPayment}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aun no tenes ingresos registrados</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.white },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 16 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  summaryAmount: { fontSize: 22, fontWeight: '800', marginTop: 4 },

  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 },
  paymentCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentAmount: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  paymentDate: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  paymentMethod: { fontSize: 13, color: COLORS.muted, marginTop: 6 },

  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: COLORS.muted, fontSize: 14, marginTop: 40 },
});
