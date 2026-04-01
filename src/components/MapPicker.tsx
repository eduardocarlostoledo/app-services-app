import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface MapPickerProps {
  coords: { lat: number; lng: number };
  onCoordsChange: (coords: { lat: number; lng: number }) => void;
  onRefresh: () => void;
}

export default function MapPicker({ coords, onCoordsChange, onRefresh }: MapPickerProps) {
  return (
    <View style={styles.mapSection}>
      <MapView
        style={styles.map}
        initialRegion={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onRegionChangeComplete={(region) => {
          onCoordsChange({ lat: region.latitude, lng: region.longitude });
        }}
      >
        <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} draggable
          onDragEnd={(e) => {
            onCoordsChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
          }} />
      </MapView>
      <View style={styles.mapNote}>
        <Ionicons name="information-circle-outline" size={16} color="#a1a1aa" />
        <Text style={styles.mapNoteText}>Podes mover el pin para ajustar. La ubicacion exacta no se mostrara en el feed.</Text>
      </View>
      <TouchableOpacity testID="change-location-btn" style={styles.changeLoc} onPress={onRefresh}>
        <Ionicons name="refresh" size={16} color={Colors.primary} />
        <Text style={styles.changeLocText}>Actualizar ubicacion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mapSection: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e4e4e7' },
  map: { width: '100%', height: 200 },
  mapNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f9fafb' },
  mapNoteText: { fontSize: 12, color: '#a1a1aa', flex: 1 },
  changeLoc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#f9fafb', borderTopWidth: 1, borderTopColor: '#f0f0f2' },
  changeLocText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
});
