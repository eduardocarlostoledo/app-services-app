import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Address() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/services/${id}`);
        const service = res.service || res;
        setAddress(service.address || '');
        setDetails(service.notes || '');
      } catch (e) {
        console.log(e);
      }
      setBootLoading(false);
    })();
  }, [api, id]);

  const handleSave = async () => {
    if (!address.trim()) {
      setError('La direccion es obligatoria');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api(`/services/${id}/address`, {
        method: 'PUT',
        data: { address: address.trim(), details: details.trim() },
      });
      setSavedOnce(true);
      router.replace(`/chat/${id}` as any);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    }
    setLoading(false);
  };

  if (bootLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Compartir direccion final</Text>
          <Text style={styles.subtitle}>Estos datos se comparten solo con la contraparte del servicio para coordinar correctamente.</Text>

          <View style={styles.storyCard}>
            <View style={styles.storyRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>La direccion exacta no se expone en el feed publico.</Text>
            </View>
            <View style={styles.storyRow}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>Al guardar, dejamos estos datos tambien dentro del chat para que ambas partes los tengan a mano.</Text>
            </View>
          </View>

          <Text style={styles.label}>Direccion exacta *</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Calle, numero, piso, depto"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Detalles de acceso</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={details}
            onChangeText={setDetails}
            placeholder="Timbre, entre calles, porton, horario sugerido o indicaciones de ingreso"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>Ejemplo: timbre 2B, porton negro, tocar al llegar o llamar desde la puerta.</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnText}>{loading ? 'Guardando...' : savedOnce ? 'Actualizando...' : 'Guardar y abrir chat'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 20, lineHeight: 22 },
  storyCard: { backgroundColor: Colors.accent, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e9ddff', marginBottom: 4 },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.background, borderRadius: 12, minHeight: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { minHeight: 104, paddingTop: 14, paddingBottom: 14 },
  helperText: { fontSize: 12, color: Colors.textMuted, marginTop: 8, lineHeight: 18 },
  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
