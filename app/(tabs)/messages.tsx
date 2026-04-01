import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const LILAC = '#A855F7';
const LILAC_BG = '#F3E8FF';

export default function Messages() {
  const { api, user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isProvider = user?.role === 'provider';

  const loadConversations = useCallback(async () => {
    try {
      const res = await api('/chat/conversations', { params: { role: user?.role || 'client' } });
      setConversations(res.conversations || res || []);
    } catch (e) { console.log('[Messages] Error:', e); }
    setLoading(false);
  }, [api, user?.role]);

  useFocusEffect(useCallback(() => { setLoading(true); loadConversations(); }, [loadConversations]));

  const onRefresh = async () => { setRefreshing(true); await loadConversations(); setRefreshing(false); };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'ayer';
    return `${diffDays}d`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensajes</Text>
        <View style={styles.modeBadge}>
          <MaterialCommunityIcons name={isProvider ? 'hammer-wrench' : 'briefcase-outline'} size={14} color={LILAC} />
          <Text style={styles.modeBadgeText}>{isProvider ? 'Operario' : 'Cliente'}</Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.muted} />
          <Text style={styles.emptyTitle}>No tenes conversaciones</Text>
          <Text style={styles.emptyText}>
            {isProvider ? 'Las conversaciones apareceran cuando envies ofertas a servicios' : 'Las conversaciones apareceran cuando recibas ofertas en tus servicios'}
          </Text>
        </View>
      ) : (
        <FlatList data={conversations}
          keyExtractor={(item) => `${item.service_id || item.id}-${item.other_user_id || ''}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity testID={`convo-${item.service_id || item.id}`} style={styles.card}
              onPress={() => router.push(`/chat/${item.service_id || item.id}?other=${item.other_user_id}`)} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{(item.other_user_name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.convoInfo}>
                <View style={styles.convoHeader}>
                  <Text style={styles.convoName} numberOfLines={1}>{item.other_user_name}</Text>
                  {item.last_message_time && <Text style={styles.convoTime}>{formatTime(item.last_message_time)}</Text>}
                </View>
                <Text style={styles.convoService} numberOfLines={1}>{item.service_title || item.changa_title}</Text>
                <Text style={styles.convoMsg} numberOfLines={1}>{item.last_message || 'Sin mensajes'}</Text>
              </View>
              {item.unread_count > 0 && (
                <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread_count}</Text></View>
              )}
            </TouchableOpacity>
          )} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: LILAC_BG },
  modeBadgeText: { fontSize: 12, fontWeight: '600', color: LILAC },
  list: { paddingHorizontal: 20 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  convoInfo: { flex: 1 },
  convoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  convoTime: { fontSize: 12, color: Colors.textMuted, marginLeft: 8 },
  convoService: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  convoMsg: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  unreadBadge: { backgroundColor: Colors.primary, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 6 },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
});
