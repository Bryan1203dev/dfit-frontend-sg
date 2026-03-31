import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { motion } from 'motion/react';
import { Lock, User, Sun, Moon } from 'lucide-react';
import { storage } from '@/lib/storage';

export default function Login() {
  const [pin, setPin] = useState('');
  const [selectedRole, setSelectedRole] = useState('Administrador');
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);

  const roles = ['Administrador', 'Colaborador Mañana', 'Colaborador Tarde'];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      storage.init();
      const data = storage.login(pin);

      if (data.success && data.user) {
        if (data.user.name !== selectedRole) {
          setError('El PIN no corresponde al rol seleccionado');
          return;
        }
        login(data.user);
      } else {
        setError(data.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url("/assets/banner_master.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Capa de desenfoque y oscuridad para contraste */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative z-10 w-full max-w-sm bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden border border-zinc-700 transition-all duration-500 hover:border-yellow-400 hover:shadow-[0_0_50px_rgba(255,215,0,0.8)]"
      >
        <div className="p-8 text-center">
          <div className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-yellow-400/20 group-hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] transition-all duration-500 overflow-hidden bg-zinc-950 border-2 border-transparent group-hover:border-yellow-400">
            <img
              src="/assets/DFIT_LOGO.jpeg"
              alt="DFIT Logo"
              className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-500"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white group-hover:text-yellow-400 transition-colors duration-300">DFIT</h1>
          <p className="text-zinc-400 mb-8">Sistema de Gestión Integral</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-left">
              <label className="block text-sm font-medium mb-2 text-amber-200">Seleccionar Usuario</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-200 transition-colors"
              >
                {roles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium mb-2 text-amber-200">PIN de Acceso</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:border-amber-200 transition-colors"
                placeholder="••••"
                maxLength={6}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full h-14 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-300 hover:from-yellow-400 hover:to-yellow-200 text-zinc-900 transition-all duration-300 font-bold text-lg shadow-lg shadow-yellow-400/20 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(255,215,0,0.6)] flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Iniciar Sesión
            </button>
          </form>
        </div>
      </motion.div>

      <div className="relative z-10 mt-8 text-center text-xs text-yellow-100/40 hover:text-yellow-300 hover:drop-shadow-[0_0_10px_rgba(255,215,0,0.8)] transition-all duration-300 cursor-default">
        RyanCore System V-1.02 ® {new Date().getFullYear()}
      </div>
    </div>
  );
}
