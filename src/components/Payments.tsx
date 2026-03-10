import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Search, DollarSign, CreditCard, Download, Calendar, X } from 'lucide-react';
import { Client, Payment } from '@/types';
import { formatPeruDate } from '@/lib/time';
import * as XLSX from 'xlsx';

export default function Payments() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '', 'all', 'today', 'week', 'month'

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('Efectivo');
  const [history, setHistory] = useState<Payment[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, action: () => void } | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    setClients(data);
  };

  const fetchHistory = async () => {
    const res = await fetch('/api/payments');
    const data = await res.json();
    setHistory(data);
  };

  const filteredClients = clients
    .filter(c => (c.price - (c.amount_paid || 0)) > 0)
    .filter(c => {
      if (!dateFilter || dateFilter === 'all') return true;
      const date = new Date(c.updated_at || c.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      }
      if (dateFilter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      return true;
    })
    .filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const exportExcel = () => {
    const exportData = filteredClients.map(c => ({
      'Código': c.code,
      'Cliente': c.full_name,
      'Teléfono': c.phone,
      'Plan': c.membership_type,
      'Fecha Vencimiento': formatPeruDate(c.end_date, 'dd/MM/yyyy'),
      'Deuda Pendiente': c.price - (c.amount_paid || 0),
      'Última Actualización': formatPeruDate(c.updated_at || c.created_at, 'dd/MM/yyyy HH:mm')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deudas Pendientes");
    XLSX.writeFile(wb, `Deudas_Pendientes_${formatPeruDate(new Date().toISOString(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleSelect = (client: Client) => {
    setSelectedClient(client);
    setSearch(''); // Clear search to focus on selected
  };

  const handlePayment = () => {
    if (!selectedClient || amount <= 0) return;
    
    const debt = selectedClient.price - (selectedClient.amount_paid || 0);
    if (amount > debt) {
        alert('El monto no puede ser mayor a la deuda');
        return;
    }

    setConfirmDialog({
      title: 'Confirmar Pago',
      message: `¿Confirmar pago de S/ ${amount} para ${selectedClient.full_name}?`,
      action: async () => {
        try {
          await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: crypto.randomUUID(),
              client_id: selectedClient.id,
              amount: amount,
              method: method,
              date: new Date().toISOString(),
              user_id: user?.id,
              user_name: user?.name,
              type: 'Debt'
            })
          });
          alert('Pago registrado');
          setAmount('');
          fetchClients();
          fetchHistory();
          setSelectedClient(null);
        } catch (error) {
          alert('Error al registrar pago');
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Search & List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-amber-500 uppercase">Gestión de Pagos</h2>
          <button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm font-medium"
            title="Exportar Deudas"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1 z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedClient(null); }}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            />
            {search && !selectedClient && (
              <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 z-10 max-h-60 overflow-y-auto">
                {filteredClients.map(client => {
                  const debt = client.price - (client.amount_paid || 0);
                  return (
                    <div 
                      key={client.id} 
                      onClick={() => handleSelect(client)}
                      className="p-4 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold">{client.full_name}</span>
                        <span className="text-xs font-mono opacity-50">{client.code}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={debt > 0 ? "text-red-500" : "text-green-500"}>
                          Deuda: S/ {debt}
                        </span>
                        <span className="opacity-60">Plan: {client.membership_type}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredClients.length === 0 && (
                  <div className="p-4 text-center text-zinc-500">No se encontraron resultados</div>
                )}
              </div>
            )}
          </div>
          
          <div className="relative flex items-center">
            <select
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setSelectedClient(null); }}
              className="h-full pl-10 pr-8 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white appearance-none"
            >
              <option value="" disabled hidden>Filtrar por fecha</option>
              <option value="all">Todas</option>
              <option value="today">Hoy</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5 pointer-events-none" />
            {dateFilter && (
              <button 
                onClick={() => { setDateFilter(''); setSelectedClient(null); }} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {dateFilter && !selectedClient && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Resultados del filtro ({filteredClients.length})
              </h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredClients.map(client => {
                const debt = client.price - (client.amount_paid || 0);
                return (
                  <div 
                    key={client.id} 
                    onClick={() => handleSelect(client)}
                    className="p-4 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold">{client.full_name}</span>
                      <span className="text-xs font-mono opacity-50">{client.code}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={debt > 0 ? "text-red-500" : "text-green-500"}>
                        Deuda: S/ {debt}
                      </span>
                      <span className="opacity-60">Plan: {client.membership_type}</span>
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="p-8 text-center text-zinc-500">No se encontraron resultados</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Payment Form */}
      <div className="lg:col-span-2">
        {selectedClient ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8 w-full max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-3xl font-bold mb-1">{selectedClient.full_name}</h3>
                    <p className="opacity-60 font-mono">{selectedClient.code}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-60">Deuda Total</p>
                    <p className="text-4xl font-bold text-red-500">
                        S/ {selectedClient.price - (selectedClient.amount_paid || 0)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm opacity-60 mb-1">Precio Membresía</p>
                    <p className="text-2xl font-bold">S/ {selectedClient.price}</p>
                </div>
                <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm opacity-60 mb-1">Abonado Actual</p>
                    <p className="text-2xl font-bold text-green-500">S/ {selectedClient.amount_paid}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 opacity-70">Monto a Pagar</label>
                    <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-6 h-6" />
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0"
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-amber-500 outline-none text-xl font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 opacity-70">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['Efectivo', 'Aplicativo', 'Transferencia'].map(m => (
                            <button
                                key={m}
                                onClick={() => setMethod(m)}
                                className={`py-4 rounded-2xl border transition-all font-medium ${method === m ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4 pt-6">
                    <button 
                        onClick={() => setSelectedClient(null)}
                        className="flex-1 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handlePayment}
                        className="flex-1 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-5 h-5" />
                        Registrar Pago
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-zinc-400 p-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/50">
            <CreditCard className="w-20 h-20 mb-6 opacity-20" />
            <p className="text-lg text-center">Busque y seleccione un cliente para gestionar sus pagos</p>
          </div>
        )}
      </div>

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmDialog.action;
                  setConfirmDialog(null);
                  setTimeout(() => action(), 100);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
