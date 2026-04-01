import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Colors } from '../src/constants/colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type Step = 'identity' | 'documents' | 'payment';

export default function VerifyIdentity() {
  const router = useRouter();
  const { user, api, refreshUser } = useAuth();
  const isProvider = user?.role === 'provider';

  const [step, setStep] = useState<Step>('identity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Identity
  const [docType, setDocType] = useState<'dni' | 'cuit' | 'cuil'>('dni');
  const [docNumber, setDocNumber] = useState('');

  // Step 2: Documents (track upload status)
  const [uploads, setUploads] = useState<Record<string, boolean>>({
    dni_front: false,
    dni_back: false,
    selfie: false,
  });

  // Step 3: Payment
  const [cvu, setCvu] = useState('');

  // ── Step 1: Save DNI ──────────────────────────────────────────────────────
  const handleSaveIdentity = async () => {
    const clean = docNumber.replace(/\D/g, '');
    if (docType === 'dni' && (clean.length < 7 || clean.length > 8)) {
      setError('El DNI debe tener 7 u 8 digitos'); return;
    }
    if ((docType === 'cuit' || docType === 'cuil') && clean.length !== 11) {
      setError('El CUIT/CUIL debe tener 11 digitos'); return;
    }
    setLoading(true); setError('');
    try {
      await api('/users/profile', {
        method: 'PATCH',
        data: { document_type: docType, document_number: clean },
      });
      setStep('documents');
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    setLoading(false);
  };

  // ── Step 2: Upload document ───────────────────────────────────────────────
  const handleUploadDoc = async (docTypeKey: string) => {
    setError('');
    try {
      // Use expo-image-picker if available, otherwise show instructions
      let ImagePicker: any;
      try {
        ImagePicker = require('expo-image-picker');
      } catch {
        Alert.alert('Camara', 'Instala expo-image-picker para subir fotos.\nnpx expo install expo-image-picker');
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Se necesita permiso de camara'); return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.7,
        allowsEditing: docTypeKey === 'selfie',
        aspect: docTypeKey === 'selfie' ? [1, 1] : [3, 2],
      });

      if (result.canceled) return;

      setLoading(true);
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || `${docTypeKey}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('document', { uri, name: filename, type: mimeType } as any);
      formData.append('doc_type', docTypeKey);

      await api('/providers/documents', {
        method: 'POST',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploads(prev => ({ ...prev, [docTypeKey]: true }));
    } catch (e: any) { setError(e.message || 'Error al subir documento'); }
    setLoading(false);
  };

  const allDocsUploaded = uploads.dni_front && uploads.dni_back && uploads.selfie;

  // ── Step 3: Save CVU / Payment ────────────────────────────────────────────
  const handleSavePayment = async () => {
    const cleanCvu = cvu.replace(/\D/g, '');
    if (cleanCvu.length !== 22) {
      setError('El CVU/CBU debe tener 22 digitos'); return;
    }
    setLoading(true); setError('');
    try {
      await api('/providers/payment-setup', {
        method: 'PATCH',
        data: { cvu: cleanCvu },
      });
      await refreshUser();
      Alert.alert('Listo', 'Tu verificacion fue enviada. Te notificaremos cuando sea aprobada.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    setLoading(false);
  };

  const handleSkipPayment = async () => {
    await refreshUser();
    router.back();
  };

  // ── Step indicator ────────────────────────────────────────────────────────
  const steps: { key: Step; label: string }[] = [
    { key: 'identity', label: 'Identidad' },
    { key: 'documents', label: 'Documentos' },
    { key: 'payment', label: 'Cobros' },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Verificar identidad</Text>
          <Text style={styles.subtitle}>Completa estos pasos para obtener el tilde verificado</Text>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            {steps.map((s, i) => (
              <View key={s.key} style={styles.stepItem}>
                <View style={[styles.stepDot, i <= stepIndex && styles.stepDotActive]}>
                  {i < stepIndex ? (
                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                  ) : (
                    <Text style={[styles.stepDotText, i <= stepIndex && styles.stepDotTextActive]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, i <= stepIndex && styles.stepLabelActive]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── STEP: IDENTITY ─────────────────────────────────────────── */}
          {step === 'identity' && (
            <View style={styles.stepContent}>
              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
                <Text style={styles.infoText}>
                  Tu documento se usa para verificar tu identidad. No se comparte con otros usuarios.
                </Text>
              </View>

              <Text style={styles.label}>TIPO DE DOCUMENTO</Text>
              <View style={styles.docTypeRow}>
                {(['dni', 'cuit', 'cuil'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.docTypeBtn, docType === t && styles.docTypeBtnActive]}
                    onPress={() => setDocType(t)}>
                    <Text style={[styles.docTypeBtnText, docType === t && styles.docTypeBtnTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>NUMERO DE DOCUMENTO</Text>
              <TextInput style={styles.input} value={docNumber} onChangeText={setDocNumber}
                placeholder={docType === 'dni' ? 'Ej: 34567890' : 'Ej: 20345678901'}
                placeholderTextColor={Colors.textMuted} keyboardType="numeric"
                maxLength={docType === 'dni' ? 8 : 11} />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={[styles.btn, (!docNumber.trim() || loading) && styles.btnDisabled]}
                onPress={handleSaveIdentity} disabled={!docNumber.trim() || loading}>
                <Text style={styles.btnText}>{loading ? 'Guardando...' : 'Continuar'}</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: DOCUMENTS ────────────────────────────────────────── */}
          {step === 'documents' && (
            <View style={styles.stepContent}>
              <View style={styles.infoCard}>
                <Ionicons name="camera" size={24} color={Colors.primary} />
                <Text style={styles.infoText}>
                  Saca una foto clara de tu DNI (frente y dorso) y una selfie mirando a camara.
                </Text>
              </View>

              {[
                { key: 'dni_front', icon: 'card-outline' as const, label: 'DNI Frente', desc: 'Foto clara del frente de tu DNI' },
                { key: 'dni_back', icon: 'card-outline' as const, label: 'DNI Dorso', desc: 'Foto clara del dorso de tu DNI' },
                { key: 'selfie', icon: 'person-circle-outline' as const, label: 'Selfie', desc: 'Tu cara mirando a la camara' },
              ].map(doc => (
                <TouchableOpacity key={doc.key} style={styles.uploadCard}
                  onPress={() => !uploads[doc.key] && handleUploadDoc(doc.key)} disabled={loading}>
                  <Ionicons name={doc.icon} size={28} color={uploads[doc.key] ? Colors.success : Colors.textMuted} />
                  <View style={styles.uploadCardText}>
                    <Text style={styles.uploadCardTitle}>{doc.label}</Text>
                    <Text style={styles.uploadCardDesc}>
                      {uploads[doc.key] ? 'Subido correctamente' : doc.desc}
                    </Text>
                  </View>
                  {uploads[doc.key] ? (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  ) : loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="camera" size={24} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={[styles.btn, !allDocsUploaded && styles.btnDisabled]}
                onPress={() => { setError(''); setStep(isProvider ? 'payment' : 'payment'); }}
                disabled={!allDocsUploaded}>
                <Text style={styles.btnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('identity')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Volver al paso anterior</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: PAYMENT ──────────────────────────────────────────── */}
          {step === 'payment' && (
            <View style={styles.stepContent}>
              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="bank-transfer" size={24} color={Colors.primary} />
                <Text style={styles.infoText}>
                  {isProvider
                    ? 'Ingresa tu CVU/CBU para recibir los pagos de tus servicios.'
                    : 'Opcionalmente podes cargar tu CVU/CBU para recibir reembolsos mas rapido.'}
                </Text>
              </View>

              <Text style={styles.label}>CVU / CBU (22 DIGITOS)</Text>
              <TextInput style={styles.input} value={cvu} onChangeText={setCvu}
                placeholder="0000003100000000000001"
                placeholderTextColor={Colors.textMuted} keyboardType="numeric" maxLength={22} />
              <Text style={styles.hint}>Lo encontras en tu app de banco o billetera virtual</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSavePayment} disabled={loading || cvu.replace(/\D/g, '').length !== 22}>
                <Text style={styles.btnText}>{loading ? 'Guardando...' : 'Finalizar verificacion'}</Text>
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              </TouchableOpacity>

              {!isProvider && (
                <TouchableOpacity onPress={handleSkipPayment} style={styles.backLink}>
                  <Text style={styles.backLinkText}>Omitir por ahora</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setStep('documents')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Volver al paso anterior</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },

  // Step indicator
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepDotText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  stepDotTextActive: { color: Colors.white },
  stepLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },

  // Common
  stepContent: {},
  infoCard: { flexDirection: 'row', backgroundColor: '#f2f0ff', borderRadius: 14, padding: 16, gap: 12, alignItems: 'center', marginBottom: 24 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  input: { height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 16, fontSize: 17, color: Colors.text, backgroundColor: Colors.card, letterSpacing: 1 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  error: { color: Colors.destructive, fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: Colors.primary, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },

  // Doc type selector
  docTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  docTypeBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.card },
  docTypeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.accent },
  docTypeBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  docTypeBtnTextActive: { color: Colors.primary },

  // Upload cards
  uploadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, padding: 16, gap: 14, marginTop: 12, borderWidth: 1, borderColor: Colors.border },
  uploadCardText: { flex: 1 },
  uploadCardTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  uploadCardDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
