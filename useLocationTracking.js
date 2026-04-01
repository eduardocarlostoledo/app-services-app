// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useLocationTracking
// Obtiene la posición GPS del operario y la transmite por Socket.io cada 5s
// Solo activo para operarios con un servicio activo aceptado
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import SocketService from '../services/socket.service';
import { ProviderAPI } from '../services/api.service';

const TRACKING_INTERVAL_MS = 5000; // 5 segundos
const MIN_DISTANCE_METERS  = 10;   // Solo emitir si se movió más de 10m

export const useLocationTracking = ({ serviceId, isActive = false }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [error, setError] = useState(null);

  const intervalRef    = useRef(null);
  const lastEmitRef    = useRef(null);
  const watcherRef     = useRef(null);

  // ── Calcular distancia entre dos coordenadas (Haversine simplificado) ─────
  const distanceBetween = (lat1, lng1, lat2, lng2) => {
    const R  = 6371000; // Radio tierra en metros
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Solicitar permisos de ubicación ──────────────────────────────────────
  const requestPermissions = useCallback(async () => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      setPermissionStatus('denied');
      setError('Se requieren permisos de ubicación para transmitir tu posición.');
      return false;
    }

    // Permiso en background para tracking cuando la app está minimizada
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    setPermissionStatus(bg === 'granted' ? 'background' : 'foreground');
    return true;
  }, []);

  // ── Iniciar tracking ──────────────────────────────────────────────────────
  const startTracking = useCallback(async () => {
    if (!serviceId) return;
    const granted = await requestPermissions();
    if (!granted) return;

    // Observar posición con alta precisión
    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy:               Location.Accuracy.BestForNavigation,
        timeInterval:           TRACKING_INTERVAL_MS,
        distanceInterval:       MIN_DISTANCE_METERS,
        mayShowUserSettingsDialog: true,
      },
      (location) => {
        const { latitude, longitude, heading, speed } = location.coords;
        setCurrentLocation({ lat: latitude, lng: longitude, heading, speed });

        // Solo emitir por socket si nos movimos lo suficiente
        const last = lastEmitRef.current;
        const movedEnough = !last ||
          distanceBetween(last.lat, last.lng, latitude, longitude) >= MIN_DISTANCE_METERS;

        if (movedEnough) {
          SocketService.sendLocationUpdate(serviceId, latitude, longitude, heading, speed);
          lastEmitRef.current = { lat: latitude, lng: longitude };
        }
      }
    );
  }, [serviceId]);

  // ── Detener tracking ──────────────────────────────────────────────────────
  const stopTracking = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastEmitRef.current = null;
  }, []);

  // ── Ciclo de vida ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isActive && serviceId) {
      startTracking();
    } else {
      stopTracking();
    }
    return stopTracking;
  }, [isActive, serviceId]);

  return { currentLocation, permissionStatus, error, startTracking, stopTracking };
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK: useProviderLocation
// Para clientes: recibe la ubicación del operario via Socket.io
// ══════════════════════════════════════════════════════════════════════════════

export const useProviderLocation = (serviceId) => {
  const [providerLocation, setProviderLocation] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const lastUpdateRef = useRef(null);

  useEffect(() => {
    if (!serviceId) return;

    // Suscribirse a las actualizaciones GPS del operario
    SocketService.trackService(serviceId);

    const unsub = SocketService.subscribeToProviderLocation((data) => {
      if (data.serviceId !== serviceId) return;
      setProviderLocation({
        lat:       data.lat,
        lng:       data.lng,
        heading:   data.heading,
        speed:     data.speed,
        timestamp: data.timestamp,
      });
      setIsOnline(true);
      lastUpdateRef.current = Date.now();
    });

    // Detectar si el operario dejó de transmitir (timeout 30s)
    const timeoutCheck = setInterval(() => {
      if (lastUpdateRef.current && Date.now() - lastUpdateRef.current > 30000) {
        setIsOnline(false);
      }
    }, 10000);

    return () => {
      unsub();
      clearInterval(timeoutCheck);
      SocketService.untrackService(serviceId);
    };
  }, [serviceId]);

  return { providerLocation, isOnline };
};
