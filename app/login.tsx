import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { smsLogin, googleLogin } = useAuth();
  const router = useRouter();
  const formattedPhone = phone.length > 6
    ? `${phone.slice(0, 2)} ${phone.slice(2, 6)}-${phone.slice(6)}`
    : phone.length > 2
      ? `${phone.slice(0, 2)} ${phone.slice(2)}`
      : phone;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    redirectUri: Platform.select({
      web: undefined,
      default: 'https://auth.expo.io/@marketgatonegro/servicios-argentina',
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      handleGoogleResponse(idToken);
    } else if (response?.type === 'error') {
      setError('Error al autenticar con Google');
      setGoogleLoading(false);
    } else if (response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleResponse = async (idToken: string) => {
    try {
      const data = await googleLogin(idToken);
      if (data.user.role) router.replace('/(tabs)');
      else router.replace('/role-select');
    } catch (e: any) {
      setError(e.message || 'Error con Google Sign-In');
    }
    setGoogleLoading(false);
  };

  const normalizePhone = (input: string): string => {
    return input.replace(/\D/g, '').slice(0, 10);
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = normalizePhone(text);
    setPhone(cleaned);
    if (phoneError) setPhoneError('');
  };

  const handleLogin = async () => {
    if (phone.length !== 10) {
      setPhoneError('Ingresa 10 digitos');
      return;
    }
    const fullNumber = `+549${phone}`;
    setLoading(true); setError('');
    try {
      await smsLogin(fullNumber);
      router.push({ pathname: '/verify', params: { phone: fullNumber } });
    } catch (e: any) { setError(e.message || 'Error al enviar codigo'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.wave}>Hola</Text>
            <Text style={styles.title}>Ingresa tu numero{'\n'}para continuar</Text>
            <Text style={styles.subtitle}>Te enviamos un codigo por SMS para entrar rapido y sin contrasena.</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>Usamos tu numero solo para validar el acceso y avisarte del estado de tus servicios.</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={22} color={Colors.textMuted} />
            <Text style={styles.prefix}>+54 9</Text>
            <TextInput testID="phone-input" style={styles.input} value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad" maxLength={10}
              placeholder="1123456789" placeholderTextColor={Colors.textMuted} />
          </View>
          <Text style={styles.hintText}>Sin 0 ni 15. Ejemplo: {formattedPhone || '11 2345-6789'}</Text>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity testID="continue-btn" style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Continuar'}</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={[styles.googleBtn, (!request || googleLoading) && styles.btnDisabled]}
            onPress={() => { setGoogleLoading(true); setError(''); promptAsync(); }}
            disabled={!request || googleLoading || loading} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={20} color={Colors.text} />
            <Text style={styles.googleBtnText}>{googleLoading ? 'Conectando...' : 'Continuar con Google'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.altLogin} onPress={() => router.push('/recover')} activeOpacity={0.7}>
            <Text style={styles.altLoginText}>Recuperar cuenta por email</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { marginBottom: 40 },
  wave: { fontSize: 32, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, lineHeight: 36 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 8 },
  infoCard: { backgroundColor: Colors.accent, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e9ddff' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: Colors.border },
  prefix: { fontSize: 18, color: Colors.text, fontWeight: '500', marginLeft: 10, marginRight: 4 },
  input: { flex: 1, fontSize: 18, color: Colors.text, fontWeight: '500' },
  hintText: { color: '#888', fontSize: 12, marginTop: 6, textAlign: 'center' },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 8, marginLeft: 4 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: Colors.textMuted },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 28,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginTop: 16, gap: 10 },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  altLogin: { alignItems: 'center', marginTop: 20 },
  altLoginText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },
});
