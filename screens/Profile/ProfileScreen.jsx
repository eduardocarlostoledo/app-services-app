import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store';
import { UserAPI } from '../../api.service';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser, loadProfile } = useAuthStore();
  const isProvider = user?.role === 'provider';
  const profileName = user?.profile?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const initial = profileName.charAt(0).toUpperCase();

  const handleRoleSwitch = async () => {
    const newRole = isProvider ? 'client' : 'provider';
    try {
      await UserAPI.changeRole(newRole);
      await loadProfile();
      const target = newRole === 'provider' ? 'ProviderApp' : 'ClientApp';
      navigation.reset({ index: 0, routes: [{ name: target }] });
    } catch (e) { console.log(e); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{profileName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={styles.switchBtn} onPress={handleRoleSwitch}>
          <Text style={styles.switchText}>Cambiar a {isProvider ? 'Cliente' : 'Operario'}</Text>
        </TouchableOpacity>

        <View style={styles.menu}>
          {[
            { label: 'Editar perfil', onPress: () => navigation.navigate('ProviderProfileEdit') },
            { label: 'Notificaciones', onPress: () => navigation.navigate('Notifications') },
            { label: 'Metodos de pago', onPress: () => {} },
            { label: 'Ayuda', onPress: () => {} },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={styles.menuItem} onPress={item.onPress}>
              <Text style={styles.menuText}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 48 },
  avatarBox: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  switchBtn: { backgroundColor: Colors.accent, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.primary },
  switchText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  menu: { marginBottom: 24 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuText: { fontSize: 16, color: Colors.text },
  menuChevron: { fontSize: 20, color: Colors.textMuted },
  logoutBtn: { backgroundColor: '#fef1f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.destructive },
});
