import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { ServiceAPI, CategoryAPI } from '../../api.service';
import { useCategoryStore } from '../../store';
import * as Location from 'expo-location';

export default function ServiceRequestScreen({ navigation, route }) {
  const prefillTitle = route.params?.title || '';
  const prefillDesc = route.params?.description || '';
  const { categories, loadCategories } = useCategoryStore();

  const [description, setDescription] = useState(prefillTitle ? `${prefillTitle}\n${prefillDesc}` : '');
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const requestLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setError('Necesitamos permiso de ubicacion'); setLocationLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (e) { setError('No se pudo obtener la ubicacion'); }
    setLocationLoading(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) { setError('La descripcion es obligatoria'); return; }
    if (!address.trim()) { setError('La direccion es obligatoria'); return; }
    if (!categoryId) { setError('Selecciona una categoria'); return; }
    if (!coords) { setError('Necesitamos tu ubicacion'); return; }

    setLoading(true); setError('');
    try {
      await ServiceAPI.request({
        description: description.trim(),
        address: address.trim(),
        category_id: categoryId,
        payment_method: paymentMethod,
        client_lat: coords.lat,
        client_lng: coords.lng,
      });
      navigation.goBack();
    } catch (e) { setError(e?.response?.data?.message || 'Error al solicitar servicio'); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={{ fontSize: 24, color: Colors.text }}>{'✕'}</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Nuevo servicio</Text>
          </View>

          <Text style={styles.label}>Categoria *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat.id}
                style={[styles.catChip, categoryId === cat.id && styles.catChipSelected]}
                onPress={() => setCategoryId(cat.id)}>
                <Text style={[styles.catChipText, categoryId === cat.id && styles.catChipTextSelected]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Descripcion *</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description}
            onChangeText={setDescription} placeholder="Describe lo que necesitas..."
            placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

          <Text style={styles.label}>Direccion *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress}
            placeholder="Ej: Av. Corrientes 1234, CABA" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.label}>Ubicacion GPS *</Text>
          <TouchableOpacity style={styles.locationBtn} onPress={requestLocation} disabled={locationLoading}>
            {locationLoading ? <ActivityIndicator size="small" color={Colors.primary} /> :
              <Text style={styles.locationBtnText}>{coords ? 'Ubicacion obtenida ✓' : 'Usar mi ubicacion'}</Text>}
          </TouchableOpacity>

          <Text style={styles.label}>Metodo de pago</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['cash', 'mercadopago'].map((m) => (
              <TouchableOpacity key={m} style={[styles.catChip, paymentMethod === m && styles.catChipSelected]}
                onPress={() => setPaymentMethod(m)}>
                <Text style={[styles.catChipText, paymentMethod === m && styles.catChipTextSelected]}>
                  {m === 'cash' ? 'Efectivo' : 'Mercado Pago'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnText}>{loading ? 'Publicando...' : 'Solicitar servicio'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 100, paddingTop: 14 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, marginRight: 8 },
  catChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  catChipTextSelected: { color: Colors.white },
  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f2f0ff', borderRadius: 14, paddingVertical: 18, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  locationBtnText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
