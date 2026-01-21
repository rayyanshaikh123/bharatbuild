"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Import Leaflet Draw for side effects (registers L.Control.Draw)
import "leaflet-draw";

// Dynamic import for Leaflet (SSR fix)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const FeatureGroup = dynamic(
  () => import("react-leaflet").then((mod) => mod.FeatureGroup),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);



interface ProjectLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  location_text?: string;
  geofence_radius?: number; // in meters
  geofence?: any; // GeoJSON
}

interface ProjectsMapProps {
  projects: ProjectLocation[];
  height?: string;
  showRadius?: boolean;
  onProjectClick?: (projectId: string) => void;
  enableDraw?: boolean;
  onGeofenceChange?: (geojson: any, center?: { lat: number, lng: number }, radius?: number) => void;
}

// Status color mapping
const statusColors: Record<string, string> = {
  ACTIVE: "#22c55e",
  PLANNED: "#f97316",
  COMPLETED: "#3b82f6",
  ON_HOLD: "#64748b",
};

// Internal component to handle Drawing Logic
function DrawControl({ onGeofenceChange, existingGeofence }: { onGeofenceChange?: (json: any, center?: { lat: number, lng: number }, radius?: number) => void, existingGeofence?: any }) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Initialize FeatureGroup to store drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    featureGroupRef.current = drawnItems;

    // If there's an existing geofence, add it to the layer
    if (existingGeofence) {
      const layer = L.geoJSON(existingGeofence);
      layer.eachLayer((l: any) => {
        drawnItems.addLayer(l);
      });
      // Fit bounds to existing shape
      try {
        if (drawnItems.getLayers().length > 0) {
           map.fitBounds(drawnItems.getBounds());
        }
      } catch (e) { console.error("Could not fit bounds", e)}
    }

    // Initialize Draw Control
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        rectangle: { shapeOptions: {} },
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false,
      },
    });

    map.addControl(drawControl);

    const handleLayerUpdate = (layer: any) => {
      drawnItems.clearLayers(); 
      drawnItems.addLayer(layer);
      
      const geojson = drawnItems.toGeoJSON() as any;
      const shapeData = geojson.features && geojson.features.length > 0 
        ? geojson.features[0] 
        : geojson;

      if (onGeofenceChange) {
        // Calculate center and radius
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        // Approximate radius as half the diagonal distance or distance from center to a corner
        const northEast = bounds.getNorthEast();
        const radius = center.distanceTo(northEast);

        onGeofenceChange(shapeData, center, radius);
      }
    };

    // Event Handlers
    const onCreated = (e: any) => {
      handleLayerUpdate(e.layer);
    };

    const onEdited = (e: any) => {
      // For edited layers, we might have multiple, but we only support one main shape for now.
      // e.layers is a LayerGroup
      e.layers.eachLayer((layer: any) => {
         handleLayerUpdate(layer);
      });
    };

    const onDeleted = (e: any) => {
       if (onGeofenceChange) onGeofenceChange(null);
    };

    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.EDITED, onEdited);
    map.on(L.Draw.Event.DELETED, onDeleted);

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.EDITED, onEdited);
      map.off(L.Draw.Event.DELETED, onDeleted);
    };
  }, [map, onGeofenceChange]); 

  return null;
}

// Helper to update map view when props change
function Recenter({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export function ProjectsMap({ 
  projects, 
  height = "300px", 
  showRadius = true,
  onProjectClick,
  enableDraw = false,
  onGeofenceChange
}: ProjectsMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [leafletIcon, setLeafletIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Import map icons fix
    import("leaflet").then((L) => {
      const icon = new L.Icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setLeafletIcon(icon);
    });
  }, []);

  if (!isClient || !leafletIcon) {
    return (
      <div 
        className="glass-card rounded-2xl flex items-center justify-center" 
        style={{ height }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  // Calculate center from projects or default to India center
  const validProjects = projects
    .map((p) => ({
      ...p,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }))
    .filter((p) => !isNaN(p.latitude) && !isNaN(p.longitude));

  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  
  let center: [number, number] = defaultCenter;
  let zoom = 5;
  let bounds: L.LatLngBoundsExpression | undefined = undefined;

  if (validProjects.length > 0) {
    if (validProjects.length === 1) {
       // Single project
       const p = validProjects[0];
       center = [p.latitude, p.longitude];
       zoom = 15; // Closer zoom for single project
       
       // If it has a geofence, try to fit bounds
       if (p.geofence) {
          try {
             const layer = L.geoJSON(p.geofence);
             const layerBounds = layer.getBounds();
             if (layerBounds.isValid()) {
                bounds = layerBounds;
             }
          } catch(e) {}
       }
    } else {
       // Multiple projects - calculate bounds
       const latLngs = validProjects.map(p => [p.latitude, p.longitude] as [number, number]);
       if (latLngs.length > 0) {
         bounds = L.latLngBounds(latLngs);
       }
       center = [validProjects.reduce((sum, p) => sum + p.latitude, 0) / validProjects.length, validProjects.reduce((sum, p) => sum + p.longitude, 0) / validProjects.length];
       zoom = 6; 
    }
  }

  // For drawing mode, we usually focus on a single project (the one being created/edited)
  // If editing, use the existing geofence
  const editingProject = projects.length === 1 ? projects[0] : null;

  return (
    <div className="rounded-2xl overflow-hidden glass-card border border-border/50" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={enableDraw} // Enable scroll zoom when drawing for better control
      >
        <Recenter center={center} zoom={zoom} bounds={bounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Helper component for Drawing */}
        {enableDraw && (
          <DrawControl 
             onGeofenceChange={onGeofenceChange} 
             existingGeofence={editingProject?.geofence}
          />
        )}

        {/* Render existing projects if NOT drawing or if simply viewing */}
        {!enableDraw && validProjects.map((project) => (
          <div key={project.id || 'new'}>
            
            {/* 1. Render Polygon if Geofence exists */}
            {project.geofence && (
               <GeoJSON 
                 key={`${project.id}-geo`}
                 data={project.geofence}
                 style={{
                   color: statusColors[project.status] || statusColors.PLANNED,
                   fillOpacity: 0.2
                 }}
               />
            )}

             {/* For display of existing geofences using GeoJSON is tricky in React-Leaflet loop without component.
                 We will rely on separate handling or just Circles for now if geofence is complex. 
                 But wait, we want to SEE the shapes. 
                 Let's assume for 'View All' we stick to markers/circles for performance.
                 The 'DrawControl' handles the EDIT/CREATE view nicely.
             */}


            {/* 2. Fallback to Radius Circle if no geofence (or in addition) */}
            {showRadius && !project.geofence && project.geofence_radius && project.geofence_radius > 0 && (
              <Circle
                center={[project.latitude, project.longitude]}
                radius={project.geofence_radius}
                pathOptions={{
                  color: statusColors[project.status] || statusColors.PLANNED,
                  fillColor: statusColors[project.status] || statusColors.PLANNED,
                  fillOpacity: 0.3,
                  weight: 2,
                  opacity: 0.8,
                }}
              />
            )}

            {/* Project marker */}
            <Marker
              position={[project.latitude, project.longitude]}
              icon={leafletIcon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h4 className="font-bold text-sm mb-1">{project.name}</h4>
                  {project.location_text && (
                    <p className="text-xs text-gray-600 mb-2">{project.location_text}</p>
                  )}
                  {project.geofence_radius && (
                    <p className="text-xs text-gray-500 mb-2">
                      Geofence: {project.geofence_radius}m radius
                    </p>
                  )}
                   <div className="flex items-center justify-between">
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: statusColors[project.status] || statusColors.PLANNED }}
                    >
                      {project.status}
                    </span>
                    {onProjectClick && project.id && (
                      <button
                        onClick={() => onProjectClick(project.id!)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}

// Preview version with title for dashboard
interface ProjectsMapPreviewProps {
  projects: ProjectLocation[];
  title?: string;
  viewAllHref?: string;
}

export function ProjectsMapPreview({ 
  projects, 
  title = "Project Locations", 
  viewAllHref = "/owner/projects" 
}: ProjectsMapPreviewProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground">{title}</h3>
        <Link 
          href={viewAllHref} 
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all <ExternalLink size={14} />
        </Link>
      </div>
      <ProjectsMap projects={projects} height="280px" showRadius={true} />
    </div>
  );
}

// Detailed map for project detail pages
interface ProjectDetailMapProps {
  project: ProjectLocation;
  height?: string;
}

export function ProjectDetailMap({ project, height = "400px" }: ProjectDetailMapProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-foreground">Project Location</h3>
          {project.location_text && (
            <p className="text-sm text-muted-foreground">{project.location_text}</p>
          )}
        </div>
        {project.geofence_radius && (
          <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg">
            Geofence: {project.geofence_radius}m
          </span>
        )}
      </div>
      <ProjectsMap 
        projects={[project]} 
        height={height} 
        showRadius={true}
      />
    </div>
  );
}
