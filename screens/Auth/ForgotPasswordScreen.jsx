import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AuthAPI } from '../../api.service';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim()) { setError('Ingresá tu email'); return; }
    setLoading(true); setError('');
    try {
      await AuthAPI.forgotPassword(email.trim());
      setStep(2);
      setSuccess('Código enviado a tu email');
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al enviar código');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) { setError('Ingresá el código'); return; }
    setLoading(true); setError('');
    try {
      await AuthAPI.verifyOtp(email, otp);
      setStep(3);
      setSuccess('Código verificado');
    } catch (e) {
      setError(e?.response?.data?.message || 'Código incorrecto');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (newPassword.length < 8) { setError('Mínimo 8 caracteres'); return; }
    setLoading(true); setError('');
    try {
      await AuthAPI.resetPassword(email, otp, newPassword);
      setSuccess('Contraseña cambiada. Iniciá sesión.');
      setTimeout(() => navigation.goBack(), 2000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al cambiar contraseña');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24, color: Colors.text }}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Recuperar contraseña</Text>

        {step === 1 && (
          <>
            <Text style={styles.subtitle}>Te enviaremos un código a tu email</Text>
            <TextInput style={styles.input} value={email} onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="tu@email.com" placeholderTextColor={Colors.textMuted}
              keyboardType="email-address" autoCapitalize="none" />
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOTP} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar código'}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.subtitle}>Ingresá el código de 4 dígitos</Text>
            <TextInput style={styles.input} value={otp} onChangeText={(t) => { setOtp(t); setError(''); }}
              placeholder="1234" placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad" maxLength={4} />
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyOTP} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Verificando...' : 'Verificar'}</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.subtitle}>Elegí tu nueva contraseña</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={(t) => { setNewPassword(t); setError(''); }}
              placeholder="Nueva contraseña (min 8 chars)" placeholderTextColor={Colors.textMuted} secureTextEntry />
            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Cambiando...' : 'Cambiar contraseña'}</Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  input: {
    height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  btn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 12, textAlign: 'center' },
  successText: { color: Colors.success, fontSize: 13, marginTop: 12, textAlign: 'center' },
});
