import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { motion } from 'motion/react';
import { Save, RefreshCw, Upload, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { format, addMonths, addDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export default function RegisterClient() {
  const { user } = useAuthStore();
  
  const initialForm = {
    code: '',
    full_name: '',
    email: '',
    phone: '',
    membership_type: 'Seleccionar',
    classification: 'Seleccionar',
    price: 0,
    total_classes: 0,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    payment_method: 'Seleccionar',
    amount_paid: 0,
    observations: '',
  };

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, action: () => void } | null>(null);

  // Logic for Membership/Classification
  useEffect(() => {
    let price = 0;
    let classes = 0;
    let endDate = '';
    let error = '';

    const { membership_type, classification, start_date } = form;

    if (membership_type === 'Diario') {
      if (classification === '1 Mes') { price = 129; classes = 24; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === '3 Meses') { price = 299; classes = 72; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
      else if (classification === '6 Meses') { price = 399; classes = 144; endDate = addMonths(new Date(start_date), 6).toISOString().split('T')[0]; }
      else if (classification === '1 Año') { price = 599; classes = 336; endDate = addMonths(new Date(start_date), 12).toISOString().split('T')[0]; }
      else if (classification.includes('Aeróbicos')) {
        error = 'Clasificación no permitida en Membresías Diarias';
      }
    } else if (membership_type === 'Interdiario') {
      if (classification === '1 Mes') { price = 99; classes = 12; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === '3 Meses') { price = 199; classes = 36; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
      else if (classification === '6 Meses') { price = 299; classes = 72; endDate = addMonths(new Date(start_date), 6).toISOString().split('T')[0]; }
      else if (classification === '1 Año') { price = 499; classes = 168; endDate = addMonths(new Date(start_date), 12).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 1M') { price = 99; classes = 12; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 2M') { price = 189; classes = 24; endDate = addMonths(new Date(start_date), 2).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 3M') { price = 265; classes = 36; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
    }

    if (error) {
      setMessage({ type: 'error', text: error });
      setForm(prev => ({ ...prev, classification: 'Seleccionar', price: 0, total_classes: 0, end_date: '' }));
      return;
    }

    if (classification !== 'Personalizable' && classification !== 'Seleccionar') {
      setForm(prev => ({ ...prev, price, total_classes: classes, end_date: endDate }));
    } else if (classification === 'Seleccionar') {
      setForm(prev => ({ ...prev, price: 0, total_classes: 0, end_date: '' }));
    }
    
  }, [form.membership_type, form.classification, form.start_date]);

  const generateCode = async () => {
    try {
        const res = await fetch('/api/clients/next-code');
        if (!res.ok) throw new Error('Error fetching code');
        const data = await res.json();
        if (data.code) {
            setForm(prev => ({ ...prev, code: data.code }));
            setMessage(null);
        } else {
            setMessage({ type: 'error', text: 'No se pudo generar el código' });
        }
    } catch (error) {
        console.error('Error generating code', error);
        setMessage({ type: 'error', text: 'Error al generar código. Intente nuevamente.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.code || !form.full_name || !form.phone) {
      setMessage({ type: 'error', text: 'Por favor complete los campos obligatorios (Código, Nombre, Teléfono)' });
      return;
    }

    if (form.payment_method === 'Seleccionar') {
        setMessage({ type: 'error', text: 'Por favor seleccione un método de pago' });
        return;
    }

    if (form.membership_type === 'Seleccionar') {
        setMessage({ type: 'error', text: 'Por favor seleccione un tipo de membresía' });
        return;
    }

    if (form.classification === 'Seleccionar') {
        setMessage({ type: 'error', text: 'Por favor seleccione una clasificación' });
        return;
    }

    if (form.amount_paid === undefined || form.amount_paid === null) {
        setMessage({ type: 'error', text: 'Por favor ingrese el monto abonado' });
        return;
    }

    setConfirmDialog({
      title: 'Confirmar Registro',
      message: '¿Está seguro de registrar al cliente?',
      action: async () => {
        setLoading(true);
        try {
          const payload = {
              ...form,
              id: uuidv4(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by_id: user?.id || 0,
              created_by_name: user?.name || 'Unknown'
          };

          const res = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          const data = await res.json();

          if (data.success) {
            setMessage({ type: 'success', text: 'Cliente registrado exitosamente' });
            setForm({ ...initialForm, start_date: form.start_date });
          } else {
            setMessage({ type: 'error', text: data.message || 'Error al registrar' });
          }
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleClear = () => {
    setConfirmDialog({
      title: 'Limpiar Formulario',
      message: '¿Desea limpiar el formulario?',
      action: () => {
        setForm(prev => ({ ...initialForm, start_date: prev.start_date }));
        setMessage(null);
      }
    });
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Codigo Cliente': '1234B',
        'Nombre Completo': 'Juan Perez',
        'Telefono': '987654321',
        'Correo Electronico': 'juan@example.com',
        'Tipo Membresia': 'Diario',
        'Clasificacion': '1 Mes',
        'Precio': 129,
        'Clases': 24,
        'Fecha Inicio': '01/01/2024',
        'Fecha Fin': '',
        'Metodo Pago': 'Efectivo',
        'Monto Abonado': 129,
        'Observaciones': 'Sin observaciones'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    XLSX.writeFile(wb, 'plantilla_clientes.xlsx');
  };

  const parseDate = (dateStr: string | number) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (typeof dateStr === 'number') {
      // Excel date number
      const date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    const str = dateStr.toString().trim();
    // Try DD/MM/YYYY or DD-MM-YYYY
    const parts = str.includes('/') ? str.split('/') : str.split('-');
    if (parts.length === 3) {
      // If year is first (YYYY/MM/DD)
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // If year is last (DD/MM/YYYY)
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    return new Date().toISOString().split('T')[0];
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmDialog({
      title: 'Importar Clientes',
      message: `¿Está seguro de importar clientes desde el archivo ${file.name}?`,
      action: () => {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          setLoading(true);
          let successCount = 0;
          let skippedCount = 0;

          for (const row of data as any[]) {
              try {
                  const code = row['Codigo Cliente']?.toString().trim();
                  const fullName = row['Nombre Completo']?.toString().trim();
                  const membershipType = row['Tipo Membresia']?.toString().trim();
                  const classification = row['Clasificacion']?.toString().trim();
                  const price = row['Precio'];
                  const classes = row['Clases'];
                  const startDateRaw = row['Fecha Inicio'];
                  const paymentMethod = row['Metodo Pago']?.toString().trim();
                  const amountPaid = row['Monto Abonado'];

                  // Validate mandatory fields
                  if (!code || !fullName || !membershipType || !classification || price === undefined || classes === undefined || !startDateRaw || !paymentMethod || amountPaid === undefined) {
                      skippedCount++;
                      continue;
                  }

                  const startDate = parseDate(startDateRaw);
                  
                  // Calculate end date based on classification
                  let endDate = '';
                  const mLower = membershipType.toLowerCase();
                  const cLower = classification.toLowerCase();
                  
                  if (mLower === 'diario') {
                    if (cLower === '1 mes') endDate = addMonths(new Date(startDate), 1).toISOString().split('T')[0];
                    else if (cLower === '3 meses') endDate = addMonths(new Date(startDate), 3).toISOString().split('T')[0];
                    else if (cLower === '6 meses') endDate = addMonths(new Date(startDate), 6).toISOString().split('T')[0];
                    else if (cLower === '1 año') endDate = addMonths(new Date(startDate), 12).toISOString().split('T')[0];
                  } else if (mLower === 'interdiario') {
                    if (cLower === '1 mes') endDate = addMonths(new Date(startDate), 1).toISOString().split('T')[0];
                    else if (cLower === '3 meses') endDate = addMonths(new Date(startDate), 3).toISOString().split('T')[0];
                    else if (cLower === '6 meses') endDate = addMonths(new Date(startDate), 6).toISOString().split('T')[0];
                    else if (cLower === '1 año') endDate = addMonths(new Date(startDate), 12).toISOString().split('T')[0];
                    else if (cLower === 'aeróbicos 1m' || cLower === 'aerobicos 1m') endDate = addMonths(new Date(startDate), 1).toISOString().split('T')[0];
                    else if (cLower === 'aeróbicos 2m' || cLower === 'aerobicos 2m') endDate = addMonths(new Date(startDate), 2).toISOString().split('T')[0];
                    else if (cLower === 'aeróbicos 3m' || cLower === 'aerobicos 3m') endDate = addMonths(new Date(startDate), 3).toISOString().split('T')[0];
                  }

                  const client = {
                      ...initialForm,
                      code: code,
                      full_name: fullName,
                      phone: row['Telefono']?.toString() || '',
                      email: row['Correo Electronico'] || '',
                      membership_type: membershipType,
                      classification: classification,
                      price: Number(price),
                      total_classes: Number(classes),
                      start_date: startDate,
                      end_date: endDate,
                      payment_method: paymentMethod,
                      amount_paid: Number(amountPaid),
                      observations: row['Observaciones'] || '',
                      id: uuidv4(),
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      created_by_id: user?.id,
                      created_by_name: user?.name,
                      is_imported: true
                  };
                  
                  const res = await fetch('/api/clients', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(client),
                  });
                  
                  if (res.ok) {
                    successCount++;
                  } else {
                    console.error('Error importing row:', await res.json());
                    skippedCount++;
                  }
              } catch (err) {
                  console.error(err);
                  skippedCount++;
              }
          }
          setLoading(false);
          setMessage({ type: 'success', text: `Se importaron ${successCount} clientes exitosamente. Se omitieron ${skippedCount} filas inválidas.` });
          // Reset file input
          e.target.value = '';
        };
        reader.readAsBinaryString(file);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-amber-500 uppercase">Registro de Clientes</h2>
        {user?.role === 'admin' && (
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" /> Descargar Plantilla
            </button>
            <div className="relative">
              <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleImport} 
                  className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm pointer-events-none">
                  <Upload className="w-4 h-4" /> Importar Masivo
              </button>
            </div>
          </div>
        )}
      </div>

      <motion.form 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 relative"
      >
        {/* Custom Confirm Dialog */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-amber-500 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.3)] bg-zinc-900 overflow-hidden">
                <img src="/assets/DFIT_LOGO.jpeg" alt="DFIT Logo" className="w-full h-full object-cover rounded-full" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-300 mb-6">{confirmDialog.message}</p>
              <div className="flex justify-center gap-3">
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
                    confirmDialog.action();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={clsx("p-4 mb-6 rounded-lg", message.type === 'success' ? "bg-green-500/10 text-green-600 dark:text-green-500" : "bg-red-500/10 text-red-600 dark:text-red-500")}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Code */}
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Código Cliente *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.code || ''}
                onChange={e => setForm({...form, code: e.target.value})}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
                placeholder="0000B"
                required
              />
              <button
                type="button"
                onClick={generateCode}
                className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shrink-0"
                title="Generar Código"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Nombre Completo *</label>
            <input
              type="text"
              value={form.full_name || ''}
              onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
              required
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Teléfono (9 dígitos) *</label>
            <input
              type="number"
              value={form.phone || ''}
              onChange={e => {
                if (e.target.value.length <= 9) setForm({...form, phone: e.target.value})
              }}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Correo Electrónico</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            />
          </div>

          {/* Membership */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Tipo de Membresía</label>
            <select
              value={form.membership_type}
              onChange={e => setForm({...form, membership_type: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            >
              <option value="Seleccionar">Seleccionar</option>
              <option value="Diario">Diario</option>
              <option value="Interdiario">Interdiario</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Clasificación</label>
            <select
              value={form.classification}
              onChange={e => setForm({...form, classification: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            >
              <option value="Seleccionar">Seleccionar</option>
              <option value="1 Mes">1 Mes</option>
              <option value="3 Meses">3 Meses</option>
              <option value="6 Meses">6 Meses</option>
              <option value="1 Año">1 Año</option>
              <option value="Aeróbicos 1M">Aeróbicos 1M</option>
              <option value="Aeróbicos 2M">Aeróbicos 2M</option>
              <option value="Aeróbicos 3M">Aeróbicos 3M</option>
              <option value="Personalizable">Personalizable</option>
            </select>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Precio</label>
            <input
              type="number"
              value={form.price === 0 ? '' : form.price}
              readOnly={form.classification !== 'Personalizable'}
              onChange={e => setForm({...form, price: Number(e.target.value)})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Cantidad de Clases</label>
            <input
              type="number"
              value={form.total_classes === 0 ? '' : form.total_classes}
              readOnly={form.classification !== 'Personalizable'}
              onChange={e => setForm({...form, total_classes: Number(e.target.value)})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Fecha Inicio</label>
            <input
              type="date"
              value={form.start_date || ''}
              onChange={e => setForm({...form, start_date: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Fecha Fin</label>
            <input
              type="date"
              value={form.end_date || ''}
              readOnly
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none opacity-50 text-zinc-900 dark:text-white"
            />
          </div>

          {/* Payment */}
          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Método de Pago *</label>
            <select
              value={form.payment_method}
              onChange={e => setForm({...form, payment_method: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
              required
            >
              <option value="Seleccionar">Seleccionar</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Aplicativo">Aplicativo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Monto Abonado *</label>
            <input
              type="number"
              value={form.amount_paid === 0 ? '' : form.amount_paid}
              onChange={e => setForm({...form, amount_paid: Number(e.target.value)})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium mb-2 opacity-70 text-zinc-700 dark:text-zinc-300">Observaciones</label>
            <textarea
              value={form.observations || ''}
              onChange={e => setForm({...form, observations: e.target.value})}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none h-24 resize-none text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-medium text-zinc-900 dark:text-white"
          >
            Limpiar Registros
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Registrando...' : 'Registrar Cliente'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
