import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Rating() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api } = useAuth();
  const router = useRouter();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setLoading(true);
    try {
      await api(`/services/${id}/review`, { method: 'POST', data: { score, comment: comment.trim() } });
      setSubmitted(true);
      setTimeout(() => router.replace('/(tabs)'), 2000);
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          <Text style={styles.successTitle}>Gracias por tu calificacion!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Calificar servicio</Text>
        <Text style={styles.subtitle}>Como fue tu experiencia?</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setScore(s)}>
              <Ionicons name={s <= score ? 'star' : 'star-outline'} size={40}
                color={s <= score ? '#eab308' : Colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput style={[styles.input, styles.multiline]} value={comment}
          onChangeText={setComment} placeholder="Comentario opcional..."
          placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

        <TouchableOpacity style={[styles.btn, (loading || score === 0) && styles.btnDisabled]}
          onPress={handleSubmit} disabled={loading || score === 0}>
          <Text style={styles.btnText}>{loading ? 'Enviando...' : 'Enviar calificacion'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 32 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.success },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 100, paddingTop: 14 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
