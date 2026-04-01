import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
 
export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const { smsVerify, smsLogin } = useAuth();
  const router = useRouter();
  const inputs = useRef<(TextInput | null)[]>([]);
  const isSubmittingRef = useRef(false);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (overrideCode?: string[]) => {
    const finalCodeArray = overrideCode ?? code;
    const fullCode = finalCodeArray.join('');
    if (fullCode.length !== 6) { setError('Ingresa el codigo completo'); return; }
    if (isSubmittingRef.current || loading) return;

    isSubmittingRef.current = true;
    setLoading(true); setError('');
    try {
      const data = await smsVerify(String(phone || ''), fullCode);
      if (data.user.role) router.replace('/(tabs)');
      else router.replace('/role-select');
    } catch (e: any) {
      setError(e.message || 'Codigo incorrecto');
      isSubmittingRef.current = false;
      setLoading(false);
      return;
    }
    isSubmittingRef.current = false;
    setLoading(false);
  };

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    const isCodeFull = code.every((d) => d !== '');
    if (isCodeFull && cleaned.length > 0) return;

    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const newCode = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { newCode[i] = d; });
      setCode(newCode); setError('');
      const lastIndex = Math.min(digits.length - 1, 5);
      inputs.current[lastIndex]?.focus();
      if (digits.length === 6) handleVerify(newCode);
      return;
    }

    if (code[index] !== '' && cleaned.length === 1) return;
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode); setError('');
    if (cleaned) {
      if (index < 5) inputs.current[index + 1]?.focus();
      if (index === 5 && newCode.join('').length === 6) handleVerify(newCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = [...code];
      if (newCode[index]) { newCode[index] = ''; setCode(newCode); setError(''); }
      else if (index > 0) { newCode[index - 1] = ''; setCode(newCode); setError(''); inputs.current[index - 1]?.focus(); }
    }
  };
 
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn} disabled={loading}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Codigo SMS</Text>
          <Text style={styles.subtitle}>Enviado a {phone}</Text>
          <Text style={styles.helper}>Pega el codigo si tu telefono lo detecta automaticamente. Si no llega, podes pedir otro en unos segundos.</Text>

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput key={i} ref={(ref) => { inputs.current[i] = ref; }}
                testID={`code-input-${i}`}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                value={digit} onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad" maxLength={6} editable={!loading}
                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={i === 0 ? 'sms-otp' : 'off'} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity testID="confirm-btn" style={[styles.btn, loading && styles.btnDisabled]}
            onPress={() => handleVerify()} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.btnText}>{loading ? 'Verificando...' : 'Confirmar'}</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="resend-btn" style={styles.resend} disabled={loading || cooldown > 0}
            onPress={async () => {
              if (cooldown > 0) return;
              try {
                await smsLogin(String(phone || ''));
                setCooldown(30);
                setError('Código reenviado');
              } catch (e: any) {
                setError(e.message || 'Error al reenviar');
              }
            }}>
            <Text style={styles.resendText}>{cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar codigo'}</Text>
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
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 24 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  helper: { fontSize: 13, color: Colors.textMuted, marginTop: 10, lineHeight: 18 },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 32 },
  codeInput: { width: 48, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: Colors.text, backgroundColor: Colors.background },
  codeInputFilled: { borderColor: Colors.primary, backgroundColor: Colors.accent },
  error: { color: Colors.destructive, fontSize: 13, textAlign: 'center', marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  resend: { alignItems: 'center', marginTop: 20 },
  resendText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },
});
