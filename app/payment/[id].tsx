import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Payment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { createPreference(); }, []);

  const createPreference = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api('/payments/mercadopago/preference', {
        method: 'POST',
        data: { service_id: id },
      });
      setCheckoutUrl(res.init_point || res.sandbox_init_point);
    } catch (e: any) { setError(e.message || 'Error al generar pago'); }
    setLoading(false);
  };

  const handleNavigationChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('success') || url.includes('approved')) {
      Alert.alert('Pago exitoso', 'Tu pago fue procesado correctamente. Ahora comparti la direccion exacta para coordinar el trabajo.', [
        { text: 'Continuar', onPress: () => router.replace(`/address/${id}` as any) },
      ]);
    } else if (url.includes('failure') || url.includes('rejected')) {
      Alert.alert('Pago rechazado', 'No se pudo procesar el pago.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else if (url.includes('pending')) {
      Alert.alert('Pago pendiente', 'Tu pago esta siendo procesado.', [
        { text: 'OK', onPress: () => router.replace(`/progress/${id}`) },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Generando pago...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={createPreference}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagar con MercadoPago</Text>
        <View style={{ width: 40 }} />
      </View>

      {checkoutUrl ? (
        <WebView source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
          style={{ flex: 1 }} />
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo obtener la URL de pago</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 24 },
  loadingText: { fontSize: 15, color: Colors.textMuted, marginTop: 12 },
  errorText: { fontSize: 15, color: Colors.destructive, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24 },
  retryBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  backLink: { marginTop: 16 },
  backLinkText: { color: Colors.primary, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: Colors.white },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
});
