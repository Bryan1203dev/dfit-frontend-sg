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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[url('/assets/banner_master.png')] bg-cover bg-center bg-no-repeat relative text-white p-4">
      {/* Blur Overlay */}
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative z-10 w-full max-w-sm bg-zinc-800 rounded-2xl shadow-2xl overflow-hidden border border-zinc-700 transition-all duration-300 hover:border-amber-400 hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]"
      >
        <div className="p-8 text-center">
          <div className="w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-400/30 overflow-hidden transform group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(251,191,36,0.8)] transition-all duration-300 border-2 border-amber-400/50 group-hover:border-amber-400">
            <img src="/assets/DFIT_LOGO.jpeg" alt="DFIT Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white group-hover:text-amber-400 transition-colors duration-300">DFIT</h1>
          <p className="text-zinc-400 mb-8">Sistema de Gestión Integral</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-left">
                <label className="block text-sm font-medium mb-2 text-amber-300">Seleccionar Usuario</label>
                <select 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-300 transition-colors"
                >
                    {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>

            <div className="text-left">
                <label className="block text-sm font-medium mb-2 text-amber-300">PIN de Acceso</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:border-amber-300 transition-colors"
                  placeholder="••••"
                  maxLength={6}
                />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full h-14 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-zinc-900 transition-all duration-300 font-bold text-lg shadow-lg shadow-amber-500/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Iniciar Sesión
            </button>
          </form>
        </div>
      </motion.div>
      
      <div className="relative z-10 mt-8 text-center text-xs text-amber-300/50 hover:text-amber-400 transition-all duration-300 cursor-default">
        RyanCore System v-1.02 ® {new Date().getFullYear()}
      </div>
    </div>
  );
}
