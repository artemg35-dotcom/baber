import { Link } from 'react-router-dom';
import { Settings, Service } from '../types';
import { getServices } from '../api/store';
import { Scissors, Phone, MapPin, Clock, Mail, ChevronRight } from 'lucide-react';

interface Props {
  settings: Settings;
}

export default function HomePage({ settings }: Props) {
  const services = getServices().filter(s => s.active);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-wider">{settings.shopName}</h1>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#services" className="hover:text-amber-500 transition hidden md:block">Услуги</a>
            <a href="#about" className="hover:text-amber-500 transition hidden md:block">О нас</a>
            <a href="#contacts" className="hover:text-amber-500 transition hidden md:block">Контакты</a>
            <Link to="/booking" className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-medium transition">
              Записаться
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-stone-900/80"></div>
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="barber-pole" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-amber-500"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#barber-pole)"/>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-600/30 rounded-full px-4 py-1.5 text-amber-400 text-sm mb-6">
            <Scissors className="w-4 h-4" /> Премиальный барбершоп
          </div>
          <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Стиль. Точность.<br />
            <span className="text-amber-500">Мастерство.</span>
          </h2>
          <p className="text-xl text-stone-300 mb-10 max-w-2xl mx-auto">
            {settings.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking" className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition transform hover:scale-105">
              Записаться онлайн <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="tel:{settings.phone}" className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
              <Phone className="w-5 h-5" /> {settings.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Наши услуги</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/booking" className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white px-8 py-3 rounded-lg font-semibold transition">
              Записаться на услугу <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Почему мы?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-xl font-bold mb-2">Опытные мастера</h4>
              <p className="text-stone-400">Наши барберы имеют многолетний опыт и постоянно совершенствуют навыки</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-xl font-bold mb-2">Удобное расписание</h4>
              <p className="text-stone-400">Работаем без выходных, записывайтесь на удобное время онлайн</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-8 h-8 text-amber-500" />
              </div>
              <h4 className="text-xl font-bold mb-2">Премиум качество</h4>
              <p className="text-stone-400">Используем только профессиональную косметику и инструменты</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contacts */}
      <section id="contacts" className="py-20 bg-black/30">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Контакты</h3>
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <MapPin className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <span>{settings.phone}</span>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <span>{settings.email}</span>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <span>{settings.workSchedule}</span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Link to="/booking" className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
                Записаться онлайн
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-500">
          <p>© 2024 {settings.shopName}. Все права защищены.</p>
          <Link to="/admin" className="text-stone-600 hover:text-stone-400 text-sm mt-2 inline-block">
            Админ-панель
          </Link>
        </div>
      </footer>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-6 hover:border-amber-500/50 transition group">
      <h4 className="text-xl font-bold mb-2 group-hover:text-amber-500 transition">{service.name}</h4>
      <p className="text-stone-400 mb-4">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-amber-500">{service.price} ₽</span>
        <span className="text-stone-500 text-sm">{service.duration} мин</span>
      </div>
    </div>
  );
}
