import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Recover() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();
  const router = useRouter();

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Ingresa un email valido'); return; }
    setLoading(true); setError('');
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) { setError(e.message || 'Error al enviar el codigo'); }
    setLoading(false);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="mail-outline" size={48} color={Colors.primary} />
          <Text style={styles.sentTitle}>Codigo enviado</Text>
          <Text style={styles.sentSub}>Revisa tu email {email} y usa el codigo OTP para restablecer tu cuenta</Text>
          <TouchableOpacity style={styles.btn}
            onPress={() => router.push({ pathname: '/reset-password', params: { email } })} activeOpacity={0.8}>
            <Text style={styles.btnText}>Ingresar codigo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Volver al login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Recuperar cuenta</Text>
          <Text style={styles.subtitle}>Te enviaremos un codigo OTP a tu email para restablecer tu acceso</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="tu@email.com" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none" />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSend} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar codigo'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 24 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginTop: 24, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 14, height: 56, paddingHorizontal: 16,
    fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 8 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center',
    justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  sentTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  sentSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  backLink: { marginTop: 12 },
  backLinkText: { color: Colors.textMuted, fontSize: 14 },
});
