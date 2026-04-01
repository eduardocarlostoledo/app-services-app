// ══════════════════════════════════════════════════════════════════════════════
// SOCKET SERVICE — React Native client
// Maneja: conexión, reconexión automática, eventos por namespace
// Patrón: Singleton — una sola instancia durante el ciclo de vida de la app
// ══════════════════════════════════════════════════════════════════════════════

import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';

// Estado interno
let socket         = null;
let currentNs      = null;
let reconnectTimer = null;
let isConnecting   = false;
const eventListeners = new Map();

// ── Opciones base de conexión ─────────────────────────────────────────────────
const BASE_OPTIONS = {
  transports:         ['websocket'],  // Solo WebSocket en mobile (no polling)
  reconnection:       true,
  reconnectionDelay:  1500,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 10,
  timeout:            20000,
  path:               '/socket.io',
  forceNew:           false,
};

// ── Namespace según rol del usuario ──────────────────────────────────────────
const getNsForRole = (role) => {
  if (role === 'provider')                return '/provider';
  if (['admin','superadmin'].includes(role)) return '/admin';
  return '/client';
};

// ══════════════════════════════════════════════════════════════════════════════
// CONNECT — Inicializa y conecta al namespace correcto
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Conecta al servidor de WebSockets
 * @param {string} token    - JWT access token
 * @param {string} role     - Rol del usuario (client | provider | admin)
 * @param {Function} onConnect   - Callback al conectar
 * @param {Function} onDisconnect - Callback al desconectar
 */
export const connectSocket = async (token, role, onConnect, onDisconnect) => {
  if (isConnecting || (socket && socket.connected)) return socket;

  isConnecting = true;
  const namespace = getNsForRole(role);

  // Desconectar socket previo si existía
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(`${SOCKET_URL}${namespace}`, {
    ...BASE_OPTIONS,
    auth:  { token },
    query: { token }, // Fallback para algunos clientes
  });

  currentNs = namespace;

  // ── Event handlers del sistema ────────────────────────────────────────────
  socket.on('connect', () => {
    isConnecting = false;
    console.log(`[Socket] Conectado a ${namespace} (id: ${socket.id})`);
    if (onConnect) onConnect(socket.id);
    // Re-registrar listeners guardados tras reconexión
    eventListeners.forEach((handler, event) => socket.on(event, handler));
  });

  socket.on('disconnect', (reason) => {
    isConnecting = false;
    console.log(`[Socket] Desconectado: ${reason}`);
    if (onDisconnect) onDisconnect(reason);
  });

  socket.on('connect_error', (err) => {
    isConnecting = false;
    console.error(`[Socket] Error de conexión: ${err.message}`);
  });

  socket.on('error', (err) => {
    console.error('[Socket] Error:', err);
  });

  return socket;
};

// ══════════════════════════════════════════════════════════════════════════════
// DISCONNECT
// ══════════════════════════════════════════════════════════════════════════════

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentNs = null;
    isConnecting = false;
    eventListeners.clear();
    console.log('[Socket] Desconectado manualmente');
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// EMIT — Envía eventos con manejo de errores
// ══════════════════════════════════════════════════════════════════════════════

export const emit = (event, data, callback) => {
  if (!socket || !socket.connected) {
    console.warn(`[Socket] Intentando emitir '${event}' sin conexión activa`);
    return false;
  }
  if (callback) {
    socket.emit(event, data, callback);
  } else {
    socket.emit(event, data);
  }
  return true;
};

// ══════════════════════════════════════════════════════════════════════════════
// LISTENERS — Registro y limpieza de eventos
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Registra un listener persistente (sobrevive reconexiones)
 */
export const on = (event, handler) => {
  eventListeners.set(event, handler);
  if (socket) socket.on(event, handler);
};

/**
 * Elimina un listener
 */
export const off = (event) => {
  eventListeners.delete(event);
  if (socket) socket.off(event);
};

// ══════════════════════════════════════════════════════════════════════════════
// API DE ALTO NIVEL — Métodos específicos de negocio
// ══════════════════════════════════════════════════════════════════════════════

/**
 * [CLIENTE] Empieza a trackear la ubicación del operario en un servicio
 */
export const trackService = (serviceId) => {
  emit('service:track', { serviceId });
};

export const untrackService = (serviceId) => {
  emit('service:untrack', { serviceId });
};

/**
 * [CLIENTE] Cancela un servicio en tiempo real
 */
export const cancelServiceRealtime = (serviceId, reason) => {
  emit('service:cancel', { serviceId, reason });
};

/**
 * [OPERARIO] Acepta un servicio con ETA estimado
 */
export const acceptServiceRealtime = (serviceId, etaMinutes) => {
  emit('service:accept', { serviceId, etaMinutes });
};

/**
 * [OPERARIO] Rechaza un servicio
 */
export const rejectServiceRealtime = (serviceId, reason) => {
  emit('service:reject', { serviceId, reason });
};

/**
 * [OPERARIO] Marca el servicio como in_progress (llegó al domicilio)
 */
export const markInProgress = (serviceId) => {
  emit('service:in_progress', { serviceId });
};

/**
 * [OPERARIO] Envía actualización de ubicación GPS
 * Llamar cada 5 segundos desde el hook useLocationTracking
 */
export const sendLocationUpdate = (serviceId, lat, lng, heading = null, speed = null) => {
  emit('location:update', { serviceId, lat, lng, heading, speed });
};

/**
 * [OPERARIO] Toggle de disponibilidad en tiempo real
 */
export const toggleAvailability = (isAvailable) => {
  emit('provider:toggle_availability', { isAvailable });
};

/**
 * Subscripción a actualización de ubicación del operario (para clientes)
 * @param {Function} onUpdate - ({ providerId, lat, lng, heading, speed, timestamp }) => void
 */
export const subscribeToProviderLocation = (onUpdate) => {
  on('location:update', onUpdate);
  return () => off('location:update'); // Retorna función de cleanup
};

/**
 * Subscripción a cambios de estado del servicio
 * @param {Function} onStatusChange - ({ serviceId, status, ... }) => void
 */
export const subscribeToServiceStatus = (onStatusChange) => {
  const events = [
    'service:accepted', 'service:rejected', 'service:in_progress',
    'service:completed', 'service:cancelled',
  ];
  events.forEach((event) => on(event, (data) => onStatusChange({ event, ...data })));
  return () => events.forEach((event) => off(event));
};

/**
 * Subscripción a nuevas solicitudes (para operarios)
 * @param {Function} onNewRequest - (serviceData) => void
 */
export const subscribeToNewRequests = (onNewRequest) => {
  on('service:new_request', onNewRequest);
  return () => off('service:new_request');
};

/**
 * Subscripción a notificaciones in-app
 */
export const subscribeToNotifications = (onNotification) => {
  on('notification:new', onNotification);
  return () => off('notification:new');
};

// ── Estado de la conexión ─────────────────────────────────────────────────────
export const isConnected  = () => socket?.connected ?? false;
export const getSocketId  = () => socket?.id ?? null;
export const getNamespace = () => currentNs;

export default {
  connectSocket, disconnectSocket,
  emit, on, off,
  trackService, untrackService,
  cancelServiceRealtime,
  acceptServiceRealtime, rejectServiceRealtime,
  markInProgress, sendLocationUpdate,
  toggleAvailability,
  subscribeToProviderLocation, subscribeToServiceStatus,
  subscribeToNewRequests, subscribeToNotifications,
  isConnected, getSocketId, getNamespace,
};
