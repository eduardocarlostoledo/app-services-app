import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { ChatAPI } from '../../api.service';
import { useAuthStore } from '../../store';
import Svg, { Path } from 'react-native-svg';

export default function ChatScreen({ navigation, route }) {
  const { serviceId, otherUserId, otherUserName } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const loadMessages = async () => {
    try {
      const { data } = await ChatAPI.getMessages(serviceId, otherUserId);
      setMessages(data.messages || []);
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [serviceId, otherUserId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await ChatAPI.sendMessage(serviceId, text.trim());
      setText('');
      await loadMessages();
    } catch (e) { console.log(e); }
    setSending(false);
  };

  const isMe = (senderId) => senderId === user?.id;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={{ fontSize: 24, color: Colors.text }}>{'←'}</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={Colors.primary} strokeWidth={2}/></Svg>
        </View>
        <View>
          <Text style={styles.headerName}>{otherUserName || 'Usuario'}</Text>
          <Text style={styles.headerStatus}>En linea</Text>
        </View>
      </View>

      <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if (item.is_system) {
            return <View style={styles.systemBubble}><Text style={styles.systemText}>{item.text}</Text></View>;
          }
          return (
            <View style={[styles.bubble, isMe(item.sender_id) ? styles.myBubble : styles.otherBubble]}>
              {item.blocked ? (
                <Text style={styles.blockedText}>{item.block_reason || 'Contenido no permitido'}</Text>
              ) : (
                <Text style={[styles.msgText, isMe(item.sender_id) ? styles.myMsgText : null]}>{item.text}</Text>
              )}
            </View>
          );
        }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputBar}>
          <TextInput style={styles.input} value={text} onChangeText={setText}
            placeholder="Escribi un mensaje..." placeholderTextColor={Colors.textMuted}
            returnKeyType="send" onSubmitEditing={handleSend} />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend} disabled={sending || !text.trim()}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={Colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/></Svg>
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
  msgList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 8 },
  myBubble: { backgroundColor: Colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: Colors.background, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  myMsgText: { color: Colors.white },
  blockedText: { fontSize: 13, color: Colors.destructive, fontStyle: 'italic' },
  systemBubble: { backgroundColor: '#f2f0ff', borderRadius: 14, padding: 16, marginBottom: 12, marginHorizontal: 8, borderWidth: 1, borderColor: '#e4e4e7' },
  systemText: { fontSize: 14, color: Colors.text, lineHeight: 21 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  input: { flex: 1, height: 44, backgroundColor: Colors.background, borderRadius: 22, paddingHorizontal: 16, fontSize: 15, color: Colors.text },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
