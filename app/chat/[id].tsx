import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Colors } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { on, off, emit } from '../../socket.service';

const STATUS_LABELS: Record<string, string> = {
  provider_selected: 'Proveedor elegido',
  accepted: 'Asignado',
  paid: 'Pago realizado',
  in_progress: 'Trabajo en curso',
  work_finished: 'Esperando confirmacion',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const QUICK_REPLIES_BY_ROLE: Record<string, string[]> = {
  client: [
    'Ya realice el pago.',
    'Te comparti la direccion exacta.',
    'Estoy disponible ahora.',
    'Avisame cuando estes llegando.',
  ],
  provider: [
    'Estoy en camino.',
    'Ya llegue al domicilio.',
    'Empiezo el trabajo ahora.',
    'Te envio foto de avance.',
  ],
};

function getPersonName(person: any, fallback: string) {
  if (!person) return fallback;
  if (person.first_name || person.last_name) return `${person.first_name || ''} ${person.last_name || ''}`.trim();
  if (person.profile?.first_name || person.profile?.last_name) return `${person.profile?.first_name || ''} ${person.profile?.last_name || ''}`.trim();
  return fallback;
}

export default function Chat() {
  const { id, other } = useLocalSearchParams<{ id: string; other?: string }>();
  const { api, user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [service, setService] = useState<any>(null);
  const [otherName, setOtherName] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const quickReplies = useMemo(() => QUICK_REPLIES_BY_ROLE[user?.role || 'client'] || QUICK_REPLIES_BY_ROLE.client, [user?.role]);

  const loadService = useCallback(async () => {
    try {
      const res = await api(`/services/${id}`);
      const current = res.service || res;
      setService(current);

      const fallbackName = user?.role === 'client'
        ? getPersonName(current.provider, 'Proveedor')
        : getPersonName(current.client, 'Cliente');
      setOtherName((currentName) => currentName || fallbackName);
    } catch (e) {
      console.log(e);
    }
  }, [api, id, user?.role]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api(`/chat/${id}/${other || ''}`);
      setMessages(res.messages || res || []);
      if (res.other_user_name) setOtherName(res.other_user_name);
    } catch (e) {
      console.log(e);
    }
  }, [id, other, api]);

  useEffect(() => {
    loadMessages();
    loadService();

    emit('service:track', { serviceId: id });

    const handleNewMessage = (data: any) => {
      if (data.service_id !== id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message?.id)) return prev;
        return [...prev, data.message];
      });
    };

    const refreshContext = (data: any) => {
      if (String(data?.serviceId || data?.service_id) !== String(id)) return;
      loadService();
      loadMessages();
    };

    on('chat:message', handleNewMessage);
    on('service:address_shared', refreshContext);
    on('service:in_progress', refreshContext);
    on('service:work_finished', refreshContext);
    on('service:completed', refreshContext);

    return () => {
      off('chat:message');
      off('service:address_shared');
      off('service:in_progress');
      off('service:work_finished');
      off('service:completed');
      emit('service:untrack', { serviceId: id });
    };
  }, [id, other, loadMessages, loadService]);

  const appendMessage = (message: any) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  };

  const handleSend = async (overrideText?: string) => {
    const nextText = typeof overrideText === 'string' ? overrideText : text;
    if (!nextText.trim()) return;
    setSending(true);
    try {
      const res = await api('/chat/messages', { method: 'POST', data: { service_id: id, text: nextText.trim() } });
      setText('');
      if (res.message) appendMessage(res.message);
    } catch (e) {
      console.log(e);
    }
    setSending(false);
  };

  const handlePickImage = async () => {
    let ImagePicker: any;
    try {
      ImagePicker = require('expo-image-picker');
    } catch {
      Alert.alert('Adjuntos', 'Instala expo-image-picker para enviar fotos desde el chat.\nnpx expo install expo-image-picker');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para enviar imagenes de avance.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append('service_id', String(id));
    formData.append('text', text.trim() || 'Adjunto de avance');
    formData.append('attachment', {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `avance-${Date.now()}.jpg`,
    } as any);

    setSending(true);
    try {
      const res = await api('/chat/messages', {
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setText('');
      if (res.message) appendMessage(res.message);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la imagen.');
    }
    setSending(false);
  };

  const isMe = (senderId: string) => senderId === user?.id;
  const showAddressAction = user?.role === 'client' && ['paid', 'in_progress', 'work_finished'].includes(service?.status);
  const headerStatus = STATUS_LABELS[service?.status] || 'Conversacion activa';
  const summaryTitle = service?.title || service?.description || 'Servicio en coordinacion';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Ionicons name="person" size={18} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{otherName || 'Usuario'}</Text>
          <Text style={styles.headerStatus}>{headerStatus}</Text>
        </View>
      </View>

      {service && (
        <View style={styles.contextCard}>
          <Text style={styles.contextEyebrow}>Servicio</Text>
          <Text style={styles.contextTitle} numberOfLines={2}>{summaryTitle}</Text>
          <Text style={styles.contextSub} numberOfLines={2}>
            {service.address || 'Todavia falta compartir la direccion exacta.'}
          </Text>
          {!!service.notes && <Text style={styles.contextNotes} numberOfLines={3}>{service.notes}</Text>}

          <View style={styles.contextActions}>
            <TouchableOpacity style={styles.contextBtn} onPress={() => router.push(`/progress/${id}` as any)}>
              <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
              <Text style={styles.contextBtnText}>Seguimiento</Text>
            </TouchableOpacity>

            {showAddressAction && (
              <TouchableOpacity style={styles.contextBtn} onPress={() => router.push(`/address/${id}` as any)}>
                <Ionicons name="location-outline" size={16} color={Colors.primary} />
                <Text style={styles.contextBtnText}>{service.address ? 'Editar direccion' : 'Compartir direccion'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.quickRepliesWrap}>
        <FlatList
          horizontal
          data={quickReplies}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.quickReplyChip} onPress={() => handleSend(item)} disabled={sending}>
              <Text style={styles.quickReplyText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.is_system) {
            return (
              <View style={styles.systemBubble}>
                <Text style={styles.systemText}>{item.text}</Text>
              </View>
            );
          }
          return (
            <View style={[styles.bubble, isMe(item.sender_id) ? styles.myBubble : styles.otherBubble]}>
              {!!item.attachment_url && (
                <Image source={{ uri: item.attachment_url }} style={styles.attachmentImage} resizeMode="cover" />
              )}
              {item.blocked ? (
                <Text style={styles.blockedText}>{item.block_reason || 'Contenido no permitido'}</Text>
              ) : (
                <Text style={[styles.msgText, isMe(item.sender_id) && styles.myMsgText]}>{item.text}</Text>
              )}
            </View>
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={sending}>
            <Ionicons name="image-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escribi un mensaje..."
            placeholderTextColor={Colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={() => handleSend()} disabled={sending || !text.trim()}>
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  headerStatus: { fontSize: 12, color: Colors.success },
  contextCard: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  contextEyebrow: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' },
  contextTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 6 },
  contextSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  contextNotes: { fontSize: 13, color: Colors.text, marginTop: 8, lineHeight: 18 },
  contextActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  contextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#dbe4f0' },
  contextBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  quickRepliesWrap: { marginTop: 10 },
  quickRepliesList: { paddingHorizontal: 16, gap: 8 },
  quickReplyChip: { backgroundColor: Colors.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e9ddff' },
  quickReplyText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  msgList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 8 },
  myBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: Colors.background, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  attachmentImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 8, backgroundColor: '#e4e4e7' },
  msgText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  myMsgText: { color: Colors.white },
  blockedText: { fontSize: 13, color: Colors.destructive, fontStyle: 'italic' },
  systemBubble: { backgroundColor: '#f2f0ff', borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 8, borderWidth: 1, borderColor: '#e4e4e7' },
  systemText: { fontSize: 14, color: Colors.text, lineHeight: 21 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, height: 44, backgroundColor: Colors.background, borderRadius: 22, paddingHorizontal: 16, fontSize: 15, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
