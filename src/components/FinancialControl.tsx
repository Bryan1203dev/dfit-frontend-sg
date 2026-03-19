import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Download } from 'lucide-react';
import { getCurrentPeruISODate, formatPeruDate } from '@/lib/time';
import * as XLSX from 'xlsx';
import { storage } from '@/lib/storage';

export default function FinancialControl() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{ newMemberships: any[], newPayments: any[] }>({ newMemberships: [], newPayments: [] });
  const [date, setDate] = useState(getCurrentPeruISODate());

  useEffect(() => {
    fetchDailyStats();
  }, [date]);

  const fetchDailyStats = () => {
    const stats = storage.getDailyStats(date);
    setData(stats);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(data.newMemberships);
    XLSX.utils.book_append_sheet(wb, ws1, "Nuevas Membresías");
    
    const ws2 = XLSX.utils.json_to_sheet(data.newPayments);
    XLSX.utils.book_append_sheet(wb, ws2, "Nuevos Abonos");
    
    XLSX.writeFile(wb, `Control_Financiero_${date}.xlsx`);
  };

  const totalMemberships = data.newMemberships.reduce((sum, item) => sum + item.amount_paid, 0);
  const totalPayments = data.newPayments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-amber-500 uppercase">Control Financiero</h2>
        <div className="flex gap-4 items-center">
            <button 
                onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
            >
                <Download className="w-4 h-4" /> Exportar Día
            </button>
        </div>
      </div>

      {/* Table 1: New Memberships */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Nuevas Membresías</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-900 dark:text-zinc-200">
            <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Membresía</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3">Precio</th>
                <th className="px-6 py-3">Abonado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.newMemberships.map((item: any) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-3 font-mono opacity-60">{formatPeruDate(item.created_at, 'HH:mm')}</td>
                  <td className="px-6 py-3 font-mono">{item.code}</td>
                  <td className="px-6 py-3 font-medium">{item.full_name}</td>
                  <td className="px-6 py-3">{item.membership_type} ({item.classification})</td>
                  <td className="px-6 py-3">{item.payment_method}</td>
                  <td className="px-6 py-3">S/ {item.price}</td>
                  <td className="px-6 py-3 font-bold text-green-600 dark:text-green-500">S/ {item.amount_paid}</td>
                </tr>
              ))}
              {data.newMemberships.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-4 opacity-50">Sin registros hoy</td></tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-50 dark:bg-zinc-800/30 font-bold">
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-right text-zinc-900 dark:text-white">TOTAL:</td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-500 text-lg">S/ {totalMemberships}</td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Table 2: New Payments */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Nuevos Abonos (Deudas)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-900 dark:text-zinc-200">
            <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Usuario</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3">Nuevo Abono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.newPayments.map((item: any) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-3 font-mono opacity-60">{formatPeruDate(item.date, 'HH:mm')}</td>
                  <td className="px-6 py-3">{item.user_name}</td>
                  <td className="px-6 py-3 font-mono">{item.code}</td>
                  <td className="px-6 py-3 font-medium">{item.full_name}</td>
                  <td className="px-6 py-3">{item.method}</td>
                  <td className="px-6 py-3 font-bold text-green-600 dark:text-green-500">S/ {item.amount}</td>
                </tr>
              ))}
              {data.newPayments.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-4 opacity-50">Sin registros hoy</td></tr>
              )}
            </tbody>
            <tfoot className="bg-zinc-50 dark:bg-zinc-800/30 font-bold">
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-zinc-900 dark:text-white">TOTAL:</td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-500 text-lg">S/ {totalPayments}</td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
