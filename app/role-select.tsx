import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function RoleSelect() {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { setRole, updateUser, refreshUser } = useAuth();
  const router = useRouter();

  const handleSelectRole = (role: string) => { Keyboard.dismiss(); setSelected(role); };

  const handleStart = async () => {
    if (!selected || !firstName.trim()) return;
    setLoading(true);
    try {
      const cleanFirst = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
      const cleanLast = lastName.trim() ? lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1).toLowerCase() : '';
      await updateUser({ first_name: cleanFirst, last_name: cleanLast });
      await setRole(selected);
      await refreshUser();
      if (selected === 'provider') {
        router.replace('/verify-identity');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Bienvenido a Servicios</Text>
          <Text style={styles.subtitle}>Contanos un poco sobre vos</Text>

          <Text style={styles.label}>TU NOMBRE</Text>
          <TextInput testID="first-name-input" style={styles.input} placeholder="Nombre"
            placeholderTextColor={Colors.textSecondary} value={firstName} onChangeText={setFirstName} />
          <TextInput testID="last-name-input" style={[styles.input, { marginTop: 10 }]} placeholder="Apellido (opcional)"
            placeholderTextColor={Colors.textSecondary} value={lastName} onChangeText={setLastName} />

          <Text style={[styles.label, { marginTop: 24 }]}>QUE QUERES HACER?</Text>
          <View style={styles.cards}>
            <TouchableOpacity testID="role-client-btn"
              style={[styles.card, selected === 'client' && styles.cardSelected]}
              onPress={() => handleSelectRole('client')} activeOpacity={0.8}>
              <View style={[styles.iconCircle, selected === 'client' && styles.iconCircleSelected]}>
                <MaterialCommunityIcons name="briefcase-outline" size={32}
                  color={selected === 'client' ? Colors.white : Colors.primary} />
              </View>
              <Text style={[styles.cardTitle, selected === 'client' && styles.cardTitleSelected]}>Cliente</Text>
              <Text style={styles.cardDesc}>Necesito contratar a alguien</Text>
              {selected === 'client' && <View style={styles.check}><Ionicons name="checkmark-circle" size={24} color={Colors.primary} /></View>}
            </TouchableOpacity>

            <TouchableOpacity testID="role-provider-btn"
              style={[styles.card, selected === 'provider' && styles.cardSelected]}
              onPress={() => handleSelectRole('provider')} activeOpacity={0.8}>
              <View style={[styles.iconCircle, selected === 'provider' && styles.iconCircleSelected]}>
                <MaterialCommunityIcons name="hammer-wrench" size={32}
                  color={selected === 'provider' ? Colors.white : Colors.primary} />
              </View>
              <Text style={[styles.cardTitle, selected === 'provider' && styles.cardTitleSelected]}>Operario</Text>
              <Text style={styles.cardDesc}>Ofrecer servicios y ganar plata</Text>
              {selected === 'provider' && <View style={styles.check}><Ionicons name="checkmark-circle" size={24} color={Colors.primary} /></View>}
            </TouchableOpacity>
          </View>

          <Text style={styles.helper}>Podes cambiar de rol en cualquier momento</Text>

          <TouchableOpacity testID="start-btn" style={[styles.btn, (!selected || !firstName.trim()) && styles.btnDisabled]}
            onPress={handleStart} disabled={!selected || !firstName.trim() || loading} activeOpacity={0.8}>
            <Text style={styles.btnText}>Empezar</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 10 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  input: { height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, fontSize: 16, color: Colors.text, backgroundColor: Colors.card },
  cards: { gap: 16, marginTop: 8 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 24, borderWidth: 2, borderColor: Colors.border, ...Colors.shadow },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.accent },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  iconCircleSelected: { backgroundColor: Colors.primary },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  cardTitleSelected: { color: Colors.primary },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  check: { position: 'absolute', top: 16, right: 16 },
  helper: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginTop: 24 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
