import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPassword() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();
  const router = useRouter();

  const handleReset = async () => {
    if (!otp.trim()) { setError('Ingresa el codigo OTP'); return; }
    if (password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contrasenas no coinciden'); return; }

    setLoading(true); setError('');
    try {
      await resetPassword(String(email || ''), otp.trim(), password);
      Alert.alert('Listo', 'Tu contrasena fue restablecida. Ya podes iniciar sesion.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } catch (e: any) { setError(e.message || 'Error al restablecer'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nueva contrasena</Text>
          <Text style={styles.subtitle}>Ingresa el codigo OTP que recibiste por email</Text>

          <Text style={styles.label}>Codigo OTP</Text>
          <TextInput style={styles.input} value={otp} onChangeText={setOtp}
            placeholder="123456" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />

          <Text style={styles.label}>Nueva contrasena</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            placeholder="Min. 6 caracteres" placeholderTextColor={Colors.textMuted} secureTextEntry />

          <Text style={styles.label}>Confirmar contrasena</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="Repetir contrasena" placeholderTextColor={Colors.textMuted} secureTextEntry />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleReset} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.btnText}>{loading ? 'Restableciendo...' : 'Restablecer contrasena'}</Text>
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
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: Colors.background, borderRadius: 14, height: 56, paddingHorizontal: 16,
    fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 8 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center',
    justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
