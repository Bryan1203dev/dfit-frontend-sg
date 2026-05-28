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
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 overflow-hidden">
      {/* Background with light overlay and blur */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: 'url("/assets/banner_master.png")' }}
      />
      <div className="absolute inset-0 z-1 bg-black/40 backdrop-blur-[3px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="group relative z-10 w-full max-w-sm bg-zinc-900/80 backdrop-blur-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border border-zinc-700 transition-all duration-500 hover:border-amber-400/50 hover:shadow-[0_0_50px_rgba(245,158,11,0.2)]"
      >
        <div className="p-8 text-center relative">
          {/* Circular Logo with Hover Effect */}
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-32 h-32 bg-white rounded-full mx-auto mb-6 p-1 shadow-xl shadow-black/40 border-2 border-amber-400/30 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:border-amber-400"
          >
            <img 
                src="/assets/DFIT_LOGO.jpeg" 
                alt="DFIT Logo" 
                className="w-full h-full object-cover rounded-full"
            />
          </motion.div>

          <h1 className="text-4xl font-black mb-1 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent group-hover:from-amber-200 group-hover:to-amber-500 transition-all duration-500">DFIT</h1>
          <p className="text-zinc-400 mb-8 font-medium tracking-wide">Sistema de Gestión Integral</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-amber-400/80 ml-1">Seleccionar Usuario</label>
                <select 
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-amber-400 transition-all text-white appearance-none cursor-pointer"
                >
                    {roles.map(role => (
                        <option key={role} value={role} className="bg-zinc-900">{role}</option>
                    ))}
                </select>
            </div>

            <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-amber-400/80 ml-1">PIN de Acceso</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-4 text-center text-3xl tracking-widest focus:outline-none focus:border-amber-400 transition-all text-white placeholder:text-zinc-800"
                  placeholder="••••"
                  maxLength={6}
                />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-sm font-medium bg-red-500/10 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              className="group/btn w-full h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-zinc-950 transition-all duration-300 font-black text-lg shadow-xl shadow-amber-600/20 hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(245,158,11,0.4)] flex items-center justify-center gap-3 active:scale-95"
            >
              <User className="w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110" />
              INICIAR SESIÓN
            </button>
          </form>
        </div>
      </motion.div>
      
      <div className="mt-8 relative z-10 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-amber-400/60 transition-all duration-300 cursor-default">
        RyanCore System v-1.02 ® {new Date().getFullYear()}
      </div>
    </div>
  );
}

