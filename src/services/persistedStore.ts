import type { Vehicle, VehicleRequest, Notification, RemittanceRequest } from '@/types';

const STORAGE_KEYS = {
  vehicles: 'remittance_app_vehicles',
  vehicleRequests: 'remittance_app_vehicle_requests',
  remittanceRequests: 'remittance_app_remittance_requests',
  notifications: 'remittance_app_notifications',
};

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveJson(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist to localStorage:', e);
  }
}

export function loadVehicles(initial: Vehicle[]): Vehicle[] {
  const stored = loadJson<Vehicle[]>(STORAGE_KEYS.vehicles);
  return stored && Array.isArray(stored) ? stored : initial;
}

export function loadVehicleRequests(initial: VehicleRequest[]): VehicleRequest[] {
  const stored = loadJson<VehicleRequest[]>(STORAGE_KEYS.vehicleRequests);
  return stored && Array.isArray(stored) ? stored : initial;
}

export function loadNotifications(initial: Notification[]): Notification[] {
  const stored = loadJson<Notification[]>(STORAGE_KEYS.notifications);
  return stored && Array.isArray(stored) ? stored : initial;
}

export function loadRemittanceRequests(initial: RemittanceRequest[]): RemittanceRequest[] {
  const stored = loadJson<RemittanceRequest[]>(STORAGE_KEYS.remittanceRequests);
  return stored && Array.isArray(stored) ? stored : initial;
}

export function saveVehicles(data: Vehicle[]) {
  saveJson(STORAGE_KEYS.vehicles, data);
}

export function saveVehicleRequests(data: VehicleRequest[]) {
  saveJson(STORAGE_KEYS.vehicleRequests, data);
}

export function saveNotifications(data: Notification[]) {
  saveJson(STORAGE_KEYS.notifications, data);
}

export function saveRemittanceRequests(data: RemittanceRequest[]) {
  saveJson(STORAGE_KEYS.remittanceRequests, data);
}

const ADMIN_CREDENTIALS_KEY = 'remittance_app_admin_credentials';

export interface AdminCredentials {
  username: string;
  passwordHash: string;
}

export function loadAdminCredentials(): AdminCredentials | null {
  return loadJson<AdminCredentials>(ADMIN_CREDENTIALS_KEY);
}

export function saveAdminCredentials(data: AdminCredentials) {
  saveJson(ADMIN_CREDENTIALS_KEY, data);
}
