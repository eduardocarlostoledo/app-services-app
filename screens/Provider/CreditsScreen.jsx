import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PaymentAPI, getApiError } from '../../api.service';

const COLORS = {
  primary: '#895bf5',
  primaryLight: '#F3F0FF',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  white: '#FFFFFF',
};

export default function CreditsScreen() {
  const [balance, setBalance] = useState(0);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balRes, pkgRes] = await Promise.all([
        PaymentAPI.getCreditsBalance(),
        PaymentAPI.getCreditPackages(),
      ]);
      setBalance(balRes.data.balance || 0);
      setPackages(pkgRes.data.packages || []);
    } catch (err) {
      console.log('Credits error:', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (pkg) => {
    Alert.alert(
      'Comprar creditos',
      `Comprar ${pkg.credits} creditos por $${pkg.price}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: async () => {
            setBuying(pkg.id);
            try {
              await PaymentAPI.buyCredits(pkg.id);
              Alert.alert('Creditos comprados', `Se acreditaron ${pkg.credits} creditos a tu cuenta.`);
              loadData();
            } catch (err) {
              Alert.alert('Error', getApiError(err));
            } finally {
              setBuying(null);
            }
          },
        },
      ]
    );
  };

  const renderPackage = ({ item }) => (
    <View style={styles.pkgCard}>
      <View>
        <Text style={styles.pkgCredits}>{item.credits} creditos</Text>
        <Text style={styles.pkgDesc}>{item.description || 'Pauta de visibilidad'}</Text>
      </View>
      <TouchableOpacity
        style={styles.buyBtn}
        onPress={() => handleBuy(item)}
        disabled={buying === item.id}
      >
        <Text style={styles.buyBtnText}>
          {buying === item.id ? '...' : `$${item.price}`}
        </Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerTitle}>Creditos de Pauta</Text>
      </View>

      {/* Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Tu balance</Text>
        <Text style={styles.balanceAmount}>{balance}</Text>
        <Text style={styles.balanceSub}>creditos disponibles</Text>
      </View>

      {/* Packages */}
      <Text style={styles.sectionTitle}>Paquetes disponibles</Text>
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        renderItem={renderPackage}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay paquetes disponibles</Text>
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

  balanceCard: { marginHorizontal: 16, marginTop: 16, padding: 24, backgroundColor: COLORS.primary, borderRadius: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: COLORS.white + 'CC' },
  balanceAmount: { fontSize: 48, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  balanceSub: { fontSize: 14, color: COLORS.white + 'AA', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginHorizontal: 16, marginTop: 24, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },

  pkgCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  pkgCredits: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  pkgDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  buyBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  buyBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  emptyText: { textAlign: 'center', color: COLORS.muted, fontSize: 14, marginTop: 40 },
});
