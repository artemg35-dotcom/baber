import { Service, Appointment, Settings, TelegramConfig } from '../types';

const API_BASE = '/api';

// Check if API is available
async function isApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/settings`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

// ===== AUTH =====
export async function apiLogin(username: string, password: string): Promise<{ token: string } | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

// ===== SERVICES =====
export async function apiGetServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE}/services`);
    if (response.ok) return await response.json();
  } catch {}
  return [];
}

export async function apiCreateService(service: Partial<Service>): Promise<Service | null> {
  try {
    const response = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(service),
    });
    if (response.ok) return await response.json();
  } catch {}
  return null;
}

export async function apiUpdateService(id: string, service: Partial<Service>): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(service),
    });
    return response.ok;
  } catch { return false; }
}

export async function apiDeleteService(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.ok;
  } catch { return false; }
}

// ===== APPOINTMENTS =====
export async function apiGetAppointments(): Promise<Appointment[]> {
  try {
    const response = await fetch(`${API_BASE}/appointments`);
    if (response.ok) return await response.json();
  } catch {}
  return [];
}

export async function apiCreateAppointment(appointment: Partial<Appointment>): Promise<Appointment | null> {
  try {
    const response = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment),
    });
    if (response.ok) return await response.json();
  } catch {}
  return null;
}

export async function apiUpdateAppointment(id: string, data: Partial<Appointment>): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch { return false; }
}

export async function apiDeleteAppointment(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return response.ok;
  } catch { return false; }
}

// ===== SETTINGS =====
export async function apiGetSettings(): Promise<Settings | null> {
  try {
    const response = await fetch(`${API_BASE}/settings`);
    if (response.ok) return await response.json();
  } catch {}
  return null;
}

export async function apiUpdateSettings(settings: Partial<Settings>): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    });
    return response.ok;
  } catch { return false; }
}

// ===== TELEGRAM =====
export async function apiGetTelegramConfig(): Promise<TelegramConfig | null> {
  try {
    const response = await fetch(`${API_BASE}/telegram`, { headers: authHeaders() });
    if (response.ok) return await response.json();
  } catch {}
  return null;
}

export async function apiUpdateTelegramConfig(config: TelegramConfig): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/telegram`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(config),
    });
    return response.ok;
  } catch { return false; }
}

export async function apiTestTelegram(config: { botToken: string; chatId: string }): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/telegram/test`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(config),
    });
    return response.ok;
  } catch { return false; }
}

export { isApiAvailable };
