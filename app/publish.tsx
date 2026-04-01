import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const DRAFT_KEY = '@publish_draft';

interface Draft {
  description: string;
  address: string;
  categoryId: string;
  paymentMethod: string;
  coords: { lat: number; lng: number } | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  electricista: 'flash',
  plomero: 'water',
  herrero: 'hammer',
  cerrajero: 'key',
  pintor: 'color-palette',
  albanil: 'construct',
  refrigeracion: 'snow',
  lavarropas: 'shirt',
  gasista: 'flame',
  'paneles-solares': 'sunny',
  'camaras-seguridad': 'videocam',
  'reparacion-computadora': 'desktop',
  'reparacion-celulares': 'phone-portrait',
};

export default function Publish() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; description?: string }>();
  const { api, token } = useAuth();

  const prefill = params.title ? `${params.title}\n${params.description || ''}` : '';
  const [description, setDescription] = useState(prefill);
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const descriptionLength = description.trim().length;
  const canSubmit = !!description.trim() && !!address.trim() && !!categoryId && !!coords && !loading && !sessionExpired;
  const selectedPaymentLabel = paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Efectivo';

  // Restore draft on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft: Draft = JSON.parse(raw);
          if (draft.description) setDescription(draft.description);
          if (draft.address) setAddress(draft.address);
          if (draft.categoryId) setCategoryId(draft.categoryId);
          if (draft.paymentMethod) setPaymentMethod(draft.paymentMethod);
          if (draft.coords) setCoords(draft.coords);
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      } catch {}
    })();
  }, []);

  // Load categories
  useFocusEffect(
    useCallback(() => {
      (async () => {
        setCategoriesLoading(true);
        try {
          const res = await api<any>('/categories');
          setCategories(res.data || res.categories || []);
          setSessionExpired(false);
        } catch (e: any) {
          if (!token) setSessionExpired(true);
          else console.log(e);
        } finally {
          setCategoriesLoading(false);
        }
      })();
    }, [token])
  );

  const saveDraft = async () => {
    const draft: Draft = { description, address, categoryId, paymentMethod, coords };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  const handleLoginRedirect = async () => {
    await saveDraft();
    router.push('/login');
  };

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
      const res = await api<{ service_id: string }>('/services', {
        method: 'POST',
        data: {
          description: description.trim(),
          address: address.trim(),
          category_id: categoryId,
          payment_method: paymentMethod,
          client_lat: coords.lat,
          client_lng: coords.lng,
        },
      });
      await AsyncStorage.removeItem(DRAFT_KEY);
      router.replace(`/service/${res.service_id}` as any);
    } catch (e: any) {
      if (!token) {
        setSessionExpired(true);
        await saveDraft();
      } else {
        setError(e.message || 'Error al solicitar servicio');
      }
    }
    setLoading(false);
  };

  const selectedCatName = categories.find(c => c.id === categoryId)?.name;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>Publicar servicio</Text>
              <Text style={styles.screenSubtitle}>Contanos que necesitas y avisamos a proveedores cerca tuyo.</Text>
            </View>
          </View>

          {/* Session expired banner */}
          {sessionExpired && (
            <View style={styles.sessionBanner}>
              <Ionicons name="alert-circle" size={22} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTitle}>Tu sesion expiro</Text>
                <Text style={styles.sessionSub}>Tu progreso esta guardado</Text>
              </View>
              <TouchableOpacity style={styles.sessionBtn} onPress={handleLoginRedirect}>
                <Text style={styles.sessionBtnText}>Iniciar sesion</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.storyCard}>
            <View style={styles.storyRow}>
              <Ionicons name="flash-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>Publicas una sola vez y recibis ofertas en la app.</Text>
            </View>
            <View style={styles.storyRow}>
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>Te notificamos cuando llegue una oferta nueva.</Text>
            </View>
            <View style={styles.storyRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>La direccion exacta no se muestra en el feed publico.</Text>
            </View>
            <View style={styles.storyRow}>
              <Ionicons name="git-merge-outline" size={18} color={Colors.primary} />
              <Text style={styles.storyText}>Despues vas a poder comparar ofertas, elegir y seguir el trabajo desde la app.</Text>
            </View>
          </View>

          {/* Categories grid */}
          <Text style={styles.label}>Categoria *</Text>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.catGrid}>
              {categories.map((cat: any) => {
                const isSelected = categoryId === cat.id;
                const iconName = CATEGORY_ICONS[cat.slug] || 'build';
                return (
                  <TouchableOpacity key={cat.id}
                    style={[styles.catCard, isSelected && styles.catCardSelected]}
                    onPress={() => setCategoryId(cat.id)} activeOpacity={0.7}>
                    <View style={[styles.catIconWrap, isSelected && styles.catIconWrapSelected]}>
                      <Ionicons name={iconName as any} size={22} color={isSelected ? Colors.white : Colors.primary} />
                    </View>
                    <Text style={[styles.catCardText, isSelected && styles.catCardTextSelected]} numberOfLines={2}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {selectedCatName && <Text style={styles.selectedHint}>Seleccionaste: {selectedCatName}</Text>}

          <Text style={styles.label}>Descripcion *</Text>
          <TextInput style={[styles.input, styles.multiline]} value={description}
            onChangeText={setDescription} placeholder="Ej: Necesito arreglar una canilla que pierde agua en la cocina. Idealmente hoy por la tarde."
            placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
          <Text style={styles.helperText}>
            Mientras mas claro seas con el problema, mejores ofertas vas a recibir. {descriptionLength > 0 ? `${descriptionLength} caracteres` : ''}
          </Text>

          <Text style={styles.label}>Direccion *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress}
            placeholder="Ej: Av. Corrientes 1234, CABA" placeholderTextColor={Colors.textMuted} />
          <Text style={styles.helperText}>Despues vas a poder completar los detalles con el proveedor elegido.</Text>

          <Text style={styles.label}>Ubicacion GPS *</Text>
          <TouchableOpacity style={[styles.locationBtn, coords && styles.locationBtnDone]} onPress={requestLocation} disabled={locationLoading}>
            {locationLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : (
              <>
                <Ionicons name={coords ? 'checkmark-circle' : 'locate'} size={20} color={coords ? Colors.success : Colors.primary} />
                <Text style={[styles.locationBtnText, coords && { color: Colors.success }]}>
                  {coords ? 'Ubicacion obtenida' : 'Usar mi ubicacion'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Metodo de pago</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ key: 'cash', label: 'Efectivo', icon: 'cash' }, { key: 'mercadopago', label: 'Mercado Pago', icon: 'card' }].map((m) => (
              <TouchableOpacity key={m.key} style={[styles.payChip, paymentMethod === m.key && styles.payChipSelected]}
                onPress={() => setPaymentMethod(m.key)} activeOpacity={0.7}>
                <Ionicons name={m.icon as any} size={18} color={paymentMethod === m.key ? Colors.white : Colors.text} />
                <Text style={[styles.payChipText, paymentMethod === m.key && styles.payChipTextSelected]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen antes de publicar</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Categoria</Text>
              <Text style={styles.summaryValue}>{selectedCatName || 'Sin elegir'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cobro</Text>
              <Text style={styles.summaryValue}>{selectedPaymentLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ubicacion</Text>
              <Text style={styles.summaryValue}>{coords ? 'Confirmada' : 'Pendiente'}</Text>
            </View>
            <Text style={styles.summaryHint}>Al publicar te llevamos directo al detalle para ver ofertas y seguir el estado del pedido.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleSubmit} disabled={!canSubmit} activeOpacity={0.85}>
            <Text style={styles.btnText}>{loading ? 'Publicando...' : 'Publicar y recibir ofertas'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerHint}>Si cerras esta pantalla, guardamos el borrador automaticamente cuando haga falta reingresar.</Text>
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
  screenSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  footerHint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 18 },
  storyCard: { backgroundColor: Colors.accent, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e9ddff', marginBottom: 8 },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  // Session expired
  sessionBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fffbeb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#fde68a', marginBottom: 8 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sessionSub: { fontSize: 12, color: Colors.textSecondary },
  sessionBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  sessionBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '31%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 14, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  catCardSelected: { backgroundColor: Colors.accent, borderColor: Colors.primary },
  catIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f0ff', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  catIconWrapSelected: { backgroundColor: Colors.primary },
  catCardText: { fontSize: 11, fontWeight: '600', color: Colors.text, textAlign: 'center', lineHeight: 14 },
  catCardTextSelected: { color: Colors.primary },
  selectedHint: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginTop: 6 },

  input: { backgroundColor: Colors.background, borderRadius: 12, height: 52, paddingHorizontal: 16, fontSize: 16, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  multiline: { height: 100, paddingTop: 14 },

  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f2f0ff', borderRadius: 14, paddingVertical: 18, borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed' },
  locationBtnDone: { borderStyle: 'solid', borderColor: Colors.success, backgroundColor: Colors.successLight },
  locationBtnText: { fontSize: 16, fontWeight: '600', color: Colors.primary },

  payChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.background, borderWidth: 1.5, borderColor: Colors.border },
  payChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payChipText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  payChipTextSelected: { color: Colors.white },
  summaryCard: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, marginTop: 18, borderWidth: 1, borderColor: '#f0f0f2', gap: 10 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  summaryHint: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginTop: 2 },

  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
});
