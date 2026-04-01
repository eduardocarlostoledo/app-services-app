import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Confirm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/services/${id}`);
        setService(res.service || res);
      } catch (e) { console.log(e); }
    })();
  }, [id]);

  const handleConfirm = () => {
    Alert.alert('Confirmar finalizacion', 'El trabajo fue completado a tu satisfaccion?', [
      { text: 'No, reportar problema', style: 'destructive', onPress: () => router.push(`/dispute/${id}`) },
      { text: 'Si, completado', onPress: async () => {
        setLoading(true);
        try {
          await api(`/services/${id}/confirm`, { method: 'PATCH' });
          router.replace(`/rating/${id}`);
        } catch (e: any) { Alert.alert('Error', e.message); }
        setLoading(false);
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
        </View>

        <Text style={styles.title}>Trabajo finalizado</Text>
        <Text style={styles.subtitle}>El proveedor indica que completo el servicio. Confirma si el trabajo fue realizado correctamente.</Text>

        {service && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Servicio</Text>
            <Text style={styles.cardValue}>{service.title || service.description}</Text>
            {service.final_price > 0 && <Text style={styles.cardPrice}>${service.final_price.toLocaleString()}</Text>}
          </View>
        )}

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleConfirm} disabled={loading} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.btnText}>{loading ? 'Procesando...' : 'Confirmar y calificar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.disputeBtn}
          onPress={() => router.push(`/dispute/${id}`)} activeOpacity={0.7}>
          <Ionicons name="warning-outline" size={18} color={Colors.destructive} />
          <Text style={styles.disputeBtnText}>Reportar problema</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  iconWrap: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f0f0f2' },
  cardLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: '600', color: Colors.text },
  cardPrice: { fontSize: 20, fontWeight: '800', color: Colors.money, marginTop: 8 },
  btn: { backgroundColor: Colors.success, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  disputeBtnText: { color: Colors.destructive, fontSize: 15, fontWeight: '600' },
});
