import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AuthAPI } from '../../api.service';
import { useAuthStore } from '../../store';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();

  const update = (key, val) => { setForm((f) => ({ ...f, [key]: val })); setError(''); };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.first_name) {
      setError('Completá los campos obligatorios');
      return;
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await AuthAPI.register(form);
      if (data.accessToken) {
        await setAuth(data.accessToken, data.refreshToken, data.user);
        navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
      } else {
        setError('Registro exitoso. Verificá tu email e iniciá sesión.');
        setTimeout(() => navigation.goBack(), 2000);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al registrarse');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={{ fontSize: 24, color: Colors.text }}>{'←'}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Completá tus datos para empezar</Text>

          <Text style={styles.label}>NOMBRE *</Text>
          <TextInput style={styles.input} value={form.first_name} onChangeText={(t) => update('first_name', t)}
            placeholder="Tu nombre" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.label}>APELLIDO</Text>
          <TextInput style={styles.input} value={form.last_name} onChangeText={(t) => update('last_name', t)}
            placeholder="Tu apellido" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.label}>EMAIL *</Text>
          <TextInput style={styles.input} value={form.email} onChangeText={(t) => update('email', t)}
            placeholder="tu@email.com" placeholderTextColor={Colors.textMuted}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>TELÉFONO</Text>
          <TextInput style={styles.input} value={form.phone} onChangeText={(t) => update('phone', t)}
            placeholder="+549 11 2345 6789" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

          <Text style={styles.label}>CONTRASEÑA *</Text>
          <TextInput style={styles.input} value={form.password} onChangeText={(t) => update('password', t)}
            placeholder="Mínimo 8 caracteres" placeholderTextColor={Colors.textMuted} secureTextEntry />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Registrando...' : 'Crear cuenta'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: {
    height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 12, textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 32,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
