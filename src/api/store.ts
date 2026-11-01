import { Service, Appointment, Settings, TelegramConfig } from '../types';

const STORAGE_KEYS = {
  services: 'barbershop_services',
  appointments: 'barbershop_appointments',
  settings: 'barbershop_settings',
  telegram: 'barbershop_telegram',
  auth: 'barbershop_auth',
};

const DEFAULT_SETTINGS: Settings = {
  shopName: 'BARBER PRO',
  address: 'ул. Пушкина, д. 10',
  phone: '+7 (999) 123-45-67',
  email: 'info@barberpro.ru',
  workSchedule: 'Пн-Сб: 10:00 - 21:00, Вс: 11:00 - 19:00',
  description: 'Премиальный барбершоп в центре города. Опытные мастера, качественные инструменты, атмосфера настоящего мужского клуба.',
  theme: 'classic',
};

const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Мужская стрижка', price: 1500, duration: 45, description: 'Классическая или модельная стрижка', active: true },
  { id: '2', name: 'Стрижка бороды', price: 800, duration: 30, description: 'Оформление и стрижка бороды', active: true },
  { id: '3', name: 'Стрижка + Борода', price: 2000, duration: 60, description: 'Комплекс: стрижка и оформление бороды', active: true },
  { id: '4', name: 'Королевское бритьё', price: 1200, duration: 40, description: 'Бритьё опасной бритвой с горячим полотенцем', active: true },
  { id: '5', name: 'Детская стрижка', price: 1000, duration: 30, description: 'Стрижка для детей до 12 лет', active: true },
  { id: '6', name: 'Камуфляж седины', price: 1500, duration: 45, description: 'Камуфляж седых волос и бороды', active: true },
];

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Services
export function getServices(): Service[] {
  return getItem(STORAGE_KEYS.services, DEFAULT_SERVICES);
}

export function saveServices(services: Service[]): void {
  setItem(STORAGE_KEYS.services, services);
}

// Appointments
export function getAppointments(): Appointment[] {
  return getItem(STORAGE_KEYS.appointments, []);
}

export function saveAppointments(appointments: Appointment[]): void {
  setItem(STORAGE_KEYS.appointments, appointments);
}

export function addAppointment(appointment: Appointment): void {
  const appointments = getAppointments();
  appointments.push(appointment);
  saveAppointments(appointments);
}

export function updateAppointment(updated: Appointment): void {
  const appointments = getAppointments();
  const index = appointments.findIndex(a => a.id === updated.id);
  if (index !== -1) {
    appointments[index] = updated;
    saveAppointments(appointments);
  }
}

export function deleteAppointment(id: string): void {
  const appointments = getAppointments().filter(a => a.id !== id);
  saveAppointments(appointments);
}

// Settings
export function getSettings(): Settings {
  return getItem(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  setItem(STORAGE_KEYS.settings, settings);
}

// Telegram
export function getTelegramConfig(): TelegramConfig {
  return getItem(STORAGE_KEYS.telegram, { enabled: false, botToken: '', chatId: '' });
}

export function saveTelegramConfig(config: TelegramConfig): void {
  setItem(STORAGE_KEYS.telegram, config);
}

// Auth
export function isAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEYS.auth) === 'true';
}

export function login(username: string, password: string): boolean {
  if (username === 'admin' && password === 'admin123') {
    localStorage.setItem(STORAGE_KEYS.auth, 'true');
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.auth);
}

// Telegram notification
export async function sendTelegramNotification(appointment: Appointment): Promise<boolean> {
  const config = getTelegramConfig();
  if (!config.enabled || !config.botToken || !config.chatId) return false;
  
  try {
    const message = `🆕 Новая запись!\n\n` +
      `👤 Клиент: ${appointment.clientName}\n` +
      `📱 Телефон: ${appointment.clientPhone}\n` +
      `💈 Услуга: ${appointment.serviceName}\n` +
      `📅 Дата: ${appointment.date}\n` +
      `⏰ Время: ${appointment.time}\n` +
      (appointment.notes ? `📝 Заметки: ${appointment.notes}\n` : '');
    
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
