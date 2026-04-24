export type IncidentType = 'fire' | 'accident' | 'medical' | 'flood' | 'earthquake' | 'other';
export type ReportStatus = 'pending' | 'assigned' | 'resolved';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TeamType = 'ambulance' | 'fire_brigade' | 'police' | 'relief_truck';
export type TeamStatus = 'idle' | 'en_route' | 'on_scene' | 'rescue_in_progress' | 'completed' | 'refueling';
export type UserRole = 'citizen' | 'admin' | 'rescue_team';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteHazard {
  description: string;
  location: { latitude: number; longitude: number };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RouteOptimization {
  suggestedRoute: string;
  estimatedTime: string;
  weatherConditions: string;
  hazards: RouteHazard[];
  alternatives: string[];
  pathCoordinates?: [number, number][];
}

export interface Report {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  media_urls: string[];
  status: ReportStatus;
  priority: Priority;
  reporter_id: string;
  reporter_name?: string;
  ai_optimization?: RouteOptimization;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  type: TeamType;
  status: TeamStatus;
  latitude: number;
  longitude: number;
  assigned_report_id?: string;
  leader_id: string;
  updated_at: string;
}

export interface ResourceItem {
  id: string;
  name: string;
  type: 'hospital_beds' | 'oxygen_cylinders' | 'blood_units' | 'rescue_vehicles';
  available_count: number;
  total_count: number;
  latitude?: number;
  longitude?: number;
  updated_at: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'hospital' | 'police_station' | 'petrol_pump';
  location: { latitude: number; longitude: number };
  distance?: number;
}

export interface Broadcast {
  id: string;
  report_id: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'admin' | 'rescue_unit';
  target_facility_types: Array<'hospital' | 'police_station' | 'petrol_pump'>;
  message: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  display_name: string;
  phone_number?: string;
  date_of_birth?: string;
  created_at?: string;
}
