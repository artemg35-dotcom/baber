export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  description: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
}

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  workSchedule: string;
  description: string;
  theme: 'classic' | 'modern' | 'dark' | 'gold' | 'minimal';
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface AdminUser {
  username: string;
  password: string;
}
