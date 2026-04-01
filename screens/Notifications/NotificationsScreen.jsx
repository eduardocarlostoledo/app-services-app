import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { useNotificationStore } from '../../store';

export default function NotificationsScreen({ navigation }) {
  const { notifications, loadNotifications, markRead } = useNotificationStore();

  useEffect(() => { loadNotifications(); }, []);

  const handlePress = (notif) => {
    if (!notif.read_at) markRead(notif.id);
    if (notif.payload?.service_id) {
      navigation.navigate('ServiceDetail', { serviceId: notif.payload.service_id });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Notificaciones</Text>
      <FlatList data={notifications} keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.item, !item.read_at && styles.itemUnread]} onPress={() => handlePress(item)}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemBody}>{item.body}</Text>
            <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString('es-AR')}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay notificaciones</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, padding: 20, paddingTop: 48 },
  list: { paddingHorizontal: 20 },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemUnread: { backgroundColor: '#f2f0ff' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  itemBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  itemDate: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40 },
});
