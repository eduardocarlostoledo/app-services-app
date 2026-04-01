import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Profile() {
  const { user, logout, setRole, updateUser, loading } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const isProvider = user?.role === 'provider';

  useEffect(() => {
    if (!editing) {
      setFirstName(user?.first_name || '');
      setLastName(user?.last_name || '');
    }
  }, [user?.first_name, user?.last_name]);

  const handleLogout = () => { logout(); router.replace('/login'); };
  const handleSwitchRole = async (newRole: string) => { if (user?.role === newRole) return; await setRole(newRole); };

  const handleSaveName = async () => {
    if (firstName.trim()) {
      await updateUser({ first_name: firstName.trim(), last_name: lastName.trim() });
      setEditing(false);
    }
  };

  if (loading) return <SafeAreaView style={styles.safe}><Text style={styles.loadingText}>Cargando...</Text></SafeAreaView>;

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Sin nombre';
  const initial = (user?.first_name || '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}><Text style={styles.avatarLetter}>{initial}</Text></View>
            {editing ? (
              <View style={styles.editRow}>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput testID="first-name-input" style={styles.nameInput} value={firstName} onChangeText={setFirstName} placeholder="Nombre" autoFocus />
                  <TextInput testID="last-name-input" style={styles.nameInput} value={lastName} onChangeText={setLastName} placeholder="Apellido" />
                </View>
                <TouchableOpacity testID="save-name-btn" onPress={handleSaveName} style={styles.saveBtn}>
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelBtn}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditing(true)} style={styles.nameRow}>
                <Text style={styles.profileName}>{displayName}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.email}>{user?.email || user?.phone || ''}</Text>
          </View>

          <Text style={styles.sectionLabel}>MODO ACTUAL</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity testID="switch-provider-btn" style={[styles.modeBtn, isProvider && styles.modeBtnActive]}
              onPress={() => handleSwitchRole('provider')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="hammer-wrench" size={20} color={isProvider ? Colors.white : Colors.textMuted} />
              <Text style={[styles.modeBtnText, isProvider && styles.modeBtnTextActive]}>Operario</Text>
              <Text style={[styles.modeHintBase, isProvider && styles.modeHintActive]}>Ofrecer servicios y ganar plata</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="switch-client-btn" style={[styles.modeBtn, !isProvider && styles.modeBtnActive]}
              onPress={() => handleSwitchRole('client')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="briefcase-outline" size={20} color={!isProvider ? Colors.white : Colors.textMuted} />
              <Text style={[styles.modeBtnText, !isProvider && styles.modeBtnTextActive]}>Cliente</Text>
              <Text style={[styles.modeHintBase, !isProvider && styles.modeHintActive]}>Necesito contratar a alguien</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modeNote}>Podes cambiar de rol en cualquier momento</Text>

          {user?.verification_status !== 'approved' && (
            <TouchableOpacity testID="verify-identity-btn" style={styles.verifyBanner} activeOpacity={0.8}
              onPress={() => router.push('/verify-identity')}>
              <View style={styles.verifyIconWrap}><Ionicons name="shield-checkmark" size={28} color={Colors.primary} /></View>
              <View style={styles.verifyTextWrap}>
                <Text style={styles.verifyTitle}>Verifica tu identidad</Text>
                <Text style={styles.verifySub}>Subi tu DNI y una selfie para obtener el tilde verificado</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          <Text style={styles.sectionLabel}>CONFIGURACION</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity testID="edit-profile-btn" style={styles.menuItem} onPress={() => setEditing(true)} activeOpacity={0.7}>
              <Ionicons name="person-outline" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Editar perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/notification-settings' as any)}>
              <Ionicons name="notifications-outline" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Notificaciones</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/payment-methods' as any)}>
              <Ionicons name="card-outline" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Metodos de pago</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Ionicons name="help-circle-outline" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Ayuda</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          {['admin', 'superadmin'].includes(user?.role || '') && (
            <>
              <Text style={styles.sectionLabel}>ADMIN</Text>
              <View style={styles.menuCard}>
                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => router.push('/admin-broadcast' as any)}>
                  <Ionicons name="megaphone-outline" size={22} color={Colors.text} />
                  <Text style={styles.menuText}>Notificacion masiva</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={Colors.destructive} />
            <Text style={styles.logoutText}>Cerrar sesion</Text>
          </TouchableOpacity>
          <Text style={styles.version}>Servicios Argentina v1.0.0</Text>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  loadingText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 100 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarLetter: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.text },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, width: '80%' },
  nameInput: { height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 12, fontSize: 16, color: Colors.text, textAlign: 'center' },
  saveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f4f4f5', justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  modeToggle: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  modeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#f4f4f5', gap: 4, minHeight: 108 },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },
  modeBtnTextActive: { color: Colors.white },
  modeHintBase: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 15, marginTop: 2 },
  modeHintActive: { color: 'rgba(255,255,255,0.85)' },
  modeNote: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f0ff', borderRadius: 14, padding: 16, marginBottom: 20 },
  verifyIconWrap: { marginRight: 12 },
  verifyTextWrap: { flex: 1 },
  verifyTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  verifySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  menuCard: { backgroundColor: Colors.white, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#f0f0f2' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.text },
  menuDivider: { height: 1, backgroundColor: '#f4f4f5', marginLeft: 52 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.destructive },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 8 },
});
