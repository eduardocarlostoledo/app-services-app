import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '../../constants/colors';
import { UserAPI } from '../../api.service';
import { useAuthStore } from '../../store';

export default function RoleSelectScreen({ navigation }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser, loadProfile } = useAuthStore();

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await UserAPI.changeRole(selected);
      await loadProfile();
      const target = selected === 'provider' ? 'ProviderApp' : 'ClientApp';
      navigation.reset({ index: 0, routes: [{ name: target }] });
    } catch (e) {
      console.log('Error setting role:', e);
    }
    setLoading(false);
  };

  const RoleCard = ({ role, title, desc, icon }) => (
    <TouchableOpacity
      style={[styles.card, selected === role && styles.cardSelected]}
      onPress={() => { Keyboard.dismiss(); setSelected(role); }}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, selected === role && styles.iconCircleSelected]}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
      </View>
      <Text style={[styles.cardTitle, selected === role && styles.cardTitleSelected]}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </TouchableOpacity>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>¡Bienvenido!</Text>
          <Text style={styles.subtitle}>¿Qué querés hacer?</Text>

          <View style={styles.cards}>
            <RoleCard role="client" title="Busco servicios" desc="Necesito contratar a alguien" icon="📋" />
            <RoleCard role="provider" title="Ofrezco servicios" desc="Quiero trabajar y ganar plata" icon="🔧" />
          </View>

          <Text style={styles.helper}>Podés cambiar de rol en cualquier momento</Text>

          <TouchableOpacity
            style={[styles.btn, !selected && styles.btnDisabled]}
            onPress={handleStart}
            disabled={!selected || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? 'Configurando...' : 'Empezar'}</Text>
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
  cards: { gap: 16, marginTop: 8 },
  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 24,
    borderWidth: 2, borderColor: Colors.border, ...Colors.shadow,
  },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.accent },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconCircleSelected: { backgroundColor: Colors.primary },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  cardTitleSelected: { color: Colors.primary },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  helper: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginTop: 24 },
  btn: {
    backgroundColor: Colors.primary, height: 56, borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
