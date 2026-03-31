import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit, Trash2, UserCheck, PartyPopper, X, Save, Calendar, Plus, RefreshCw, Download } from 'lucide-react';
import { Client } from '@/types';
import * as XLSX from 'xlsx';
import { formatPeruDate } from '@/lib/time';
import { addDays, format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx } from 'clsx';
import { storage } from '@/lib/storage';
import { Attendance } from '@/types';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

export default function AdminPanel() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const [isAttendanceCalendarOpen, setIsAttendanceCalendarOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedClientForCalendar, setSelectedClientForCalendar] = useState<Client | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, action: () => void, isAlert?: boolean, requirePin?: string, type?: 'danger' | 'warning' | 'default' } | null>(null);
  const [dialogPinInput, setDialogPinInput] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedClient) return;
    try {
      const dataUrl = await htmlToImage.toPng(printRef.current, { 
        backgroundColor: '#18181b', // zinc-900 background
        pixelRatio: 2
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Comprobante_${selectedClient.code}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Edit Form State
  const [editForm, setEditForm] = useState<Partial<Client> & { extra_days?: number, extra_classes?: number }>({});

  // Renewal Form State
  const [renewalForm, setRenewalForm] = useState({
    membership_type: 'Seleccionar',
    classification: 'Seleccionar',
    price: 0,
    total_classes: 0,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    payment_method: 'Seleccionar',
    amount_paid: 0,
    observations: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  // Logic for Renewal Membership/Classification
  useEffect(() => {
    let price = 0;
    let classes = 0;
    let endDate = '';

    const { membership_type, classification, start_date } = renewalForm;

    if (membership_type === 'Diario') {
      if (classification === '1 Mes') { price = 129; classes = 24; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === '3 Meses') { price = 299; classes = 72; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
      else if (classification === '6 Meses') { price = 399; classes = 144; endDate = addMonths(new Date(start_date), 6).toISOString().split('T')[0]; }
      else if (classification === '1 Año') { price = 599; classes = 336; endDate = addMonths(new Date(start_date), 12).toISOString().split('T')[0]; }
    } else if (membership_type === 'Interdiario') {
      if (classification === '1 Mes') { price = 99; classes = 12; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === '3 Meses') { price = 199; classes = 36; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
      else if (classification === '6 Meses') { price = 299; classes = 72; endDate = addMonths(new Date(start_date), 6).toISOString().split('T')[0]; }
      else if (classification === '1 Año') { price = 499; classes = 168; endDate = addMonths(new Date(start_date), 12).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 1M') { price = 99; classes = 12; endDate = addMonths(new Date(start_date), 1).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 2M') { price = 189; classes = 24; endDate = addMonths(new Date(start_date), 2).toISOString().split('T')[0]; }
      else if (classification === 'Aeróbicos 3M') { price = 265; classes = 36; endDate = addMonths(new Date(start_date), 3).toISOString().split('T')[0]; }
    }

    if (classification !== 'Personalizable' && classification !== 'Seleccionar') {
      setRenewalForm(prev => ({ ...prev, price, total_classes: classes, end_date: endDate }));
    } else if (classification === 'Seleccionar') {
      setRenewalForm(prev => ({ ...prev, price: 0, total_classes: 0, end_date: '' }));
    }
  }, [renewalForm.membership_type, renewalForm.classification, renewalForm.start_date]);

  const fetchClients = () => {
    try {
      const data = storage.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const filteredClients = clients
    .filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const handleDelete = (id: string) => {
    if (user?.role !== 'admin') return;
    setConfirmDialog({
      title: 'Eliminar Cliente',
      message: '¿Está seguro de eliminar este cliente? Esta acción no se puede deshacer.',
      action: () => {
        try {
          storage.deleteClient(id);
          if (activeClient?.id === id) setActiveClient(null);
          fetchClients();
        } catch (error) {
          alert('Error al eliminar');
        }
      }
    });
  };

  const handleMassDelete = () => {
    if (user?.role !== 'admin') return;
    setDialogPinInput('');
    setConfirmDialog({
      title: 'Eliminación Masiva',
      message: '¿Está seguro de eliminar TODOS los clientes del sistema? Esta acción borrará todos los registros de asistencias, pagos y clientes. NO se puede deshacer.',
      requirePin: 'masiva',
      action: () => {
        try {
          storage.massDeleteClients();
          setActiveClient(null);
          fetchClients();
        } catch (error) {
          alert('Error al eliminar masivamente');
        }
      }
    });
  };

  const handleAttendance = (client: Client) => {
    setConfirmDialog({
      title: 'Registrar Asistencia',
      message: `¿Desea registrar la asistencia de ${client.full_name}?`,
      action: () => {
        try {
          storage.createAttendance({
            id: crypto.randomUUID(),
            client_id: client.id,
            date: new Date().toISOString()
          });
          fetchClients();
        } catch (error) {
          alert('Error al registrar asistencia');
        }
      }
    });
  };

  const openRenewal = (client: Client) => {
    setSelectedClient(client);
    
    // Check if expired
    const isExpired = new Date(client.end_date) < new Date();
    const newStartDate = isExpired ? format(new Date(), 'yyyy-MM-dd') : format(addDays(new Date(client.end_date), 1), 'yyyy-MM-dd');

    setRenewalForm({
      membership_type: 'Seleccionar',
      classification: 'Seleccionar',
      price: 0,
      total_classes: 0,
      start_date: newStartDate,
      end_date: '',
      payment_method: 'Seleccionar',
      amount_paid: 0,
      observations: '',
    });
    setIsRenewalOpen(true);
  };

  const handleRenewal = async () => {
    if (!selectedClient) return;
    
    if (renewalForm.membership_type === 'Seleccionar' || renewalForm.classification === 'Seleccionar') {
      alert('Seleccione un tipo de membresía y clasificación válidos.');
      return;
    }

    setConfirmDialog({
      title: 'Confirmar Renovación',
      message: `¿Está seguro de renovar la membresía de ${selectedClient.full_name}?`,
      action: () => {
        try {
          const updates = {
            ...renewalForm,
            action_user: user?.name || 'System'
          };

          const res = storage.renewClient(selectedClient.id, updates);

          if (res.success) {
            setIsRenewalOpen(false);
            fetchClients();
            setConfirmDialog({
              title: 'Éxito',
              message: 'Renovación registrada correctamente',
              action: () => setConfirmDialog(null),
              isAlert: true
            });
          } else {
            alert(res.message || 'Error al renovar');
          }
        } catch (error) {
          console.error(error);
          alert('Error al procesar la renovación');
        }
      }
    });
  };

  const openEdit = (client: Client) => {
    setEditForm({ ...client, extra_days: 0, extra_classes: 0 });
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedClient) return;
    
    setConfirmDialog({
      title: 'Confirmar Edición',
      message: '¿Está seguro de guardar los cambios realizados?',
      action: () => {
        const updates = {
          full_name: editForm.full_name,
          phone: editForm.phone,
          email: editForm.email,
          start_date: editForm.start_date,
          end_date: editForm.end_date,
          total_classes: (editForm.total_classes || 0) + (editForm.extra_classes || 0),
          action_user: user?.name || 'System',
          extra_days: editForm.extra_days,
          extra_classes: editForm.extra_classes
        };

        // Mass Attendance
        if (editForm.mass_attendance && editForm.mass_attendance > 0) {
            for (let i = 0; i < editForm.mass_attendance; i++) {
                storage.createAttendance({
                    id: crypto.randomUUID(),
                    client_id: selectedClient.id,
                    date: new Date().toISOString() // All marked as today
                });
            }
        }

        try {
          storage.updateClient(selectedClient.id, updates);
          setIsEditOpen(false);
          fetchClients();
        } catch (error) {
          alert('Error al actualizar');
        }
      }
    });
  };

  const openAttendanceCalendar = (client: Client) => {
    try {
      const records = storage.getAttendance(client.id);
      setAttendanceRecords(records);
      setSelectedClientForCalendar(client);
      setCalendarMonth(new Date());
      setIsAttendanceCalendarOpen(true);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const renderAttendanceCalendar = () => {
    if (!selectedClientForCalendar) return null;

    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;
    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const startDayOfWeek = getDay(monthStart);
    // Adjust for Monday start (0 = Sunday, 1 = Monday, etc.)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = 0; i < adjustedStartDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-2 border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50"></div>);
    }

    while (day <= endDate) {
      for (let i = days.length; i < 7; i++) {
        if (day > endDate) {
            days.push(<div key={`empty-end-${i}`} className="p-2 border border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50"></div>);
        } else {
            formattedDate = format(day, dateFormat);
            const cloneDay = day;
            
            // Find attendances for this day
            const dayAttendances = attendanceRecords.filter(record => {
                const recordDate = new Date(record.date);
                return isSameDay(recordDate, cloneDay);
            });

            days.push(
              <div
                key={day.toString()}
                className={clsx(
                  "p-2 border border-zinc-100 dark:border-zinc-800/50 min-h-[80px] flex flex-col",
                  !isSameMonth(day, monthStart) ? "text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50" : "bg-white dark:bg-zinc-900",
                  isSameDay(day, new Date()) && "ring-2 ring-amber-500 ring-inset"
                )}
              >
                <div className="flex justify-between items-start">
                    <span className={clsx(
                        "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                        isSameDay(day, new Date()) ? "bg-amber-500 text-white" : "text-zinc-700 dark:text-zinc-300"
                    )}>
                        {formattedDate}
                    </span>
                </div>
                <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                    {dayAttendances.map((att, idx) => (
                        <div key={idx} className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            {format(new Date(att.date), 'HH:mm')}
                        </div>
                    ))}
                </div>
              </div>
            );
            day = addDays(day, 1);
        }
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
        <div className="w-full">
            <div className="grid grid-cols-7 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-zinc-500 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {rows}
            </div>
        </div>
    );
  };

  const exportConsolidatedReport = () => {
    const wb = XLSX.utils.book_new();
    
    const getDiffDays = (endDate: string) => {
        const endStr = endDate.includes('T') ? endDate : `${endDate}T12:00:00`;
        const end = new Date(endStr);
        const now = new Date();
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.ceil((endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Activos (Active, About to expire, or with Debt)
    const activosData = clients
      .filter(c => {
         const diffDays = getDiffDays(c.end_date);
         const debt = c.price - (c.amount_paid || 0);
         return diffDays >= 0 || debt > 0;
      })
      .map(c => ({
        'Código': c.code,
        'Cliente': c.full_name,
        'Teléfono': c.phone,
        'Plan': c.membership_type,
        'Clasificación': c.classification,
        'Fecha Inicio': formatPeruDate(c.start_date, 'dd/MM/yyyy'),
        'Fecha Vencimiento': formatPeruDate(c.end_date, 'dd/MM/yyyy'),
        'Deuda Pendiente': c.price - (c.amount_paid || 0),
        'Estado': getDiffDays(c.end_date) < 0 ? 'Vencido' : (getDiffDays(c.end_date) <= 5 ? 'Por Vencer' : 'Activo')
      }));
    const wsActivos = XLSX.utils.json_to_sheet(activosData);
    XLSX.utils.book_append_sheet(wb, wsActivos, "Activos");
    
    // Deudas (Same as Payments module)
    const deudasData = clients
      .filter(c => (c.price - (c.amount_paid || 0)) > 0)
      .map(c => ({
        'Código': c.code,
        'Cliente': c.full_name,
        'Teléfono': c.phone,
        'Plan': c.membership_type,
        'Fecha Vencimiento': formatPeruDate(c.end_date, 'dd/MM/yyyy'),
        'Deuda Pendiente': c.price - (c.amount_paid || 0),
        'Última Actualización': formatPeruDate(c.updated_at || c.created_at, 'dd/MM/yyyy HH:mm')
      }));
    const wsDeudas = XLSX.utils.json_to_sheet(deudasData);
    XLSX.utils.book_append_sheet(wb, wsDeudas, "Deudas");
    
    // Por Vencer (Expiring in <= 5 days or already expired)
    const porVencerData = clients
      .filter(c => getDiffDays(c.end_date) <= 5)
      .map(c => ({
        'Código': c.code,
        'Cliente': c.full_name,
        'Teléfono': c.phone,
        'Plan': c.membership_type,
        'Fecha Vencimiento': formatPeruDate(c.end_date, 'dd/MM/yyyy'),
        'Días Restantes': getDiffDays(c.end_date),
        'Estado': getDiffDays(c.end_date) < 0 ? 'Vencido' : 'Por Vencer'
      }));
    const wsPorVencer = XLSX.utils.json_to_sheet(porVencerData);
    XLSX.utils.book_append_sheet(wb, wsPorVencer, "Por Vencer");
    
    XLSX.writeFile(wb, `Reporte_Consolidado_${formatPeruDate(new Date().toISOString(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleSelectClient = (c: Client) => {
    setActiveClient(c);
    setSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    
    const endStr = c.end_date.includes('T') ? c.end_date : `${c.end_date}T12:00:00`;
    const end = new Date(endStr);
    const now = new Date();
    
    // Compare dates ignoring time
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = endDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const debt = c.price - (c.amount_paid || 0);
    const hasDebt = debt > 0;
    const isExpired = diffDays < 0;
    const isExpiring = diffDays >= 0 && diffDays <= 5;

    const showExpiredAlert = () => {
      setConfirmDialog({
        title: 'Membresía Vencida',
        message: `La membresía de ${c.full_name} venció hace ${Math.abs(diffDays)} día(s) (Fecha: ${formatPeruDate(end, 'dd/MM/yyyy')}).\n\nREALIZAR SEGUIMIENTO URGENTE EQUIPO DFIT`,
        action: () => {},
        isAlert: true,
        type: 'warning'
      });
    };

    const showExpiringAlert = () => {
      setConfirmDialog({
        title: 'Aviso de Vencimiento',
        message: `La membresía de ${c.full_name} vence en ${diffDays} día(s) (Fecha: ${formatPeruDate(end, 'dd/MM/yyyy')}).`,
        action: () => {},
        isAlert: true
      });
    };

    if (hasDebt) {
      setConfirmDialog({
        title: 'Deuda Pendiente',
        message: `El cliente ${c.full_name} tiene una deuda pendiente de S/ ${debt}.\n\nREALIZAR SEGUIMIENTO URGENTE EQUIPO DFIT`,
        action: () => {
          if (isExpired) showExpiredAlert();
          else if (isExpiring) showExpiringAlert();
        },
        isAlert: true,
        type: 'danger'
      });
    } else if (isExpired) {
      showExpiredAlert();
    } else if (isExpiring) {
      showExpiringAlert();
    }
  };

  const clientsByDate = (filterStartDate && filterEndDate) 
    ? clients.filter(c => {
        const clientDate = c.end_date.substring(0, 10);
        return clientDate >= filterStartDate && clientDate <= filterEndDate;
    })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-amber-500 uppercase">Administración</h2>
          {user?.role === 'admin' && (
            <button
              onClick={handleMassDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Eliminación Masiva
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col sm:flex-row items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => { setFilterStartDate(e.target.value); setActiveClient(null); setSearch(''); }}
                      className="bg-transparent outline-none text-sm text-zinc-900 dark:text-white w-full sm:w-auto"
                      title="Fecha inicio"
                  />
                </div>
                <span className="text-zinc-400 hidden sm:inline">-</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-zinc-400 sm:hidden">a</span>
                  <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => { setFilterEndDate(e.target.value); setActiveClient(null); setSearch(''); }}
                      className="bg-transparent outline-none text-sm text-zinc-900 dark:text-white w-full sm:w-auto"
                      title="Fecha fin"
                  />
                  {(filterStartDate || filterEndDate) && (
                      <button onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }} className="text-zinc-400 hover:text-red-500 ml-auto sm:ml-1">
                          <X className="w-4 h-4" />
                      </button>
                  )}
                </div>
            </div>
            {user?.role === 'admin' && (
                <button onClick={exportConsolidatedReport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors">
                    Reporte Consolidado
                </button>
            )}
        </div>
      </div>

      <div className="relative z-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveClient(null); setFilterStartDate(''); setFilterEndDate(''); }}
          onFocus={() => setActiveClient(null)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
        />
        {search && !activeClient && !(filterStartDate && filterEndDate) && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-h-60 overflow-y-auto">
            {filteredClients.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectClient(c)}
                className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
              >
                <div className="font-bold">{c.full_name}</div>
                <div className="text-xs opacity-60">{c.code}</div>
              </button>
            ))}
            {filteredClients.length === 0 && (
              <div className="p-4 text-center text-zinc-500">No se encontraron resultados</div>
            )}
          </div>
        )}
      </div>

      {filterStartDate && filterEndDate ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="font-bold text-zinc-900 dark:text-white">
              Clientes con vencimiento entre el {formatPeruDate(filterStartDate + 'T12:00:00', 'dd/MM/yyyy')} y {formatPeruDate(filterEndDate + 'T12:00:00', 'dd/MM/yyyy')} ({clientsByDate.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-zinc-900 dark:text-zinc-200">
              <thead className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Código</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Membresía</th>
                  <th className="px-6 py-4">Precio</th>
                  <th className="px-6 py-4">Deuda</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {clientsByDate.map(client => {
                  const debt = client.price - (client.amount_paid || 0);
                  const isExpired = new Date(client.end_date) < new Date();
                  return (
                    <tr key={client.id} className={clsx(
                      "transition-colors",
                      isExpired ? "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                    )}>
                      <td className="px-6 py-4 font-mono">{client.code}</td>
                      <td className="px-6 py-4 font-medium">{client.full_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{client.membership_type}</span>
                          <span className="text-xs opacity-60">{client.classification}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">S/ {client.price}</td>
                      <td className={clsx("px-6 py-4 font-medium", debt > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500")}>
                        S/ {debt}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openRenewal(client)} title="Renovación" className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-lg hover:bg-emerald-500/20">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => openAttendanceCalendar(client)} title="Ver Asistencias" className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 rounded-lg hover:bg-indigo-500/20">
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleSelectClient(client)} title="Ver Detalles" className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg hover:bg-amber-500/20">
                            Ver Detalles
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {clientsByDate.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No hay membresías que venzan en esta fecha
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeClient ? (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-900 dark:text-zinc-200">
            <thead className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Membresía</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4">Deuda</th>
                <th className="px-6 py-4">Clases (Total/Uso)</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {[clients.find(c => c.id === activeClient.id) || activeClient].map(client => {
                const debt = client.price - (client.amount_paid || 0);
                const isExpired = new Date(client.end_date) < new Date();
                return (
                  <tr key={client.id} className={clsx(
                    "transition-colors",
                    isExpired ? "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/70" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                  )}>
                    <td className="px-6 py-4 font-mono">{client.code}</td>
                    <td className="px-6 py-4 font-medium">{client.full_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span>{client.membership_type}</span>
                        <span className="text-xs opacity-60">{client.classification}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">S/ {client.price}</td>
                    <td className={clsx("px-6 py-4 font-medium", debt > 0 ? "text-red-600 dark:text-red-500" : "text-green-600 dark:text-green-500")}>
                      S/ {debt}
                    </td>
                    <td className="px-6 py-4">
                      {client.total_classes > 0 ? `${client.total_classes} / ${client.classes_used || 0}` : 'Ilimitado'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openRenewal(client)} title="Renovación" className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-lg hover:bg-emerald-500/20">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => openAttendanceCalendar(client)} title="Ver Asistencias" className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-500 rounded-lg hover:bg-indigo-500/20">
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleAttendance(client)} title="Asistencia" className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded-lg hover:bg-blue-500/20">
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(client)} title="Editar" className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg hover:bg-amber-500/20">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(client.id)} title="Eliminar" className="p-2 bg-red-500/10 text-red-600 dark:text-red-500 rounded-lg hover:bg-red-500/20">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedClient(client); setIsWelcomeOpen(true); }} 
                          title="Bienvenida" 
                          className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-500 rounded-lg hover:bg-purple-500/20"
                        >
                          <PartyPopper className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <p>Busque y seleccione un cliente para ver su información</p>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 rounded-2xl backdrop-blur-sm p-4">
          <div className={`bg-white dark:bg-zinc-800 p-6 rounded-xl max-w-sm w-full mx-4 border ${
            confirmDialog.type === 'danger' ? 'border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]' :
            confirmDialog.type === 'warning' ? 'border-2 border-amber-600 shadow-[0_0_30px_rgba(217,119,6,0.5)]' :
            'border-zinc-200 dark:border-zinc-700 shadow-2xl'
          }`}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6 whitespace-pre-wrap">{confirmDialog.message}</p>
            
            {confirmDialog.requirePin && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 opacity-70">Ingrese PIN de confirmación:</label>
                <input 
                  type="password"
                  value={dialogPinInput}
                  onChange={e => setDialogPinInput(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="PIN"
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!confirmDialog.isAlert && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.requirePin && dialogPinInput !== confirmDialog.requirePin) {
                    alert('PIN incorrecto');
                    return;
                  }
                  const action = confirmDialog.action;
                  setConfirmDialog(null);
                  setTimeout(() => action(), 100);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                {confirmDialog.isAlert ? 'Aceptar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold">Editar Cliente</h3>
                <button onClick={() => setIsEditOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-xs uppercase opacity-60 font-bold">Usuario Login</label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm opacity-70">Nombre</label>
                        <input 
                            value={editForm.full_name || ''} 
                            onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm opacity-70">Teléfono</label>
                        <input 
                            value={editForm.phone || ''} 
                            onChange={e => setEditForm({...editForm, phone: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-sm opacity-70">Correo</label>
                    <input 
                        value={editForm.email || ''} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm opacity-70">Fecha Inicio</label>
                        <input 
                            type="date"
                            value={editForm.start_date || ''} 
                            onChange={e => setEditForm({...editForm, start_date: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="text-sm opacity-70">Fecha Fin</label>
                        <input 
                            type="date"
                            value={editForm.end_date || ''} 
                            onChange={e => {
                                const newEndDate = e.target.value;
                                let extraDays = 0;
                                if (selectedClient?.end_date && newEndDate) {
                                    const end1 = new Date(selectedClient.end_date.includes('T') ? selectedClient.end_date : `${selectedClient.end_date}T12:00:00`);
                                    const end2 = new Date(newEndDate.includes('T') ? newEndDate : `${newEndDate}T12:00:00`);
                                    const diffTime = end2.getTime() - end1.getTime();
                                    extraDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                }
                                setEditForm({...editForm, end_date: newEndDate, extra_days: extraDays > 0 ? extraDays : 0});
                            }}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                        />
                    </div>
                </div>
                
                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-3">
                    <h4 className="text-sm font-bold text-amber-500 uppercase">Extensiones</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm opacity-70">Días Extra (Congelamiento)</label>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 opacity-50" />
                                <input 
                                    type="number"
                                    value={editForm.extra_days || ''} 
                                    onChange={e => {
                                        const extraDays = Number(e.target.value);
                                        let newEndDate = selectedClient?.end_date;
                                        if (selectedClient?.end_date && extraDays > 0) {
                                            const baseDate = new Date(selectedClient.end_date.includes('T') ? selectedClient.end_date : `${selectedClient.end_date}T12:00:00`);
                                            newEndDate = addDays(baseDate, extraDays).toISOString().split('T')[0];
                                        }
                                        setEditForm({...editForm, extra_days: extraDays, end_date: newEndDate});
                                    }}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm opacity-70">Clases Extra</label>
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 opacity-50" />
                                <input 
                                    type="number"
                                    value={editForm.extra_classes || ''} 
                                    onChange={e => setEditForm({...editForm, extra_classes: Number(e.target.value)})}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
                    <h4 className="text-sm font-bold text-blue-500 uppercase">Registro Masivo</h4>
                    <div>
                        <label className="text-sm opacity-70">Registrar Asistencias (Cantidad)</label>
                        <input 
                            type="number"
                            value={editForm.mass_attendance || ''} 
                            onChange={e => setEditForm({...editForm, mass_attendance: Number(e.target.value)})}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2"
                            placeholder="0"
                        />
                    </div>
                </div>
              </div>
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">Guardar Cambios</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Renewal Modal */}
      <AnimatePresence>
        {isRenewalOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  Renovación de Membresía
                </h3>
                <button onClick={() => setIsRenewalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                  <p className="text-sm text-zinc-500">Cliente</p>
                  <p className="font-bold text-lg">{selectedClient.full_name}</p>
                  <p className="text-sm opacity-70">Vencimiento actual: {formatPeruDate(selectedClient.end_date + 'T12:00:00', 'dd/MM/yyyy')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Usuario</label>
                    <input type="text" value={user?.name || ''} readOnly className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 opacity-70" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Tipo de Membresía</label>
                    <select
                      value={renewalForm.membership_type}
                      onChange={e => setRenewalForm({...renewalForm, membership_type: e.target.value, classification: 'Seleccionar'})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Seleccionar">Seleccionar</option>
                      <option value="Diario">Diario</option>
                      <option value="Interdiario">Interdiario</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Clasificación</label>
                    <select
                      value={renewalForm.classification}
                      onChange={e => setRenewalForm({...renewalForm, classification: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Seleccionar">Seleccionar</option>
                      {renewalForm.membership_type === 'Diario' && (
                        <>
                          <option value="1 Mes">1 Mes</option>
                          <option value="3 Meses">3 Meses</option>
                          <option value="6 Meses">6 Meses</option>
                          <option value="1 Año">1 Año</option>
                        </>
                      )}
                      {renewalForm.membership_type === 'Interdiario' && (
                        <>
                          <option value="1 Mes">1 Mes</option>
                          <option value="3 Meses">3 Meses</option>
                          <option value="6 Meses">6 Meses</option>
                          <option value="1 Año">1 Año</option>
                          <option value="Aeróbicos 1M">Aeróbicos 1M</option>
                          <option value="Aeróbicos 2M">Aeróbicos 2M</option>
                          <option value="Aeróbicos 3M">Aeróbicos 3M</option>
                        </>
                      )}
                      <option value="Personalizable">Personalizable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Precio</label>
                    <input
                      type="number"
                      value={renewalForm.price === 0 ? '' : renewalForm.price}
                      readOnly={renewalForm.classification !== 'Personalizable'}
                      onChange={e => setRenewalForm({...renewalForm, price: Number(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Cantidad de Clases</label>
                    <input
                      type="number"
                      value={renewalForm.total_classes === 0 ? '' : renewalForm.total_classes}
                      readOnly={renewalForm.classification !== 'Personalizable'}
                      onChange={e => setRenewalForm({...renewalForm, total_classes: Number(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Fecha Inicio</label>
                    <input
                      type="date"
                      value={renewalForm.start_date}
                      onChange={e => setRenewalForm({...renewalForm, start_date: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Fecha Fin</label>
                    <input
                      type="date"
                      value={renewalForm.end_date}
                      readOnly={renewalForm.classification !== 'Personalizable'}
                      onChange={e => setRenewalForm({...renewalForm, end_date: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Método de Pago</label>
                    <select
                      value={renewalForm.payment_method}
                      onChange={e => setRenewalForm({...renewalForm, payment_method: e.target.value})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Seleccionar">Seleccionar</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Aplicativo">Aplicativo</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 opacity-70">Monto Abonado</label>
                    <input
                      type="number"
                      value={renewalForm.amount_paid === 0 ? '' : renewalForm.amount_paid}
                      onChange={e => setRenewalForm({...renewalForm, amount_paid: Number(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 opacity-70">Observaciones</label>
                  <textarea
                    value={renewalForm.observations}
                    onChange={e => setRenewalForm({...renewalForm, observations: e.target.value})}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px]"
                  />
                </div>
              </div>
              
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                <button onClick={() => setIsRenewalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancelar</button>
                <button onClick={handleRenewal} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Renovar Membresía
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Calendar Modal */}
      <AnimatePresence>
        {isAttendanceCalendarOpen && selectedClientForCalendar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Calendario de Asistencias
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">{selectedClientForCalendar.full_name} ({selectedClientForCalendar.code})</p>
                </div>
                <button onClick={() => setIsAttendanceCalendarOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        &larr; Anterior
                    </button>
                    <h4 className="text-lg font-bold capitalize">
                        {format(calendarMonth, 'MMMM yyyy', { locale: es })}
                    </h4>
                    <button 
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Siguiente &rarr;
                    </button>
                </div>
                
                {renderAttendanceCalendar()}
                
                <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded"></div>
                        <span>Asistencia registrada</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 ring-2 ring-amber-500 rounded-full"></div>
                        <span>Día actual</span>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Welcome Modal */}
      <AnimatePresence>
        {isWelcomeOpen && selectedClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="bg-zinc-900 text-white w-full max-w-md rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden relative flex flex-col"
            >
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button onClick={handleDownloadPDF} title="Descargar PDF" className="p-2 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-amber-500/20 rounded-full transition-colors">
                        <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => setIsWelcomeOpen(false)} className="p-2 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-red-500/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div ref={printRef} className="p-8 bg-zinc-900 text-white">
                    {/* Header / Date */}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                            <PartyPopper className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-amber-500 mb-1">COMPROBANTE DFIT</h2>
                        <p className="opacity-70 text-sm">Fecha: {formatPeruDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    
                    <hr className="border-zinc-700 my-4" />
                    
                    {/* Client Info */}
                    <div className="flex justify-between items-center">
                        <span className="opacity-60">Cliente:</span>
                        <span className="font-bold text-lg text-right">{selectedClient.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="opacity-60">Código:</span>
                        <span className="font-mono font-bold text-amber-500">{selectedClient.code}</span>
                    </div>
                    
                    <hr className="border-zinc-700 my-4" />
                    
                    {/* Membership Info */}
                    <div className="flex justify-between items-center">
                        <span className="opacity-60">Membresía:</span>
                        <span className="font-bold text-right">{selectedClient.membership_type}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="opacity-60">Clasificación:</span>
                        <span className="font-bold text-right">{selectedClient.classification}</span>
                    </div>
                    
                    <hr className="border-zinc-700 my-4" />
                    
                    {/* Payment Info */}
                    <div className="flex justify-between items-center">
                        <span className="opacity-60">Precio:</span>
                        <span className="font-bold">S/ {selectedClient.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="opacity-60">Monto Abonado:</span>
                        <span className="font-bold text-emerald-500">S/ {(selectedClient.amount_paid || 0).toFixed(2)}</span>
                    </div>
                    
                    <hr className="border-zinc-700 my-4" />
                    
                    {/* Footer / Welcome */}
                    <div className="text-center mt-6">
                        <div className="inline-block bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                            Administración
                        </div>
                        <p className="text-sm opacity-80 leading-relaxed italic">
                            ¡Bienvenido a DFIT! Gracias por ser parte de la familia. Nuestro equipo estará cerca de ti para ayudarte a cumplir todos tus objetivos.
                        </p>
                    </div>
                </div>
                <div className="h-2 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
