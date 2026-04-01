import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function MakeOffer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const suggestedDurations = ['30', '60', '90'];

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/services/${id}`);
        setService(res.service || res);
        if (res.service?.estimated_price && !price) {
          setPrice(String(Math.round(Number(res.service.estimated_price))));
        }
      } catch {}
    })();
  }, [api, id]);

  const handleSubmit = async () => {
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) { setError('Ingresa un precio valido'); return; }
    if (message.trim().length < 12) { setError('Conta brevemente como harias el trabajo para generar confianza'); return; }
    setLoading(true); setError('');
    try {
      await api(`/services/${id}/offers`, {
        method: 'POST',
        data: {
          price: Number(price),
          message: message.trim(),
          estimated_duration_minutes: etaMinutes ? Number(etaMinutes) : undefined,
        },
      });
      router.back();
    } catch (e: any) { setError(e.message || 'Error al enviar oferta'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Enviar oferta</Text>
          <Text style={styles.subtitle}>Presentate con claridad y explicale al cliente que incluye tu propuesta.</Text>

          {service && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>SERVICIO</Text>
              <Text style={styles.summaryTitle}>{service.title || service.description}</Text>
              {service.address ? <Text style={styles.summaryText}>{service.address}</Text> : null}
            </View>
          )}

          <Text style={styles.label}>Precio (ARS) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice}
            placeholder="Ej: 15000" placeholderTextColor={Colors.textMuted}
            keyboardType="numeric" />
          <Text style={styles.helperText}>Mostra el valor final estimado para evitar idas y vueltas.</Text>

          <Text style={styles.label}>Tiempo estimado (minutos)</Text>
          <TextInput style={styles.input} value={etaMinutes} onChangeText={setEtaMinutes}
            placeholder="Ej: 60" placeholderTextColor={Colors.textMuted}
            keyboardType="numeric" />
          <View style={styles.quickRow}>
            {suggestedDurations.map((duration) => (
              <TouchableOpacity key={duration} style={[styles.quickChip, etaMinutes === duration && styles.quickChipActive]} onPress={() => setEtaMinutes(duration)}>
                <Text style={[styles.quickChipText, etaMinutes === duration && styles.quickChipTextActive]}>{duration} min</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Mensaje al cliente</Text>
          <TextInput style={[styles.input, styles.multiline]} value={message}
            onChangeText={setMessage} placeholder="Ej: Hola, puedo resolverlo hoy. Incluye mano de obra, revision y materiales basicos."
            placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
          <Text style={styles.helperText}>Un buen mensaje aumenta la confianza y mejora tu tasa de aceptacion.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar oferta'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 100, paddingTop: 14 },
  helperText: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  summaryCard: { backgroundColor: Colors.accent, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e9ddff' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 6 },
  summaryText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  quickChipActive: { backgroundColor: Colors.accent, borderColor: Colors.primary },
  quickChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  quickChipTextActive: { color: Colors.primary },
  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
