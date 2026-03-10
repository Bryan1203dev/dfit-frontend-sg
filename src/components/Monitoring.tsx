import { useState, useEffect } from 'react';
import { Search, Activity, Calendar, Clock, History } from 'lucide-react';
import { Client, Attendance, Payment } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatPeruDate } from '@/lib/time';
import { useAuthStore } from '@/store/auth';

export default function Monitoring() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [actionHistory, setActionHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchPayments();
    fetchActionHistory();
  }, []);

  const fetchActionHistory = async () => {
    const res = await fetch('/api/action-history');
    const data = await res.json();
    setActionHistory(data);
  };

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };
  
  const fetchPayments = async () => {
      const res = await fetch('/api/payments');
      const data = await res.json();
      setPayments(data);
  }

  const fetchClientData = async (client: Client) => {
    setSelectedClient(client);
    // Fetch attendance
    const resAtt = await fetch(`/api/attendance/${client.id}`);
    const dataAtt = await resAtt.json();
    setAttendance(dataAtt);
  };

  const filteredClients = clients
    .filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  // Chart Data: Frequency by Day of Week
  const chartData = [
    { name: 'Dom', count: 0 },
    { name: 'Lun', count: 0 },
    { name: 'Mar', count: 0 },
    { name: 'Mié', count: 0 },
    { name: 'Jue', count: 0 },
    { name: 'Vie', count: 0 },
    { name: 'Sáb', count: 0 },
  ];

  attendance.forEach(a => {
    const day = new Date(a.date).getDay();
    chartData[day].count++;
  });
  
  const clientPayments = payments.filter(p => p.client_id === selectedClient?.id);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="font-bold text-zinc-900 dark:text-white">{data.name}</p>
          <p className="text-zinc-700 dark:text-zinc-300">
            {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-amber-500 uppercase">Monitoreo</h2>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
        />
        {search && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 z-10 max-h-60 overflow-y-auto">
            {filteredClients.map(c => (
              <button
                key={c.id}
                onClick={() => { fetchClientData(c); setSearch(''); }}
                className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
              >
                <div className="font-bold">{c.full_name}</div>
                <div className="text-xs opacity-60">{c.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Acciones (General) */}
      {/* Removed from here */}

      {selectedClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm opacity-60 mb-2">Total Abonado</p>
              <p className="text-5xl font-bold text-green-500">S/ {selectedClient.amount_paid}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm opacity-60 mb-2">Deuda Pendiente</p>
              <p className="text-5xl font-bold text-red-500">S/ {selectedClient.price - (selectedClient.amount_paid || 0)}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm opacity-60 mb-2">Clases Restantes</p>
              <p className="text-5xl font-bold text-amber-500">
                {selectedClient.total_classes - (attendance.length || 0)}
              </p>
              <p className="text-xs opacity-50 mt-1">de {selectedClient.total_classes}</p>
            </div>
          </div>

          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                Frecuencia de Asistencia
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#f59e0b' : '#3f3f46'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-lg mb-4">Información del Cliente</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="opacity-60 block">Nombre</span>
                  <span className="font-medium">{selectedClient.full_name}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Código</span>
                  <span className="font-mono">{selectedClient.code}</span>
                </div>
                <div>
                  <span className="opacity-60 block">Membresía</span>
                  <span className="font-medium">{selectedClient.membership_type} ({selectedClient.classification})</span>
                </div>
                <div>
                  <span className="opacity-60 block">Vigencia</span>
                  <span className="font-medium">{selectedClient.start_date} - {selectedClient.end_date}</span>
                </div>
                <div className="col-span-2">
                  <span className="opacity-60 block">Observaciones</span>
                  <span className="font-medium italic opacity-80">{selectedClient.observations || 'Ninguna'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side History */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 max-h-80 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Últimas Asistencias
              </h3>
              <div className="space-y-3">
                {attendance.slice(0, 10).map(a => (
                  <div key={a.id} className="flex justify-between text-sm border-b border-zinc-100 dark:border-zinc-800/50 pb-2 last:border-0">
                    <span className="opacity-80">{formatPeruDate(a.date, 'dd/MM/yyyy')}</span>
                    <span className="font-mono opacity-60">{formatPeruDate(a.date, 'HH:mm')}</span>
                  </div>
                ))}
                {attendance.length === 0 && <p className="text-sm opacity-50 text-center py-4">Sin registros</p>}
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 max-h-80 overflow-y-auto">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Historial de Pagos
              </h3>
              <div className="space-y-3">
                {clientPayments.map(p => (
                  <div key={p.id} className="text-sm border-b border-zinc-100 dark:border-zinc-800/50 pb-2 last:border-0">
                    <div className="flex justify-between mb-1">
                        <span className="font-bold">S/ {p.amount}</span>
                        <span className="text-xs opacity-60">{p.method}</span>
                    </div>
                    <div className="flex justify-between text-xs opacity-50">
                        <span>{formatPeruDate(p.date, 'dd/MM/yyyy HH:mm')}</span>
                        <span>{p.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Historial de Acciones (Cliente) */}
          {user?.role === 'admin' && actionHistory.filter(a => a.client_id === selectedClient.id).length > 0 && (
            <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Historial de Acciones</h3>
                  <p className="text-sm text-zinc-500">Últimos cambios en membresías y datos</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-zinc-900 dark:text-zinc-200">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 uppercase font-medium">
                    <tr>
                      <th className="px-6 py-4">Fecha/Hora</th>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Acción</th>
                      <th className="px-6 py-4">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {actionHistory.filter(a => a.client_id === selectedClient.id).map((action) => (
                      <tr key={action.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="px-6 py-4 font-mono opacity-60 whitespace-nowrap">{formatPeruDate(action.date, 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-6 py-4 font-medium">{action.user_name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded text-xs font-bold">
                            {action.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">{action.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Activity className="w-16 h-16 mb-4 opacity-20" />
          <p>Busque un cliente para ver su monitoreo</p>
        </div>
      )}
    </div>
  );
}
