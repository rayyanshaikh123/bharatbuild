"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, ExternalLink } from "lucide-react";
import Link from "next/link";

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

interface ProjectLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ON_HOLD";
  location_text?: string;
  geofence_radius?: number; // in meters
}

interface ProjectsMapProps {
  projects: ProjectLocation[];
  height?: string;
  showRadius?: boolean;
  onProjectClick?: (projectId: string) => void;
}

// Status color mapping
const statusColors: Record<string, string> = {
  ACTIVE: "#22c55e",
  PLANNED: "#f97316",
  COMPLETED: "#3b82f6",
  ON_HOLD: "#64748b",
};

export function ProjectsMap({ 
  projects, 
  height = "300px", 
  showRadius = true,
  onProjectClick 
}: ProjectsMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [leafletIcon, setLeafletIcon] = useState<L.Icon | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Import Leaflet CSS
    import("leaflet/dist/leaflet.css");
    
    // Create custom icon
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
  const validProjects = projects.filter(p => p.latitude && p.longitude);
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // India center
  
  let center: [number, number] = defaultCenter;
  let zoom = 5;

  if (validProjects.length > 0) {
    const avgLat = validProjects.reduce((sum, p) => sum + p.latitude, 0) / validProjects.length;
    const avgLng = validProjects.reduce((sum, p) => sum + p.longitude, 0) / validProjects.length;
    center = [avgLat, avgLng];
    zoom = validProjects.length === 1 ? 14 : 6;
  }

  if (validProjects.length === 0) {
    return (
      <div 
        className="glass-card rounded-2xl flex flex-col items-center justify-center" 
        style={{ height }}
      >
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-2" />
        <p className="text-muted-foreground text-sm">No project locations available</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validProjects.map((project) => (
          <div key={project.id}>
            {/* Geofence radius circle */}
            {showRadius && project.geofence_radius && project.geofence_radius > 0 && (
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
                    {onProjectClick && (
                      <button
                        onClick={() => onProjectClick(project.id)}
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
