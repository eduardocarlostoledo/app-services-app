// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useSocketEvents
// Conecta el store global con los eventos de Socket.io
// Debe montarse una sola vez en el componente raíz (AppNavigator)
// ══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import SocketService from '../services/socket.service';
import { useServiceStore, useNotificationStore, useAuthStore } from '../store';

export const useSocketEvents = () => {
  const appState      = useRef(AppState.currentState);
  const updateStatus  = useServiceStore((s) => s.updateServiceStatus);
  const updateLocation= useServiceStore((s) => s.updateProviderLocation);
  const addNotif      = useNotificationStore((s) => s.addNotification);
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken || !user) return;

    // Reconexión al volver desde background
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (!SocketService.isConnected()) {
          SocketService.connectSocket(accessToken, user.role);
        }
      }
      appState.current = nextState;
    });

    // ── Eventos de estado del servicio ────────────────────────────────────
    const unsubStatus = SocketService.subscribeToServiceStatus(({ event, serviceId, ...rest }) => {
      const statusMap = {
        'service:accepted':    'accepted',
        'service:rejected':    'rejected',
        'service:in_progress': 'in_progress',
        'service:completed':   'completed',
        'service:cancelled':   'cancelled',
      };
      const newStatus = statusMap[event];
      if (newStatus && serviceId) {
        updateStatus(serviceId, newStatus, rest);
        addNotif({
          id:         Date.now().toString(),
          type:       'service_' + newStatus,
          title:      getStatusTitle(newStatus),
          body:       getStatusBody(newStatus, rest),
          payload:    { service_id: serviceId },
          created_at: new Date().toISOString(),
        });
      }
    });

    // ── Eventos GPS del operario ──────────────────────────────────────────
    const unsubLocation = SocketService.subscribeToProviderLocation(updateLocation);

    // ── Nuevas solicitudes (solo operarios) ───────────────────────────────
    const unsubRequests = user.role === 'provider'
      ? SocketService.subscribeToNewRequests((data) => {
          addNotif({
            id:         Date.now().toString(),
            type:       'service_request',
            title:      '📋 Nueva solicitud',
            body:       `${data.categoryName} en ${data.address}`,
            payload:    { service_id: data.serviceId },
            created_at: new Date().toISOString(),
          });
        })
      : () => {};

    // ── Notificaciones genéricas ──────────────────────────────────────────
    const unsubNotifs = SocketService.subscribeToNotifications(addNotif);

    return () => {
      sub.remove();
      unsubStatus();
      unsubLocation();
      unsubRequests();
      unsubNotifs();
    };
  }, [accessToken, user?.role]);
};

// Helpers para mensajes de notificación en español
const getStatusTitle = (status) => ({
  accepted:    '✅ Operario en camino',
  rejected:    '❌ Servicio rechazado',
  in_progress: '🔧 Trabajo en progreso',
  completed:   '🎉 Servicio completado',
  cancelled:   '🚫 Servicio cancelado',
}[status] || 'Estado actualizado');

const getStatusBody = (status, data) => ({
  accepted:    `Tiempo estimado: ${data.etaMinutes ? data.etaMinutes + ' min' : 'pronto'}`,
  rejected:    'El operario no está disponible. Buscá otro.',
  in_progress: 'El operario llegó y comenzó el trabajo.',
  completed:   'Recordá calificar al operario.',
  cancelled:   'El servicio fue cancelado.',
}[status] || '');
