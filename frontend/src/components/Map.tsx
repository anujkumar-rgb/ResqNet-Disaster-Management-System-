import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet icons
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  center?: [number, number];
  markers?: Array<{
    id: string;
    position: [number, number];
    title: string;
    type?: string;
    color?: 'red' | 'blue' | 'green' | 'orange';
  }>;
  hazards?: Array<{
    description: string;
    location: { latitude: number; longitude: number };
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  routePath?: [number, number][];
  onLocationSelect?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
}

const LocationPicker = ({ onSelect }: { onSelect: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const ChangeView = ({ center, routePath, markers }: { center: [number, number], routePath?: [number, number][], markers?: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (routePath && routePath.length > 0) {
      const bounds = L.latLngBounds(routePath);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.position));
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15 });
    } else {
      map.setView(center);
    }
  }, [center, routePath, markers, map]);
  return null;
};

const getIcon = (color: string = 'blue') => {
  const html = `
    <div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${color};
    "></div>
  `;
  return L.divIcon({
    className: 'custom-div-icon',
    html: html,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const colorMap = {
  red: '#DC2626',
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F59E0B'
};

export default function Map({ center = [19.0760, 72.8777], markers = [], hazards = [], routePath, onLocationSelect, className = "h-full w-full", zoom = 12 }: MapProps) {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      className={className}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeView center={center} routePath={routePath} markers={markers} />
      {onLocationSelect && <LocationPicker onSelect={onLocationSelect} />}
      {routePath && routePath.length > 0 && (
        <>
          <Polyline 
            positions={routePath} 
            pathOptions={{ 
              color: '#059669', 
              weight: 8, 
              opacity: 0.3
            }} 
          />
          <Polyline 
            positions={routePath} 
            pathOptions={{ 
              color: '#10B981', 
              weight: 4, 
              opacity: 1,
              dashArray: '1, 8',
              lineCap: 'round'
            }} 
          />
        </>
      )}
      {markers.map((marker) => (
        <Marker 
          key={marker.id} 
          position={marker.position}
          icon={getIcon(colorMap[marker.color || 'blue'])}
        >
          <Popup>
            <div className="text-xs font-mono">
              <p className="font-bold uppercase tracking-tight">{marker.title}</p>
              {marker.type && <p className="text-gray-500 mt-1">{marker.type}</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {hazards.map((hazard, index) => (
        <Marker
          key={`hazard-${index}`}
          position={[hazard.location.latitude, hazard.location.longitude]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="tactical-hazard ${hazard.severity === 'critical' ? 'pulse-danger' : ''}" 
                        style="background-color: ${hazard.severity === 'critical' ? '#EF4444' : hazard.severity === 'high' ? '#F97316' : '#EAB308'}; 
                               padding: 4px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; box-shadow: 0 0 15px rgba(0,0,0,0.4);">
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                   </div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })}
        >
          <Popup>
            <div className="p-1 min-w-[120px]">
              <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-100 pb-1">
                <div className={`w-2 h-2 rounded-full ${
                  hazard.severity === 'critical' ? 'bg-red-500' : 
                  hazard.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                }`} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                  {hazard.severity} Hazard
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-600 font-medium">{hazard.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
