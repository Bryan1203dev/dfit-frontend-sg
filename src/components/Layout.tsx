import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { 
  Users, 
  LayoutDashboard, 
  CreditCard, 
  Activity, 
  PieChart,
  Wallet,
  LogOut, 
  Menu, 
  X,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { getPeruTime, formatPeruDate } from '@/lib/time';

interface LayoutProps {
  children: React.ReactNode;
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export default function Layout({ children, activeModule, setActiveModule }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleLogout = () => {
    logout();
    setActiveModule('register');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const menuItems = [
    { id: 'register', label: 'Registro Clientes', icon: Users, roles: ['admin', 'morning', 'afternoon'] },
    { id: 'admin', label: 'Administración', icon: LayoutDashboard, roles: ['admin', 'morning', 'afternoon'] },
    { id: 'payments', label: 'Gestión Pagos', icon: CreditCard, roles: ['admin', 'morning', 'afternoon'] },
    { id: 'monitoring', label: 'Monitoreo', icon: Activity, roles: ['admin', 'morning', 'afternoon'] },
    { id: 'financial', label: 'Control Financiero', icon: Wallet, roles: ['admin', 'morning', 'afternoon'] },
    { id: 'consolidated', label: 'Consolidado', icon: PieChart, roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <div className={clsx("min-h-screen transition-colors duration-300", isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-gray-50 text-gray-900")}>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900 text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-900 border border-amber-500/30">
            <img src="/assets/DFIT_LOGO.jpeg" alt="DFIT Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-lg">DFIT</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(isSidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={clsx(
                "fixed lg:relative z-20 w-64 h-full flex flex-col border-r shadow-xl transition-colors duration-300",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
              )}
            >
              <div className="p-6 flex items-center justify-between border-b border-zinc-800/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20 overflow-hidden p-[2px]">
                    <img src="/assets/DFIT_LOGO.jpeg" alt="DFIT Logo" className="w-full h-full object-cover rounded-md" />
                  </div>
                  <div>
                    <h1 className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">DFIT</h1>
                    <p className="text-xs opacity-60 text-zinc-600 dark:text-zinc-400">Gym Manager</p>
                  </div>
                </div>
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-zinc-100"
                    title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                  >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      activeModule === item.id
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-zinc-800/10 space-y-4">
                <div className="flex items-center justify-center px-2">
                  <span className="text-base font-mono font-medium opacity-80 text-zinc-900 dark:text-zinc-300">
                    {formatPeruDate(currentTime, 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                
                <div className={clsx("p-4 rounded-xl", isDarkMode ? "bg-zinc-800" : "bg-gray-100")}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                      {user?.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate text-zinc-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs opacity-60 capitalize text-zinc-600 dark:text-zinc-400">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col h-full relative">
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
