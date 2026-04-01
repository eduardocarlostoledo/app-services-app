import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UserAPI, ProviderAPI, AuthAPI, getApiError } from '../../api.service';
import { useAuthStore } from '../../store';

const COLORS = {
  primary: '#895bf5',
  primaryLight: '#F3F0FF',
  bg: '#F8FAFF',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  danger: '#EF4444',
  white: '#FFFFFF',
};

export default function ProviderProfileEdit({ navigation }) {
  const { user, setAuth } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await AuthAPI.getMe();
      const u = data.user || data;
      setFirstName(u.first_name || '');
      setLastName(u.last_name || '');
      setBio(u.profile?.bio || '');
    } catch (err) {
      console.log('Profile load error:', getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      await UserAPI.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), bio: bio.trim() });
      Alert.alert('Guardado', 'Tu perfil fue actualizado.');
    } catch (err) {
      Alert.alert('Error', getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      try {
        await ProviderAPI.updateAvatar(formData);
        Alert.alert('Foto actualizada');
      } catch (err) {
        Alert.alert('Error', getApiError(err));
      }
    }
  };

  const handleUploadDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('document', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'document.jpg',
      });

      try {
        await ProviderAPI.uploadDocument(formData);
        Alert.alert('Documento enviado', 'Tu documento fue enviado para verificacion.');
      } catch (err) {
        Alert.alert('Error', getApiError(err));
      }
    }
  };

  const handleSwitchToClient = () => {
    Alert.alert('Cambiar a cliente', 'Queres cambiar tu rol a cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cambiar',
        onPress: async () => {
          try {
            await UserAPI.changeRole('client');
            const { data } = await AuthAPI.getMe();
            setAuth(data.user || data);
          } catch (err) {
            Alert.alert('Error', getApiError(err));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarSection} onPress={handleUploadAvatar}>
        <View style={styles.avatarCircle}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>
              {(firstName || 'P').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.avatarHint}>Tocar para cambiar foto</Text>
      </TouchableOpacity>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Tu nombre" />

        <Text style={styles.label}>Apellido</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Tu apellido" />

        <Text style={styles.label}>Bio / Descripcion</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Conta sobre tus servicios..."
          multiline
          maxLength={300}
        />

        <TouchableOpacity
          style={[styles.btn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
        </TouchableOpacity>
      </View>

      {/* Documents */}
      <TouchableOpacity style={styles.menuItem} onPress={handleUploadDocument}>
        <Text style={styles.menuText}>Subir documento de identidad</Text>
        <Text style={styles.menuArrow}>→</Text>
      </TouchableOpacity>

      {/* Switch Role */}
      <TouchableOpacity style={styles.menuItem} onPress={handleSwitchToClient}>
        <Text style={styles.menuText}>Cambiar a modo cliente</Text>
        <Text style={styles.menuArrow}>→</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.menuItem, { borderColor: COLORS.danger + '30' }]}
        onPress={() => {
          const { logout } = useAuthStore.getState();
          logout();
        }}
      >
        <Text style={[styles.menuText, { color: COLORS.danger }]}>Cerrar sesion</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.white },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },

  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: COLORS.primary },
  avatarHint: { fontSize: 13, color: COLORS.primary, marginTop: 8 },

  form: { paddingHorizontal: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },

  btn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 24, alignItems: 'center', marginTop: 20 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  menuText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuArrow: { fontSize: 18, color: COLORS.muted },
});
