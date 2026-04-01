import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AuthAPI } from '../../api.service';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { useAuthStore } = require('../../store');
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completá email y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await AuthAPI.login(email.trim(), password);
      await setAuth(data.accessToken, data.refreshToken, data.user);

      if (!data.user.role || data.user.role === 'client') {
        navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] });
      } else {
        const target = data.user.role === 'provider' ? 'ProviderApp' : 'ClientApp';
        navigation.reset({ index: 0, routes: [{ name: target }] });
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Error al iniciar sesión');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.wave}>Hola</Text>
            <Text style={styles.title}>{'Iniciá sesión\nen tu cuenta'}</Text>
            <Text style={styles.subtitle}>Ingresá tus datos para continuar</Text>
          </View>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(t) => { setEmail(t); setError(''); }}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            placeholder="Contraseña"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? 'Ingresando...' : 'Iniciar sesión'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>¿No tenés cuenta? <Text style={styles.linkBold}>Registrate</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkText}>Olvidé mi contraseña</Text>
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
  input: {
    height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  errorText: { color: Colors.destructive, fontSize: 13, marginTop: 8, marginLeft: 4 },
  btn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primary, fontWeight: '600' },
});
