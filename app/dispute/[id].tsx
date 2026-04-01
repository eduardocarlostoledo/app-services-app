import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Dispute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 10) { setError('Explica el motivo (minimo 10 caracteres)'); return; }
    setLoading(true); setError('');
    try {
      await api('/disputes', { method: 'POST', data: { service_id: id, reason: reason.trim() } });
      setSubmitted(true);
    } catch (e: any) { setError(e.message || 'Error al crear disputa'); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="warning" size={48} color={Colors.warning} />
          <Text style={styles.successTitle}>Disputa creada</Text>
          <Text style={styles.successText}>El pago queda congelado hasta que se resuelva. Un administrador revisara el caso.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reportar problema</Text>
        <Text style={styles.subtitle}>Contanos que paso con este servicio</Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Al abrir una disputa, el pago quedara congelado hasta que un administrador resuelva el caso.</Text>
        </View>

        <Text style={styles.label}>Motivo de la disputa *</Text>
        <TextInput style={[styles.input, styles.multiline]} value={reason}
          onChangeText={setReason} placeholder="Explica detalladamente que paso..."
          placeholderTextColor={Colors.textMuted} multiline numberOfLines={6} textAlignVertical="top" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btnDanger, loading && styles.btnDisabled]}
          onPress={handleSubmit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Abrir disputa'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  container: { padding: 24 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.warning },
  successText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  warningBox: { backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#fde68a' },
  warningText: { fontSize: 14, color: '#92400e', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 150, paddingTop: 14 },
  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnDanger: { backgroundColor: Colors.destructive, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
