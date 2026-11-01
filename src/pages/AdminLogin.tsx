import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/store';
import { Scissors, Lock, User, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/admin/dashboard');
    } else {
      setError('Неверный логин или пароль');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Scissors className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Админ-панель</h1>
          <p className="text-stone-400 mt-2">Войдите для управления барбершопом</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <User className="w-4 h-4 text-amber-500" /> Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="admin"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Lock className="w-4 h-4 text-amber-500" /> Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stone-500 focus:border-amber-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-lg font-semibold transition"
          >
            Войти
          </button>

          <p className="text-center text-stone-500 text-sm">
            По умолчанию: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
