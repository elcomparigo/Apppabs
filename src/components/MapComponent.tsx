import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Cliente, NormalizedCliente, DisplayRouteMode } from '../types';
import {
  mapearDatosCliente,
  esDiaDePagoHoy,
  obtenerColorPeriodicidad,
  obtenerColorSemaforoSA,
  enviarBalizaServidor,
} from '../utils/pabsLogic';

interface MapComponentProps {
  clientes: Cliente[];
  currentMode: DisplayRouteMode;
  userLocation: [number, number] | null;
  isGpsActive: boolean;
  onSelectCliente: (cliente: Cliente) => void;
  onLocationUpdated: (idEnrutar: string, lat: number, lon: number) => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  diccionarioRutaB?: Record<string, Cliente>;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  clientes,
  currentMode,
  userLocation,
  isGpsActive,
  onSelectCliente,
  onLocationUpdated,
  onShowToast,
  diccionarioRutaB = {},
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [29.0892, -110.9613], // Hermosillo, Sonora
      zoom: 13,
      zoomControl: false,
      preferCanvas: true,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
    });

    L.control
      .layers(
        {
          '🗺️ Calles': streetLayer,
          '🛰️ Satélite': satelliteLayer,
        },
        undefined,
        { position: 'topright' }
      )
      .addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle GPS user marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isGpsActive && userLocation) {
      const avatarHtml = `
        <div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; inset:0; border-radius:50%; background:rgba(99,102,241,0.4); animation: latido 1.2s infinite;"></div>
          <div style="width:14px; height:14px; background:#6366f1; border:3px solid #ffffff; border-radius:50%; box-shadow:0 0 10px #6366f1; z-index:2;"></div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'custom-marker',
        html: avatarHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        userMarkerRef.current = L.marker(userLocation, { icon, zIndexOffset: 25000 }).addTo(map);
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userLocation, isGpsActive]);

  // Render client markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    clientes.forEach(c => {
      const d: NormalizedCliente | null = mapearDatosCliente(c, diccionarioRutaB);
      if (!d || d.lat === undefined || d.lon === undefined) return;

      const estadoHoy = esDiaDePagoHoy(c);
      const isHoy = estadoHoy === 'HOY';
      const isVencido = typeof estadoHoy === 'object' && estadoHoy.estado === 'PENDIENTE';

      let animClass = '';
      let colorBordeAro = obtenerColorPeriodicidad(d.periodicidad);

      if (isHoy) {
        animClass = 'es-hoy';
        colorBordeAro = '#ef4444';
      } else if (isVencido) {
        animClass = 'es-vencido';
        colorBordeAro = '#f59e0b';
      }

      const saInfo = obtenerColorSemaforoSA(d.sa, d.periodicidad);
      const colorPinBase = saInfo.color;

      let iconHtml = '';
      if (d.ultimoMotivo === 'CUENTA NUEVA') {
        iconHtml = `<div class="${animClass}" style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;background:#fbbf24;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`;
      } else if (currentMode === 'A') {
        iconHtml = `<div class="${animClass}" style="background:${colorPinBase};width:16px;height:16px;border:3px solid ${colorBordeAro};border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
      } else if (currentMode === 'B') {
        iconHtml = `<div class="${animClass}" style="background:${colorPinBase};width:15px;height:15px;border:3px solid ${colorBordeAro};border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
      } else if (currentMode === 'C') {
        iconHtml = `<div class="${animClass}" style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid ${colorPinBase};filter:drop-shadow(0 2px 4px ${colorBordeAro});"></div>`;
      } else if (currentMode === 'D' || currentMode === 'EMISION') {
        iconHtml = `<div class="${animClass}" style="background:${colorPinBase};width:14px;height:14px;transform:rotate(45deg);border:3px solid ${colorBordeAro};border-radius:2px;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
      } else {
        iconHtml = `<div class="${animClass}" style="background:${colorPinBase};width:14px;height:14px;border:3px solid ${colorBordeAro};border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>`;
      }

      const icon = L.divIcon({
        className: 'custom-marker',
        html: iconHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([d.lat, d.lon], { icon, draggable: false });

      // Right-click / Context menu to enable dragging and re-coordinate
      marker.on('contextmenu', () => {
        marker.dragging?.enable();
        onShowToast(`📍 Modo mover activo para: ${d.nombre}. Arrástralo a su nueva posición.`, 'warning');
      });

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        marker.dragging?.disable();

        // Anti-CORS location edit beacon to server
        const editLocUrl = `https://webrigo.devlara.us.ci/editloc.php?id_afil=${d.idAfiliado}&lat=${pos.lat}&lon=${pos.lng}&save=true`;
        enviarBalizaServidor(editLocUrl);

        onLocationUpdated(d.idEnrutar, pos.lat, pos.lng);
        onShowToast(`✅ Ubicación de ${d.nombre} actualizada`, 'success');
      });

      marker.on('click', () => {
        if (!marker.dragging?.enabled()) {
          onSelectCliente(c);
        }
      });

      marker.addTo(markersLayer);
    });
  }, [clientes, currentMode, diccionarioRutaB, onSelectCliente, onLocationUpdated, onShowToast]);

  return <div ref={mapContainerRef} className="w-full h-full bg-slate-950 z-0" />;
};
