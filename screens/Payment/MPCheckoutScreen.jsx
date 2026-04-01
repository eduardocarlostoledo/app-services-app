import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { PaymentAPI, getApiError } from '../../api.service';

const COLORS = {
  primary: '#895bf5',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  white: '#FFFFFF',
  success: '#059669',
};

export default function MPCheckoutScreen({ navigation, route }) {
  const { serviceId } = route.params || {};
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    createPreference();
  }, []);

  const createPreference = async () => {
    try {
      const { data } = await PaymentAPI.createMPPreference(serviceId);
      setCheckoutUrl(data.init_point || data.sandbox_init_point);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleNavigationChange = (navState) => {
    const { url } = navState;

    if (url.includes('success') || url.includes('approved')) {
      Alert.alert('Pago exitoso', 'Tu pago fue procesado correctamente.', [
        { text: 'OK', onPress: () => navigation.navigate('Tracking', { serviceId }) },
      ]);
    } else if (url.includes('failure') || url.includes('rejected')) {
      Alert.alert('Pago rechazado', 'No se pudo procesar el pago. Intenta de nuevo.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else if (url.includes('pending')) {
      Alert.alert('Pago pendiente', 'Tu pago esta siendo procesado.', [
        { text: 'OK', onPress: () => navigation.navigate('Tracking', { serviceId }) },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagar con MercadoPago</Text>
        <View style={{ width: 40 }} />
      </View>

      {checkoutUrl ? (
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationChange}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          )}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo obtener la URL de pago</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg, padding: 24 },
  loadingText: { fontSize: 15, color: COLORS.muted, marginTop: 12 },
  errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24 },
  retryBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  backLink: { marginTop: 16 },
  backLinkText: { color: COLORS.primary, fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: COLORS.card },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
});
