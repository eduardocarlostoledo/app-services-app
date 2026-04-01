import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useAuth } from '../src/context/AuthContext';

export default function AdminBroadcastScreen() {
  const router = useRouter();
  const { api, user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'client' | 'provider'>('all');
  const [sending, setSending] = useState(false);

  if (!['admin', 'superadmin'].includes(user?.role || '')) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.title}>Acceso restringido</Text>
          <Text style={styles.subtitle}>Esta herramienta esta disponible solo para administradores.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Notificacion masiva', 'Completa titulo y mensaje.');
      return;
    }
    setSending(true);
    try {
      const res = await api('/admin/notifications/broadcast', {
        method: 'POST',
        data: {
          title: title.trim(),
          body: body.trim(),
          type: 'system',
          target_role: targetRole,
        },
      });
      Alert.alert('Envio realizado', `Se enviaron ${res.sent || 0} notificaciones.`);
      setTitle('');
      setBody('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar la notificacion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Broadcast admin</Text>
              <Text style={styles.subtitle}>Envia una notificacion personalizada a todos los usuarios o a un rol especifico.</Text>
            </View>
          </View>

          <Text style={styles.label}>Segmento</Text>
          <View style={styles.row}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'client', label: 'Clientes' },
              { key: 'provider', label: 'Operarios' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, targetRole === item.key && styles.chipActive]}
                onPress={() => setTargetRole(item.key as any)}
              >
                <Text style={[styles.chipText, targetRole === item.key && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Titulo</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Mantenimiento programado" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.label}>Mensaje</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholder="Escribe el contenido de la notificacion que quieres mostrar en la app."
            placeholderTextColor={Colors.textMuted}
          />

          <TouchableOpacity style={[styles.btn, sending && styles.btnDisabled]} onPress={handleSend} disabled={sending}>
            <Text style={styles.btnText}>{sending ? 'Enviando...' : 'Enviar notificacion'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 20 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary },
  input: { backgroundColor: Colors.background, borderRadius: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { minHeight: 120 },
  btn: { marginTop: 24, backgroundColor: Colors.primary, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
