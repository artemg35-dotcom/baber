import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { Settings } from './types';
import { getSettings } from './api/store';

export default function App() {
  const [settings, setSettings] = useState<Settings>(getSettings());

  useEffect(() => {
    const interval = setInterval(() => {
      setSettings(getSettings());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const themeClass = getThemeClass(settings.theme);

  return (
    <BrowserRouter>
      <div className={`min-h-screen ${themeClass}`}>
        <Routes>
          <Route path="/" element={<HomePage settings={settings} />} />
          <Route path="/booking" element={<BookingPage settings={settings} />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard settings={settings} setSettings={setSettings} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function getThemeClass(theme: string): string {
  switch (theme) {
    case 'modern': return 'bg-gray-900 text-white';
    case 'dark': return 'bg-black text-gray-100';
    case 'gold': return 'bg-stone-950 text-amber-50';
    case 'minimal': return 'bg-white text-gray-900';
    default: return 'bg-stone-900 text-stone-100';
  }
}
