// ══════════════════════════════════════════════════════════════════════════════
// SCREEN: HomeScreen — Pantalla principal del cliente
// Muestra categorías de servicios disponibles + búsqueda de operarios
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, TextInput, Dimensions, ActivityIndicator,
  StatusBar, SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

import { useAuthStore, useServiceStore, useNotificationStore } from '../../store';
import { CategoryAPI } from '../../services/api.service';
import ServiceCard, { CategoryIcon } from '../../components/ServiceCard/ServiceCard';

const { width: W } = Dimensions.get('window');

// ── Colores de la app ─────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#2563EB',
  secondary: '#1D4ED8',
  success:   '#059669',
  warning:   '#F59E0B',
  bg:        '#F8FAFF',
  card:      '#FFFFFF',
  text:      '#111827',
  textSub:   '#6B7280',
  border:    '#E5E7EB',
};

// ══════════════════════════════════════════════════════════════════════════════
export default function HomeScreen({ navigation }) {
  const { user, profile }              = useAuthStore();
  const { availableProviders, isLoadingProviders, matchProviders } = useServiceStore();
  const { unreadCount }                = useNotificationStore();

  const [categories,       setCategories]       = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [userLocation,     setUserLocation]      = useState(null);
  const [locationError,    setLocationError]     = useState(null);
  const [isRefreshing,     setIsRefreshing]      = useState(false);

  // ── Obtener ubicación del usuario ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Permitir ubicación mejora la búsqueda de operarios cercanos.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch (e) {
        setLocationError('No se pudo obtener tu ubicación.');
      }
    })();
  }, []);

  // ── Cargar categorías ─────────────────────────────────────────────────────
  useEffect(() => {
    CategoryAPI.getAll().then(({ data }) => setCategories(data.categories || [])).catch(() => {});
  }, []);

  // ── Buscar operarios al seleccionar categoría ─────────────────────────────
  const handleSelectCategory = useCallback(async (category) => {
    setSelectedCategory(category);
    if (!userLocation) return;
    await matchProviders(userLocation.lat, userLocation.lng, category.slug);
  }, [userLocation, matchProviders]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (selectedCategory && userLocation) {
      await matchProviders(userLocation.lat, userLocation.lng, selectedCategory.slug);
    }
    setIsRefreshing(false);
  }, [selectedCategory, userLocation]);

  const handleHireProvider = useCallback((provider) => {
    navigation.navigate('ServiceRequest', { provider, category: selectedCategory });
  }, [navigation, selectedCategory]);

  const handleViewProfile = useCallback((providerId) => {
    navigation.navigate('ProviderProfile', { providerId });
  }, [navigation]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '¡Buenos días';
    if (h < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.first_name || 'Vecino'} 👋
            </Text>
            {userLocation ? (
              <Text style={styles.locationText}>📍 Ubicación detectada</Text>
            ) : (
              <Text style={[styles.locationText, { color: COLORS.warning }]}>
                📍 {locationError || 'Obteniendo ubicación...'}
              </Text>
            )}
          </View>

          {/* Badge de notificaciones */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notifBtn}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={COLORS.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ── Servicio activo pendiente ────────────────────────────────── */}
        {/* Mostrar si el cliente ya tiene un servicio activo */}

        {/* ── Categorías ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.sectionTitle}>¿Qué servicio necesitás?</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInRight.delay(index * 50)}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory?.id === item.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => handleSelectCategory(item)}
                  activeOpacity={0.8}
                >
                  <CategoryIcon slug={item.slug} size={28} color={selectedCategory?.id === item.id ? '#FFFFFF' : COLORS.primary} />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory?.id === item.id && styles.categoryChipTextSelected,
                  ]} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </Animated.View>

        {/* ── Resultados del match ─────────────────────────────────────── */}
        {selectedCategory && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                {isLoadingProviders ? 'Buscando...' : `${availableProviders.length} operarios disponibles`}
              </Text>
              {availableProviders.length > 0 && (
                <Text style={styles.resultsSubtitle}>Ordenados por calificación</Text>
              )}
            </View>

            {isLoadingProviders ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Buscando operarios cerca tuyo...</Text>
              </View>
            ) : availableProviders.length === 0 ? (
              <EmptyProviders categoryName={selectedCategory.name} onChangeRadius={() => {
                if (userLocation) matchProviders(userLocation.lat, userLocation.lng, selectedCategory.slug, 50);
              }} />
            ) : (
              availableProviders.map((provider, idx) => (
                <Animated.View key={provider.provider_id} entering={FadeInDown.delay(idx * 80)}>
                  <ServiceCard
                    provider={provider}
                    onHire={handleHireProvider}
                    onViewProfile={handleViewProfile}
                    testID={`provider-card-${idx}`}
                  />
                </Animated.View>
              ))
            )}
          </Animated.View>
        )}

        {/* ── Estado vacío inicial ─────────────────────────────────────── */}
        {!selectedCategory && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔧</Text>
            <Text style={styles.emptyTitle}>Elegí un rubro para empezar</Text>
            <Text style={styles.emptySubtitle}>
              Te mostramos los mejores operarios disponibles en tu zona
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subcomponente: Sin operarios disponibles ───────────────────────────────────
const EmptyProviders = ({ categoryName, onChangeRadius }) => (
  <View style={styles.emptyProviders}>
    <Text style={styles.emptyEmoji}>😔</Text>
    <Text style={styles.emptyTitle}>Sin {categoryName} disponibles</Text>
    <Text style={styles.emptySubtitle}>No hay operarios en tu zona en este momento.</Text>
    <TouchableOpacity style={styles.expandBtn} onPress={onChangeRadius}>
      <Text style={styles.expandBtnText}>Ampliar radio de búsqueda</Text>
    </TouchableOpacity>
  </View>
);

// ══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { flex: 1 },
  content: { paddingBottom: 32 },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerLeft:{ flex: 1 },
  greeting:  { fontSize: 14, color: COLORS.textSub },
  userName:  { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginTop: 2 },
  locationText: { fontSize: 12, color: COLORS.textSub, marginTop: 4 },
  notifBtn:  { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  notifBadge:{ position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12, paddingHorizontal: 16 },
  categoriesRow:{ paddingHorizontal: 12, paddingBottom: 4, gap: 8 },

  categoryChip:    { width: 80, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 12, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, borderWidth: 2, borderColor: 'transparent' },
  categoryChipSelected:  { backgroundColor: COLORS.primary, borderColor: COLORS.secondary },
  categoryChipText:      { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  categoryChipTextSelected: { color: '#FFFFFF' },

  resultsSection: { paddingTop: 20 },
  resultsHeader:  { paddingHorizontal: 16, marginBottom: 12 },
  resultsSubtitle:{ fontSize: 13, color: COLORS.textSub, marginTop: 2 },

  loadingContainer: { alignItems: 'center', padding: 48 },
  loadingText:      { color: COLORS.textSub, marginTop: 12, fontSize: 14 },

  emptyState:    { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyProviders:{ alignItems: 'center', padding: 32, marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 16 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSub, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  expandBtn:     { marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  expandBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
