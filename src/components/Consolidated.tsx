import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { storage } from '@/lib/storage';

export default function Consolidated() {
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // all, day, week, month, year
  
  useEffect(() => {
    const data = storage.getConsolidatedStats(filter);
    setClients(data);
  }, [filter]);

  // Process Data
  const membershipData = [
    { name: 'Diario', value: clients.filter(c => c.membership_type === 'Diario').length },
    { name: 'Interdiario', value: clients.filter(c => c.membership_type === 'Interdiario').length },
  ];

  const classificationData = clients.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.classification);
    if (existing) existing.value++;
    else acc.push({ name: curr.classification, value: 1 });
    return acc;
  }, []);

  const paymentMethodData = clients.reduce((acc: any[], curr) => {
    const existing = acc.find(i => i.name === curr.payment_method);
    const amount = curr.amount_paid || 0;
    if (existing) existing.value += amount;
    else acc.push({ name: curr.payment_method, value: amount });
    return acc;
  }, []);

  const lineChartDataMap = clients.reduce((acc: any, curr) => {
    const date = new Date(curr.event_date);
    let key = '';
    if (filter === 'day') {
      key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (filter === 'month' || filter === 'quarter') {
      key = date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } else {
      key = date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    }
    
    if (!acc[key]) {
      acc[key] = { name: key, abonos: 0, deudas: 0 };
    }
    acc[key].abonos += (curr.amount_paid || 0);
    acc[key].deudas += (curr.price - (curr.amount_paid || 0));
    return acc;
  }, {});

  const lineChartData = Object.values(lineChartDataMap).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const total = membershipData.reduce((sum, item) => sum + item.value, 0);
      const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="font-bold text-zinc-900 dark:text-white">{data.name}</p>
          <p className="text-zinc-700 dark:text-zinc-300">
            {data.value} ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(clients);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
      XLSX.writeFile(wb, "Consolidado_General.xlsx");
  }

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-amber-500 uppercase">Consolidado General</h2>
            <div className="flex gap-2">
                <select 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 outline-none text-zinc-900 dark:text-white"
                >
                    <option value="all">Todo el tiempo</option>
                    <option value="day">Hoy</option>
                    <option value="month">Este Mes</option>
                    <option value="quarter">Este Trimestre</option>
                    <option value="year">Este Año</option>
                </select>
                <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500">
                    <Download className="w-4 h-4" /> Exportar Todo
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg mb-4">Porcentaje por Tipo de Membresía</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={membershipData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {membershipData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg mb-4">Cantidad de Membresías por Clasificación</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classificationData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg mb-4">Ingresos por Método de Pago</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodData} layout="vertical">
                            <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/ ${value}`} />
                            <YAxis dataKey="name" type="category" width={100} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [`S/ ${value}`, 'Ingresos']} cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-lg mb-4">Abonos vs Deudas Pendientes</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/ ${value}`} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value: number) => [`S/ ${value}`]} />
                            <Legend />
                            <Line type="monotone" dataKey="abonos" name="Abonos" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="deudas" name="Deudas Pendientes" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
}
