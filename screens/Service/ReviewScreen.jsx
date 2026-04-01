import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { ServiceAPI } from '../../api.service';

export default function ReviewScreen({ navigation, route }) {
  const { serviceId } = route.params;
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setLoading(true);
    try {
      await ServiceAPI.review(serviceId, score, comment.trim());
      setSubmitted(true);
      setTimeout(() => navigation.goBack(), 2000);
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>✓</Text>
          <Text style={styles.successTitle}>¡Gracias por tu calificacion!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24, color: Colors.text }}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calificar servicio</Text>
        <Text style={styles.subtitle}>¿Como fue tu experiencia?</Text>

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setScore(s)}>
              <Text style={[styles.star, s <= score && styles.starFilled]}>{s <= score ? '★' : '☆'}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 32 },
  successTitle: { fontSize: 20, fontWeight: '700', color: Colors.success },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  star: { fontSize: 40, color: Colors.muted },
  starFilled: { color: '#eab308' },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 100, paddingTop: 14 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
