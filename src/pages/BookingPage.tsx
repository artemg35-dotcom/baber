import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Service, Appointment } from '../types';
import { getServices, getAppointments, addAppointment, sendTelegramNotification } from '../api/store';
import { Scissors, ArrowLeft, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';

interface Props {
  settings: Settings;
}

export default function BookingPage({ settings }: Props) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const services = getServices().filter(s => s.active);
  const today = new Date().toISOString().split('T')[0];

  const timeSlots = generateTimeSlots();

  function generateTimeSlots(): string[] {
    const slots: string[] = [];
    for (let h = 10; h <= 20; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  function getBusyTimes(): string[] {
    if (!selectedDate) return [];
    const appointments = getAppointments();
    return appointments
      .filter(a => a.date === selectedDate && a.status !== 'cancelled')
      .map(a => a.time);
  }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) return;

    const appointment: Appointment = {
      id: Date.now().toString(),
      clientName,
      clientPhone,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      time: selectedTime,
      status: 'pending',
      notes,
      createdAt: new Date().toISOString(),
    };

    addAppointment(appointment);
    await sendTelegramNotification(appointment);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Вы записаны!</h2>
          <p className="text-stone-400 mb-2">
            <strong>{selectedService?.name}</strong>
          </p>
          <p className="text-stone-400 mb-2">📅 {selectedDate} в {selectedTime}</p>
          <p className="text-stone-400 mb-8">Мы свяжемся с вами для подтверждения</p>
          <Link to="/" className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition inline-block">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-amber-500 mb-8 transition">
          <ArrowLeft className="w-5 h-5" /> Назад
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Scissors className="w-8 h-8 text-amber-500" />
          <h1 className="text-3xl font-bold">{settings.shopName}</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-amber-600 text-white' : 'bg-white/10 text-stone-500'
              }`}>
                {s}
              </div>
              <span className={`text-sm hidden sm:block ${step >= s ? 'text-white' : 'text-stone-500'}`}>
                {s === 1 ? 'Услуга' : s === 2 ? 'Дата и время' : 'Контакты'}
              </span>
              {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-amber-600' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Выберите услугу</h2>
            <div className="space-y-3">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setStep(2); }}
                  className={`w-full text-left p-5 rounded-xl border transition ${
                    selectedService?.id === service.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 hover:border-amber-500/50 bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold">{service.name}</h3>
                      <p className="text-stone-400 text-sm mt-1">{service.description}</p>
                      <p className="text-stone-500 text-sm mt-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {service.duration} мин
                      </p>
                    </div>
                    <span className="text-xl font-bold text-amber-500">{service.price} ₽</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Выберите дату и время</h2>
            
            <div className="mb-6">
              <label className="flex items-center gap-2 text-lg font-medium mb-3">
                <Calendar className="w-5 h-5 text-amber-500" /> Дата
              </label>
              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none transition"
              />
            </div>

            {selectedDate && (
              <div>
                <label className="flex items-center gap-2 text-lg font-medium mb-3">
                  <Clock className="w-5 h-5 text-amber-500" /> Время
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {timeSlots.map(time => {
                    const busy = getBusyTimes().includes(time);
                    return (
                      <button
                        key={time}
                        disabled={busy}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 rounded-lg font-medium transition ${
                          busy
                            ? 'bg-red-900/30 text-red-400 cursor-not-allowed'
                            : selectedTime === time
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/5 border border-white/10 hover:border-amber-500/50'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition">
                Назад
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Ваши данные</h2>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <User className="w-4 h-4 text-amber-500" /> Имя
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Phone className="w-4 h-4 text-amber-500" /> Телефон
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={e => setClientPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Заметки (необязательно)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Пожелания к стрижке..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none transition resize-none"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="font-bold mb-2">Ваша запись:</h3>
              <p className="text-stone-400">{selectedService?.name} — {selectedService?.price} ₽</p>
              <p className="text-stone-400">📅 {selectedDate} в {selectedTime}</p>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition">
                Назад
              </button>
              <button
                onClick={handleSubmit}
                disabled={!clientName || !clientPhone}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Записаться
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
