import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Service, Appointment, TelegramConfig } from '../types';
import {
  getServices, saveServices, getAppointments, saveAppointments,
  addAppointment, updateAppointment, deleteAppointment,
  getTelegramConfig, saveTelegramConfig, isAuthenticated, logout,
  saveSettings as saveSettingsFn
} from '../api/store';
import {
  Scissors, Calendar, Users, Settings as SettingsIcon,
  MessageSquare, Palette, LogOut, Plus, Trash2, Edit,
  Check, X, Clock, Phone, ChevronLeft, ChevronRight, Save
} from 'lucide-react';

interface Props {
  settings: Settings;
  setSettings: (s: Settings) => void;
}

type Tab = 'schedule' | 'appointments' | 'services' | 'settings' | 'telegram' | 'theme';

export default function AdminDashboard({ settings, setSettings }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/admin');
    }
  }, [navigate]);

  if (!isAuthenticated()) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'schedule', label: 'Расписание', icon: <Calendar className="w-5 h-5" /> },
    { id: 'appointments', label: 'Записи', icon: <Users className="w-5 h-5" /> },
    { id: 'services', label: 'Услуги', icon: <Scissors className="w-5 h-5" /> },
    { id: 'settings', label: 'Настройки', icon: <SettingsIcon className="w-5 h-5" /> },
    { id: 'telegram', label: 'Telegram', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'theme', label: 'Тема', icon: <Palette className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-black/40 border-b lg:border-b-0 lg:border-r border-white/10 p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <Scissors className="w-7 h-7 text-amber-500" />
          <span className="text-xl font-bold">Админ-панель</span>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg whitespace-nowrap transition text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'hover:bg-white/5 text-stone-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-8 lg:mt-auto lg:absolute lg:bottom-4 lg:left-4">
          <button
            onClick={() => { logout(); navigate('/admin'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 transition w-full"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        {activeTab === 'schedule' && <ScheduleSection />}
        {activeTab === 'appointments' && <AppointmentsSection />}
        {activeTab === 'services' && <ServicesSection />}
        {activeTab === 'settings' && <SettingsSection settings={settings} setSettings={setSettings} />}
        {activeTab === 'telegram' && <TelegramSection />}
        {activeTab === 'theme' && <ThemeSection settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  );
}

// ========== SCHEDULE ==========
function ScheduleSection() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const appointments = getAppointments();
  const services = getServices();

  const weekDays = getWeekDays(currentDate);

  function getWeekDays(date: Date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const timeSlots = [];
  for (let h = 10; h <= 20; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  function getAppointmentsForDay(day: Date, time: string) {
    const dateStr = day.toISOString().split('T')[0];
    return appointments.filter(a => a.date === dateStr && a.time === time && a.status !== 'cancelled');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Расписание</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus className="w-5 h-5" /> Новая запись
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - 7);
          setCurrentDate(d);
        }} className="p-2 hover:bg-white/5 rounded-lg transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium">
          {weekDays[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — {weekDays[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => {
          const d = new Date(currentDate);
          d.setDate(d.getDate() + 7);
          setCurrentDate(d);
        }} className="p-2 hover:bg-white/5 rounded-lg transition">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-px bg-white/5 rounded-xl overflow-hidden">
            <div className="p-3 bg-black/40 font-medium text-sm">Время</div>
            {weekDays.map((day, i) => {
              const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
              return (
                <div key={i} className={`p-3 bg-black/40 text-center ${isToday ? 'bg-amber-900/30' : ''}`}>
                  <div className="text-xs text-stone-500">{dayNames[i]}</div>
                  <div className={`font-bold ${isToday ? 'text-amber-500' : ''}`}>{day.getDate()}</div>
                </div>
              );
            })}

            {timeSlots.map(time => (
              <div key={time} className="contents">
                <div className="p-2 bg-black/20 text-xs text-stone-500 text-center">{time}</div>
                {weekDays.map((day, di) => {
                  const dayAppts = getAppointmentsForDay(day, time);
                  return (
                    <div key={di} className="p-1 bg-black/20 min-h-[40px]">
                      {dayAppts.map(appt => (
                        <div key={appt.id} className="bg-amber-600/20 border border-amber-600/30 rounded px-1.5 py-0.5 text-xs mb-0.5 truncate" title={`${appt.clientName} - ${appt.serviceName}`}>
                          {appt.clientName}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && <AddAppointmentModal services={services} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

// ========== ADD APPOINTMENT MODAL ==========
function AddAppointmentModal({ services, onClose }: { services: Service[]; onClose: () => void }) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  function handleSave() {
    if (!clientName || !serviceId) return;
    const service = services.find(s => s.id === serviceId);
    const appointment: Appointment = {
      id: Date.now().toString(),
      clientName,
      clientPhone,
      serviceId,
      serviceName: service?.name || '',
      date,
      time,
      status: 'confirmed',
      notes,
      createdAt: new Date().toISOString(),
    };
    addAppointment(appointment);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Новая запись</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Имя клиента *" value={clientName} onChange={e => setClientName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
          <input type="tel" placeholder="Телефон" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
          <select value={serviceId} onChange={e => setServiceId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none">
            {services.map(s => <option key={s.id} value={s.id} className="bg-stone-900">{s.name} — {s.price}₽</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
          </div>
          <textarea placeholder="Заметки" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none resize-none" />
          <button onClick={handleSave} disabled={!clientName}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition">
            Создать запись
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== APPOINTMENTS ==========
function AppointmentsSection() {
  const [appointments, setAppointments] = useState(getAppointments());
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);
  const sorted = [...filtered].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));

  function updateStatus(id: string, status: Appointment['status']) {
    const appt = appointments.find(a => a.id === id);
    if (appt) {
      updateAppointment({ ...appt, status });
      setAppointments(getAppointments());
    }
  }

  function removeAppointment(id: string) {
    deleteAppointment(id);
    setAppointments(getAppointments());
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    confirmed: 'bg-green-600/20 text-green-400 border-green-600/30',
    completed: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    cancelled: 'bg-red-600/20 text-red-400 border-red-600/30',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждена',
    completed: 'Завершена',
    cancelled: 'Отменена',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Записи клиентов</h2>
      
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-amber-600 text-white' : 'bg-white/5 hover:bg-white/10'
            }`}>
            {f === 'all' ? 'Все' : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.length === 0 && (
          <p className="text-stone-500 text-center py-12">Нет записей</p>
        )}
        {sorted.map(appt => (
          <div key={appt.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">{appt.clientName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[appt.status]}`}>
                    {statusLabels[appt.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-stone-400">
                  <span className="flex items-center gap-1"><Scissors className="w-4 h-4" />{appt.serviceName}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{appt.date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{appt.time}</span>
                  <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{appt.clientPhone}</span>
                </div>
                {appt.notes && <p className="text-stone-500 text-sm mt-2">💬 {appt.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <select value={appt.status} onChange={e => updateStatus(appt.id, e.target.value as Appointment['status'])}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none">
                  <option value="pending" className="bg-stone-900">Ожидает</option>
                  <option value="confirmed" className="bg-stone-900">Подтверждена</option>
                  <option value="completed" className="bg-stone-900">Завершена</option>
                  <option value="cancelled" className="bg-stone-900">Отменена</option>
                </select>
                <button onClick={() => removeAppointment(appt.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== SERVICES ==========
function ServicesSection() {
  const [services, setServices] = useState(getServices());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: 0, duration: 30, description: '' });

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditForm({ ...service });
  }

  function saveEdit() {
    if (!editingId) return;
    const updated = services.map(s => s.id === editingId ? { ...s, ...editForm } : s);
    saveServices(updated);
    setServices(updated);
    setEditingId(null);
  }

  function toggleActive(id: string) {
    const updated = services.map(s => s.id === id ? { ...s, active: !s.active } : s);
    saveServices(updated);
    setServices(updated);
  }

  function removeService(id: string) {
    const updated = services.filter(s => s.id !== id);
    saveServices(updated);
    setServices(updated);
  }

  function addNewService() {
    if (!newService.name) return;
    const service: Service = {
      id: Date.now().toString(),
      ...newService,
      active: true,
    };
    const updated = [...services, service];
    saveServices(updated);
    setServices(updated);
    setShowAdd(false);
    setNewService({ name: '', price: 0, duration: 30, description: '' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Услуги и цены</h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition">
          <Plus className="w-5 h-5" /> Добавить
        </button>
      </div>

      <div className="space-y-3">
        {services.map(service => (
          <div key={service.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
            {editingId === service.id ? (
              <div className="space-y-3">
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-500">Цена (₽)</label>
                    <input type="number" value={editForm.price || 0} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Длительность (мин)</label>
                    <input type="number" value={editForm.duration || 30} onChange={e => setEditForm({ ...editForm, duration: Number(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none" />
                  </div>
                </div>
                <input type="text" value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Описание"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition">
                    <Check className="w-4 h-4" /> Сохранить
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition">
                    <X className="w-4 h-4" /> Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${!service.active ? 'text-stone-500 line-through' : ''}`}>{service.name}</span>
                    <span className="text-amber-500 font-bold">{service.price} ₽</span>
                    <span className="text-stone-500 text-sm">{service.duration} мин</span>
                  </div>
                  <p className="text-stone-400 text-sm mt-1">{service.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(service.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      service.active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                    {service.active ? 'Активна' : 'Скрыта'}
                  </button>
                  <button onClick={() => startEdit(service)} className="p-2 hover:bg-white/5 rounded-lg transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeService(service.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Новая услуга</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Название *" value={newService.name} onChange={e => setNewService({ ...newService, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Цена" value={newService.price || ''} onChange={e => setNewService({ ...newService, price: Number(e.target.value) })}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
                <input type="number" placeholder="Минуты" value={newService.duration || ''} onChange={e => setNewService({ ...newService, duration: Number(e.target.value) })}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
              </div>
              <input type="text" placeholder="Описание" value={newService.description} onChange={e => setNewService({ ...newService, description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={addNewService} disabled={!newService.name}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition">
                  Добавить
                </button>
                <button onClick={() => setShowAdd(false)} className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== SETTINGS ==========
function SettingsSection({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveSettingsFn(form);
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Настройки барбершопа</h2>
      
      <div className="space-y-4 max-w-xl">
        <div>
          <label className="text-sm font-medium mb-2 block">Название</label>
          <input type="text" value={form.shopName} onChange={e => setForm({ ...form, shopName: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Адрес</label>
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Телефон</label>
          <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Email</label>
          <input type="text" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Режим работы</label>
          <input type="text" value={form.workSchedule} onChange={e => setForm({ ...form, workSchedule: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Описание</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none resize-none" />
        </div>

        <button onClick={handleSave}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold transition">
          <Save className="w-5 h-5" /> Сохранить
        </button>
        {saved && <span className="text-green-400 ml-4">✓ Сохранено!</span>}
      </div>
    </div>
  );
}

// ========== TELEGRAM ==========
function TelegramSection() {
  const [config, setConfig] = useState<TelegramConfig>(getTelegramConfig());
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function handleSave() {
    saveTelegramConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTestResult('Отправка...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: '✅ Тестовое сообщение от BarberShop Admin Panel',
        }),
      });
      if (response.ok) {
        setTestResult('✅ Сообщение отправлено!');
      } else {
        setTestResult('❌ Ошибка отправки. Проверьте токен и chat_id');
      }
    } catch {
      setTestResult('❌ Ошибка соединения');
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Настройка Telegram бота</h2>
      
      <div className="space-y-4 max-w-xl">
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4">
          <h3 className="font-bold text-blue-400 mb-2">Как настроить:</h3>
          <ol className="text-sm text-stone-400 space-y-1 list-decimal list-inside">
            <li>Найдите @BotFather в Telegram</li>
            <li>Создайте нового бота командой /newbot</li>
            <li>Скопируйте токен бота</li>
            <li>Добавьте бота в ваш чат/группу</li>
            <li>Отправьте любое сообщение в чат</li>
            <li>Перейдите по ссылке: https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</li>
            <li>Найдите chat.id в ответе и вставьте его ниже</li>
          </ol>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
          <span className="font-medium">Уведомления включены</span>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Токен бота</label>
          <input type="text" value={config.botToken} onChange={e => setConfig({ ...config, botToken: e.target.value })}
            placeholder="123456789:ABCdefGHI..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none font-mono text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Chat ID</label>
          <input type="text" value={config.chatId} onChange={e => setConfig({ ...config, chatId: e.target.value })}
            placeholder="-1001234567890"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none font-mono text-sm" />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold transition">
            <Save className="w-5 h-5" /> Сохранить
          </button>
          <button onClick={handleTest} disabled={!config.botToken || !config.chatId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition">
            <MessageSquare className="w-5 h-5" /> Тест
          </button>
        </div>
        {saved && <span className="text-green-400">✓ Сохранено!</span>}
        {testResult && <p className="text-sm">{testResult}</p>}
      </div>
    </div>
  );
}

// ========== THEME ==========
function ThemeSection({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const themes = [
    { id: 'classic' as const, name: 'Классическая', desc: 'Тёмная с золотыми акцентами', preview: 'bg-stone-900 text-amber-500' },
    { id: 'modern' as const, name: 'Модерн', desc: 'Серо-чёрная с неоновыми акцентами', preview: 'bg-gray-900 text-cyan-400' },
    { id: 'dark' as const, name: 'Тёмная', desc: 'Полностью чёрная', preview: 'bg-black text-white' },
    { id: 'gold' as const, name: 'Золотая', desc: 'Роскошная тёмно-золотая', preview: 'bg-stone-950 text-amber-400' },
    { id: 'minimal' as const, name: 'Минимализм', desc: 'Светлая и чистая', preview: 'bg-white text-gray-900 border border-gray-200' },
  ];

  function selectTheme(themeId: Settings['theme']) {
    const updated = { ...settings, theme: themeId };
    saveSettingsFn(updated);
    setSettings(updated);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Тема оформления</h2>
      <p className="text-stone-400 mb-8">Выберите тему для отображения сайта клиентам</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => selectTheme(theme.id)}
            className={`p-6 rounded-xl border-2 transition text-left ${
              settings.theme === theme.id
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-white/10 hover:border-white/30 bg-white/5'
            }`}
          >
            <div className={`w-full h-16 rounded-lg mb-4 ${theme.preview} flex items-center justify-center`}>
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">{theme.name}</h3>
            <p className="text-stone-400 text-sm">{theme.desc}</p>
            {settings.theme === theme.id && (
              <span className="inline-flex items-center gap-1 text-amber-500 text-sm mt-2 font-medium">
                <Check className="w-4 h-4" /> Выбрана
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
