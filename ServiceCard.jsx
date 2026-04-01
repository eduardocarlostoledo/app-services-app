// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: ServiceCard — Tarjeta de Operario Disponible
// Stack: React Native 0.73+ (bare workflow compatible con Expo)
// Muestra: Avatar, nombre, rubro, rating, precio, distancia y botón contratar
// ══════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Dimensions, Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Polygon, G, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ══════════════════════════════════════════════════════════════════════════════
// SVGs POR RUBRO (13 categorías del marketplace)
// ══════════════════════════════════════════════════════════════════════════════

const CategoryIcon = memo(({ slug, size = 40, color = '#2563EB' }) => {
  const icons = {
    electricista: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={`${color}20`}/>
      </Svg>
    ),
    plomero: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill={`${color}20`}/>
        <Path d="M8 12h8M12 8v8" stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2}/>
        <Path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke={color} strokeWidth={2} strokeLinecap="round"/>
      </Svg>
    ),
    herrero: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14.5 2.5c0 1.5-1.5 3-1.5 3s-1.5-1.5-1.5-3a1.5 1.5 0 013 0z" fill={color}/>
        <Path d="M13 5.5l-6 12L4 22l4.5-3.5 6-12" stroke={color} strokeWidth={2} strokeLinecap="round"/>
        <Path d="M16 3l5 5-1.5 1.5-5-5L16 3z" fill={`${color}60`} stroke={color} strokeWidth={1.5}/>
      </Svg>
    ),
    cerrajero: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="11" width="14" height="11" rx="2" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth={2} strokeLinecap="round"/>
        <Circle cx="12" cy="16" r="1.5" fill={color}/>
        <Path d="M12 17.5v2" stroke={color} strokeWidth={2} strokeLinecap="round"/>
      </Svg>
    ),
    pintor: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M19 3H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Path d="M12 11v10" stroke={color} strokeWidth={2} strokeLinecap="round"/>
        <Path d="M9 21a3 3 0 006 0" stroke={color} strokeWidth={2}/>
        <Circle cx="7.5" cy="7" r="1.5" fill={color}/>
        <Circle cx="12" cy="7" r="1.5" fill={color}/>
        <Circle cx="16.5" cy="7" r="1.5" fill={color}/>
      </Svg>
    ),
    albanil: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="14" width="8" height="8" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
        <Rect x="11" y="14" width="11" height="8" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
        <Rect x="2" y="5" width="11" height="8" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
        <Rect x="14" y="5" width="8" height="8" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
      </Svg>
    ),
    refrigeracion: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="4" y="2" width="16" height="20" rx="2" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Line x1="4" y1="10" x2="20" y2="10" stroke={color} strokeWidth={2}/>
        <Circle cx="12" cy="6" r="1.5" fill={color}/>
        <Circle cx="12" cy="15" r="1.5" fill={color}/>
        <Path d="M12 13v4" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
      </Svg>
    ),
    lavarropas: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="2" width="20" height="20" rx="3" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Circle cx="12" cy="13" r="5" stroke={color} strokeWidth={2} fill="none"/>
        <Path d="M9 13a3 3 0 006 0" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
        <Circle cx="7" cy="6" r="1" fill={color}/>
        <Circle cx="10" cy="6" r="1" fill={color}/>
      </Svg>
    ),
    gasista: (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2C8 8 6 11 6 14a6 6 0 0012 0c0-3-2-6-6-12z" fill={`${color}30`} stroke={color} strokeWidth={2}/>
        <Path d="M12 10c-1.5 2-2 3.5-2 4.5a2 2 0 004 0c0-1-.5-2.5-2-4.5z" fill={color}/>
      </Svg>
    ),
    'paneles-solares': (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="8" width="9" height="13" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
        <Rect x="13" y="8" width="9" height="13" rx="1" fill={`${color}20`} stroke={color} strokeWidth={1.5}/>
        <Path d="M5.5 8V3l2-1.5L11 3v5M13 8V3l2.5-1.5L19 3v5" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
        <Line x1="2" y1="14" x2="11" y2="14" stroke={color} strokeWidth={1}/>
        <Line x1="13" y1="14" x2="22" y2="14" stroke={color} strokeWidth={1}/>
      </Svg>
    ),
    'camaras-seguridad': (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M23 7l-7 5 7 5V7z" fill={`${color}30`} stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        <Rect x="1" y="5" width="15" height="14" rx="2" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Circle cx="9" cy="12" r="3" stroke={color} strokeWidth={1.5}/>
      </Svg>
    ),
    'reparacion-computadora': (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="3" width="20" height="14" rx="2" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Path d="M8 21h8M12 17v4" stroke={color} strokeWidth={2} strokeLinecap="round"/>
        <Path d="M10 10l2 2 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    ),
    'reparacion-celulares': (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="5" y="2" width="14" height="20" rx="3" fill={`${color}20`} stroke={color} strokeWidth={2}/>
        <Circle cx="12" cy="17.5" r="1.5" fill={color}/>
        <Path d="M9 6h6" stroke={color} strokeWidth={2} strokeLinecap="round"/>
        <Path d="M10 11l2 2 4-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    ),
  };

  return icons[slug] || (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={`${color}20`} stroke={color} strokeWidth={2}/>
      <Path d="M12 8v4l3 3" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTE: StarsRating
// ══════════════════════════════════════════════════════════════════════════════

const StarRating = memo(({ score, count }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.starsRow}>
      {stars.map((star) => (
        <Svg key={star} width={14} height={14} viewBox="0 0 24 24" style={{ marginRight: 2 }}>
          <Path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={star <= Math.round(score) ? '#F59E0B' : '#D1D5DB'}
            stroke={star <= Math.round(score) ? '#F59E0B' : '#D1D5DB'}
            strokeWidth={1}
          />
        </Svg>
      ))}
      <Text style={styles.ratingScore}>{score?.toFixed(1)}</Text>
      <Text style={styles.ratingCount}>({count} trabajos)</Text>
    </View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: ServiceCard
// ══════════════════════════════════════════════════════════════════════════════

const ServiceCard = memo(({
  provider,
  onHire,
  onViewProfile,
  testID,
}) => {
  const {
    provider_id,
    user_id,
    first_name,
    last_name,
    avatar_url,
    category_name,
    category_slug,
    rating         = 0,
    rating_count   = 0,
    total_services = 0,
    hourly_rate,
    distance_km,
    is_promoted    = false,
    is_available   = true,
  } = provider;

  // Animación de press
  const scale    = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn  = useCallback(() => { scale.value = withSpring(0.97); }, []);
  const handlePressOut = useCallback(() => { scale.value = withSpring(1); }, []);

  const handleHire = useCallback(() => {
    if (onHire) onHire(provider);
  }, [onHire, provider]);

  const handleProfile = useCallback(() => {
    if (onViewProfile) onViewProfile(provider_id);
  }, [onViewProfile, provider_id]);

  const formattedPrice = hourly_rate
    ? `$${hourly_rate.toLocaleString('es-AR')} /hr`
    : 'A convenir';

  const formattedDistance = distance_km
    ? distance_km < 1
      ? `${Math.round(distance_km * 1000)} m`
      : `${distance_km.toFixed(1)} km`
    : '';

  return (
    <Animated.View style={[styles.card, animated]} testID={testID}>
      {/* Badge de operario promovido */}
      {is_promoted && (
        <View style={styles.promotedBadge}>
          <Text style={styles.promotedText}>⭐ Destacado</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleProfile}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardContent}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${first_name} ${last_name}`}
      >
        {/* Sección izquierda: ícono del rubro */}
        <View style={styles.iconContainer}>
          <CategoryIcon slug={category_slug} size={44} color="#2563EB" />
        </View>

        {/* Sección central: datos del operario */}
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            {/* Avatar */}
            {avatar_url ? (
              <Image
                source={{ uri: avatar_url }}
                style={styles.avatar}
                defaultSource={require('../assets/avatar-placeholder.png')}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {`${first_name?.[0] || ''}${last_name?.[0] || ''}`}
                </Text>
              </View>
            )}

            <View style={styles.nameBlock}>
              <Text style={styles.providerName} numberOfLines={1}>
                {first_name} {last_name}
              </Text>
              <Text style={styles.categoryName}>{category_name}</Text>
            </View>

            {/* Indicador disponibilidad */}
            <View style={[styles.statusDot, { backgroundColor: is_available ? '#10B981' : '#EF4444' }]} />
          </View>

          {/* Estrellas y calificación */}
          <StarRating score={rating} count={total_services} />

          {/* Precio y distancia */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>💰</Text>
              <Text style={styles.metaValue}>{formattedPrice}</Text>
            </View>
            {formattedDistance ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>📍</Text>
                <Text style={styles.metaValue}>{formattedDistance}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {/* Botón contratar */}
      <TouchableOpacity
        style={[styles.hireButton, !is_available && styles.hireButtonDisabled]}
        onPress={handleHire}
        disabled={!is_available}
        accessibilityRole="button"
        accessibilityLabel={`Contratar a ${first_name}`}
        accessibilityState={{ disabled: !is_available }}
      >
        <Text style={styles.hireButtonText}>
          {is_available ? 'Contratar' : 'No disponible'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    width:        CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation:    4, // Android
    overflow:     'hidden',
  },
  promotedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  promotedText: {
    fontSize:   12,
    fontWeight: '600',
    color:      '#92400E',
  },
  cardContent: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    padding:        16,
  },
  iconContainer: {
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: '#EFF6FF',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     12,
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   8,
  },
  avatar: {
    width:        36,
    height:       36,
    borderRadius: 18,
    marginRight:  8,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: '#DBEAFE',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     8,
  },
  avatarInitials: {
    color:      '#2563EB',
    fontWeight: '700',
    fontSize:   14,
  },
  nameBlock: {
    flex: 1,
  },
  providerName: {
    fontSize:   15,
    fontWeight: '700',
    color:      '#111827',
    letterSpacing: -0.3,
  },
  categoryName: {
    fontSize:  12,
    color:     '#6B7280',
    marginTop: 1,
  },
  statusDot: {
    width:        10,
    height:       10,
    borderRadius: 5,
    marginLeft:   8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  8,
  },
  ratingScore: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#F59E0B',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize:   12,
    color:      '#9CA3AF',
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap:           16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize:   13,
    fontWeight: '600',
    color:      '#374151',
  },
  hireButton: {
    margin:          12,
    marginTop:       0,
    backgroundColor: '#2563EB',
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
  },
  hireButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  hireButtonText: {
    color:      '#FFFFFF',
    fontWeight: '700',
    fontSize:   15,
    letterSpacing: 0.3,
  },
});

ServiceCard.displayName = 'ServiceCard';

export { CategoryIcon, StarRating };
export default ServiceCard;
