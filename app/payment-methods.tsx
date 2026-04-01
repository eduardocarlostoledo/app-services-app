import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';

WebBrowser.maybeCompleteAuthSession();

type PaymentSetup = {
  cvu_loaded: boolean;
  cvu?: string | null;
  mp_connected: boolean;
  mp_user_id?: string | null;
  can_receive_mp: boolean;
};

const maskCvu = (value?: string | null) => {
  if (!value) return 'No cargado';
  if (value.length <= 4) return value;
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
};

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mp?: string; message?: string }>();
  const { user, api, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [setup, setSetup] = useState<PaymentSetup | null>(user?.payment_setup || null);
  const [cvu, setCvu] = useState(user?.payment_setup?.cvu || '');

  const load = useCallback(async () => {
    if (user?.role !== 'provider') {
      setLoading(false);
      return;
    }

    try {
      const res = await api<{ payment_setup: PaymentSetup }>('/providers/payment-setup');
      setSetup(res.payment_setup);
      setCvu(res.payment_setup?.cvu || '');
    } catch (error: any) {
      Alert.alert('Cobros', error.message || 'No se pudo cargar la configuracion de cobros.');
    } finally {
      setLoading(false);
    }
  }, [api, user?.role]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  useEffect(() => {
    if (params.mp === 'connected') {
      refreshUser().catch(() => {});
      load();
      Alert.alert('MercadoPago conectado', 'Tu cuenta quedo vinculada correctamente.');
      router.replace('/payment-methods' as any);
    } else if (params.mp === 'error') {
      Alert.alert('No se pudo conectar MercadoPago', String(params.message || 'Revisa la configuracion OAuth.'));
      router.replace('/payment-methods' as any);
    }
  }, [load, params.message, params.mp, refreshUser, router]);

  const handleSaveCvu = async () => {
    const cleanCvu = cvu.replace(/\D/g, '');
    if (cleanCvu.length !== 22) {
      Alert.alert('CVU/CBU invalido', 'Tiene que tener 22 digitos.');
      return;
    }

    setSaving(true);
    try {
      const res = await api<{ payment_setup: PaymentSetup }>('/providers/payment-setup', {
        method: 'PATCH',
        data: { cvu: cleanCvu },
      });
      setSetup(res.payment_setup);
      await refreshUser();
      Alert.alert('Cobros actualizados', 'Guardamos tu CVU/CBU.');
    } catch (error: any) {
      Alert.alert('Cobros', error.message || 'No se pudo guardar el CVU/CBU.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectMercadoPago = async () => {
    setConnecting(true);
    try {
      const returnUrl = Linking.createURL('/payment-methods');
      const connectRes = await api<{ auth_url: string }>(`/providers/mercadopago/connect?frontend_redirect=${encodeURIComponent(returnUrl)}`);
      const result = await WebBrowser.openAuthSessionAsync(connectRes.auth_url, returnUrl, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        if (parsed.queryParams?.mp === 'connected') {
          await refreshUser();
          await load();
          Alert.alert('MercadoPago conectado', 'Tu cuenta quedo vinculada correctamente.');
        } else if (parsed.queryParams?.mp === 'error') {
          Alert.alert('No se pudo conectar MercadoPago', String(parsed.queryParams?.message || 'Revisa la configuracion OAuth.'));
        }
      }
    } catch (error: any) {
      Alert.alert('MercadoPago', error.message || 'No se pudo iniciar la conexion.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectMercadoPago = async () => {
    setConnecting(true);
    try {
      const res = await api<{ payment_setup: PaymentSetup }>('/providers/mercadopago/disconnect', {
        method: 'DELETE',
      });
      setSetup(res.payment_setup);
      await refreshUser();
      Alert.alert('MercadoPago desconectado', 'La cuenta vinculada fue removida de tu perfil.');
    } catch (error: any) {
      Alert.alert('MercadoPago', error.message || 'No se pudo desconectar la cuenta.');
    } finally {
      setConnecting(false);
    }
  };

  if (user?.role !== 'provider') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.title}>Metodos de cobro</Text>
          <Text style={styles.subtitle}>Esta seccion esta disponible solo para perfiles de operario.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Metodos de cobro</Text>
        <Text style={styles.subtitle}>Conecta MercadoPago y carga tu CVU para recibir pagos desde la app.</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Cargando configuracion...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.row}>
                <MaterialCommunityIcons name="bank-transfer" size={22} color={Colors.primary} />
                <View style={styles.rowText}>
                  <Text style={styles.cardTitle}>CVU / CBU</Text>
                  <Text style={styles.cardHint}>Lo usamos como respaldo operativo y para conciliacion.</Text>
                </View>
              </View>

              <TextInput
                style={styles.input}
                value={cvu}
                onChangeText={setCvu}
                keyboardType="numeric"
                maxLength={22}
                placeholder="0000003100000000000001"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.meta}>Actual: {maskCvu(setup?.cvu)}</Text>

              <TouchableOpacity style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={handleSaveCvu} disabled={saving}>
                <Text style={styles.primaryBtnText}>{saving ? 'Guardando...' : 'Guardar CVU / CBU'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="card-outline" size={22} color={Colors.primary} />
                <View style={styles.rowText}>
                  <Text style={styles.cardTitle}>MercadoPago Marketplace</Text>
                  <Text style={styles.cardHint}>Conecta tu cuenta para cobrar servicios digitales con split de comision.</Text>
                </View>
              </View>

              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Estado</Text>
                <Text style={[styles.statusValue, setup?.mp_connected ? styles.okText : styles.warnText]}>
                  {setup?.mp_connected ? 'Conectado' : 'Sin conectar'}
                </Text>
              </View>

              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Collector ID</Text>
                <Text style={styles.statusPlain}>{setup?.mp_user_id || 'No disponible'}</Text>
              </View>

              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Listo para cobrar por MP</Text>
                <Text style={[styles.statusValue, setup?.can_receive_mp ? styles.okText : styles.warnText]}>
                  {setup?.can_receive_mp ? 'Si' : 'Todavia no'}
                </Text>
              </View>

              {!setup?.mp_connected ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, connecting && styles.btnDisabled]}
                  onPress={handleConnectMercadoPago}
                  disabled={connecting}
                >
                  <Text style={styles.primaryBtnText}>{connecting ? 'Conectando...' : 'Conectar MercadoPago'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.secondaryBtn, connecting && styles.btnDisabled]}
                  onPress={handleDisconnectMercadoPago}
                  disabled={connecting}
                >
                  <Text style={styles.secondaryBtnText}>{connecting ? 'Procesando...' : 'Desconectar cuenta'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Checklist para cobrar</Text>
              <Text style={styles.infoItem}>1. Tener CVU/CBU cargado.</Text>
              <Text style={styles.infoItem}>2. Conectar MercadoPago.</Text>
              <Text style={styles.infoItem}>3. Completar verificacion de identidad.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 21, color: Colors.textSecondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 18, gap: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowText: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardHint: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  input: { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.card },
  meta: { fontSize: 12, color: Colors.textMuted },
  statusBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  statusLabel: { fontSize: 13, color: Colors.textSecondary },
  statusValue: { fontSize: 14, fontWeight: '700' },
  statusPlain: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  okText: { color: Colors.success },
  warnText: { color: Colors.warning },
  primaryBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  secondaryBtn: { borderWidth: 1.5, borderColor: Colors.border, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.card },
  secondaryBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  infoCard: { backgroundColor: Colors.accent, borderRadius: 18, padding: 18, gap: 8 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoItem: { fontSize: 13, color: Colors.textSecondary },
});
