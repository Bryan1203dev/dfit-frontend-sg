import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: number;
  name: string;
  role: 'admin' | 'morning' | 'afternoon';
  pin: string;
}

export interface Client {
  id: string;
  code: string;
  full_name: string;
  email: string;
  phone: string;
  membership_type: string;
  classification: string;
  price: number;
  total_classes: number;
  start_date: string;
  end_date: string;
  payment_method: string;
  amount_paid: number;
  observations: string;
  created_at: string;
  updated_at: string;
  status: string; // Active, Frozen, Expired, Deleted
  is_imported: number;
  classes_used?: number;
  total_paid?: number;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  method: string;
  date: string;
  user_id: number;
  user_name: string;
  type: string; // 'Initial', 'Debt', 'Renewal'
  is_imported: number;
}

export interface Attendance {
  id: string;
  client_id: string;
  date: string;
}

export interface Freeze {
  id: string;
  client_id: string;
  start_date: string;
  days: number;
  reason: string;
}

export interface ActionHistory {
  id: string;
  client_id: string;
  client_name: string;
  action_type: string;
  description: string;
  user_name: string;
  date: string;
}

const STORAGE_KEYS = {
  USERS: 'dfit_users',
  CLIENTS: 'dfit_clients',
  PAYMENTS: 'dfit_payments',
  ATTENDANCE: 'dfit_attendance',
  FREEZES: 'dfit_freezes',
  ACTION_HISTORY: 'dfit_action_history',
};

// Initialize default users if not exists
const initUsers = () => {
  const users = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!users) {
    const defaultUsers: User[] = [
      { id: 1, name: 'Administrador', role: 'admin', pin: '120390' },
      { id: 2, name: 'Colaborador Mañana', role: 'morning', pin: '1234' },
      { id: 3, name: 'Colaborador Tarde', role: 'afternoon', pin: '4567' },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }
};

// Helper to get data
const getData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper to save data
const saveData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- API Methods ---

export const storage = {
  init: () => {
    initUsers();
  },

  // Auth
  login: (pin: string): { success: boolean; user?: User; message?: string } => {
    const users = getData<User>(STORAGE_KEYS.USERS);
    const user = users.find((u) => u.pin === pin);
    if (user) {
      return { success: true, user };
    }
    return { success: false, message: 'PIN incorrecto' };
  },

  // Clients
  getClients: (): Client[] => {
    const clients = getData<Client>(STORAGE_KEYS.CLIENTS).filter(c => c.status !== 'Deleted');
    const attendance = getData<Attendance>(STORAGE_KEYS.ATTENDANCE);
    const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);

    return clients.map(client => {
      const classes_used = attendance.filter(a => a.client_id === client.id).length;
      const total_paid = payments.filter(p => p.client_id === client.id).reduce((sum, p) => sum + p.amount, 0);
      return { ...client, classes_used, total_paid };
    }).sort((a, b) => a.full_name.localeCompare(b.full_name));
  },

  getDeletedClients: (): Client[] => {
    return getData<Client>(STORAGE_KEYS.CLIENTS).filter(c => c.status === 'Deleted');
  },

  getNextClientCode: (): string => {
    const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
    const bClients = clients.filter(c => c.code.endsWith('B'));
    
    const usedNumbers = bClients
      .map(c => {
        const match = c.code.match(/^(\d+)B$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    let nextNum = 1;
    for (const num of usedNumbers) {
      if (num === nextNum) {
        nextNum++;
      } else if (num > nextNum) {
        break;
      }
    }

    return `${nextNum.toString().padStart(4, '0')}B`;
  },

  createClient: (clientData: any): { success: boolean; message?: string } => {
    try {
      const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
      const isImported = clientData.is_imported ? 1 : 0;
      
      const newClient: Client = {
        ...clientData,
        is_imported: isImported,
      };
      
      clients.push(newClient);
      saveData(STORAGE_KEYS.CLIENTS, clients);

      if (clientData.amount_paid > 0) {
        const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);
        payments.push({
          id: uuidv4(),
          client_id: newClient.id,
          amount: newClient.amount_paid,
          method: newClient.payment_method,
          date: newClient.created_at,
          user_id: clientData.created_by_id || 0,
          user_name: clientData.created_by_name || 'System',
          type: 'Initial',
          is_imported: isImported
        });
        saveData(STORAGE_KEYS.PAYMENTS, payments);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  updateClient: (id: string, updates: any): { success: boolean; message?: string } => {
    try {
      const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
      const index = clients.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Client not found');

      const oldClient = clients[index];
      const { action_user, extra_days, extra_classes, ...clientUpdates } = updates;
      
      clients[index] = { ...oldClient, ...clientUpdates };
      saveData(STORAGE_KEYS.CLIENTS, clients);

      const descriptionParts = [];
      if (
        clientUpdates.full_name !== oldClient.full_name ||
        clientUpdates.phone !== oldClient.phone ||
        clientUpdates.email !== oldClient.email
      ) {
        descriptionParts.push('Actualización de datos');
      }
      
      if (extra_days) {
        descriptionParts.push(`Extensión de ${extra_days} días (Congelamiento)`);
      }
      if (extra_classes) {
        descriptionParts.push(`${extra_classes} clases extra`);
      }

      const description = descriptionParts.join(' + ');

      if (action_user && description) {
        const history = getData<ActionHistory>(STORAGE_KEYS.ACTION_HISTORY);
        history.push({
          id: uuidv4(),
          client_id: id,
          client_name: clients[index].full_name,
          action_type: 'Update',
          description,
          user_name: action_user,
          date: new Date().toISOString()
        });
        saveData(STORAGE_KEYS.ACTION_HISTORY, history);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  renewClient: (id: string, renewalData: any): { success: boolean; message?: string } => {
    try {
      const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
      const index = clients.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Client not found');

      const currentClient = clients[index];
      const currentDebt = currentClient.price - currentClient.amount_paid;
      
      let finalObservations = renewalData.observations || '';
      if (currentDebt > 0) {
        finalObservations = `[Deuda anterior pendiente: S/ ${currentDebt}] ${finalObservations}`.trim();
      }

      clients[index] = {
        ...currentClient,
        membership_type: renewalData.membership_type,
        classification: renewalData.classification,
        price: renewalData.price,
        total_classes: renewalData.total_classes,
        start_date: renewalData.start_date,
        end_date: renewalData.end_date,
        payment_method: renewalData.payment_method,
        amount_paid: renewalData.amount_paid,
        observations: finalObservations,
        updated_at: new Date().toISOString()
      };
      saveData(STORAGE_KEYS.CLIENTS, clients);

      if (renewalData.amount_paid > 0) {
        const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);
        payments.push({
          id: uuidv4(),
          client_id: id,
          amount: renewalData.amount_paid,
          method: renewalData.payment_method,
          date: new Date().toISOString(),
          user_id: 0,
          user_name: renewalData.action_user,
          type: 'Renewal',
          is_imported: 0
        });
        saveData(STORAGE_KEYS.PAYMENTS, payments);
      }

      const history = getData<ActionHistory>(STORAGE_KEYS.ACTION_HISTORY);
      const debtText = currentDebt > 0 ? ` (Deuda anterior pendiente: S/ ${currentDebt})` : '';
      history.push({
        id: uuidv4(),
        client_id: id,
        client_name: clients[index].full_name,
        action_type: 'Renovación',
        description: `Renovación de membresía: ${renewalData.membership_type} - ${renewalData.classification}. Inicio: ${renewalData.start_date}, Fin: ${renewalData.end_date}${debtText}`,
        user_name: renewalData.action_user,
        date: new Date().toISOString()
      });
      saveData(STORAGE_KEYS.ACTION_HISTORY, history);

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  deleteClient: (id: string): { success: boolean; message?: string } => {
    try {
      const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
      const newClients = clients.filter(c => c.id !== id);
      saveData(STORAGE_KEYS.CLIENTS, newClients);

      const attendance = getData<Attendance>(STORAGE_KEYS.ATTENDANCE).filter(a => a.client_id !== id);
      saveData(STORAGE_KEYS.ATTENDANCE, attendance);

      const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS).filter(p => p.client_id !== id);
      saveData(STORAGE_KEYS.PAYMENTS, payments);

      const freezes = getData<Freeze>(STORAGE_KEYS.FREEZES).filter(f => f.client_id !== id);
      saveData(STORAGE_KEYS.FREEZES, freezes);

      const history = getData<ActionHistory>(STORAGE_KEYS.ACTION_HISTORY).filter(h => h.client_id !== id);
      saveData(STORAGE_KEYS.ACTION_HISTORY, history);

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  massDeleteClients: (): { success: boolean; message?: string } => {
    try {
      saveData(STORAGE_KEYS.CLIENTS, []);
      saveData(STORAGE_KEYS.ATTENDANCE, []);
      saveData(STORAGE_KEYS.PAYMENTS, []);
      saveData(STORAGE_KEYS.FREEZES, []);
      saveData(STORAGE_KEYS.ACTION_HISTORY, []);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Payments
  getPayments: (): Payment[] => {
    return getData<Payment>(STORAGE_KEYS.PAYMENTS).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  createPayment: (paymentData: any): { success: boolean; message?: string } => {
    try {
      const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);
      payments.push({
        ...paymentData,
        is_imported: paymentData.is_imported ? 1 : 0
      });
      saveData(STORAGE_KEYS.PAYMENTS, payments);

      const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
      const clientIndex = clients.findIndex(c => c.id === paymentData.client_id);
      if (clientIndex !== -1) {
        clients[clientIndex].amount_paid += paymentData.amount;
        saveData(STORAGE_KEYS.CLIENTS, clients);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Attendance
  getAttendance: (clientId: string): Attendance[] => {
    return getData<Attendance>(STORAGE_KEYS.ATTENDANCE)
      .filter(a => a.client_id === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  createAttendance: (attendanceData: any): { success: boolean; message?: string } => {
    try {
      const attendance = getData<Attendance>(STORAGE_KEYS.ATTENDANCE);
      attendance.push(attendanceData);
      saveData(STORAGE_KEYS.ATTENDANCE, attendance);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Action History
  getActionHistory: (): ActionHistory[] => {
    return getData<ActionHistory>(STORAGE_KEYS.ACTION_HISTORY)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);
  },

  // Stats
  getDailyStats: (date: string): { newMemberships: any[], newPayments: any[] } => {
    const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
    const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);
    const actionHistory = getData<ActionHistory>(STORAGE_KEYS.ACTION_HISTORY);
    const users = getData<User>(STORAGE_KEYS.USERS);

    const targetDate = date.split('T')[0];

    const newMemberships = clients.filter(c => {
      if (c.status === 'Deleted' || c.is_imported) return false;
      const createdDate = c.created_at.split('T')[0];
      if (createdDate === targetDate) return true;
      
      const hasRenewalToday = actionHistory.some(ah => 
        ah.client_id === c.id && 
        ah.action_type === 'Renovación' && 
        ah.date.split('T')[0] === targetDate
      );
      return hasRenewalToday;
    });

    const newPayments = payments.filter(p => {
      if (p.is_imported || p.type === 'Initial' || p.type === 'Renewal') return false;
      const paymentDate = p.date.split('T')[0];
      return paymentDate === targetDate;
    }).map(p => {
      const client = clients.find(c => c.id === p.client_id);
      const user = users.find(u => u.id === p.user_id);
      return {
        ...p,
        full_name: client?.full_name || 'Desconocido',
        code: client?.code || 'N/A',
        user_name: user?.name || 'Desconocido'
      };
    });

    return { newMemberships, newPayments };
  },

  getConsolidatedStats: (filter: string): any[] => {
    const clients = getData<Client>(STORAGE_KEYS.CLIENTS);
    const payments = getData<Payment>(STORAGE_KEYS.PAYMENTS);
    const now = new Date();

    const isMatch = (dateStr: string) => {
      if (filter === 'all') return true;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (filter === 'day') {
        return date.toDateString() === now.toDateString();
      } else if (filter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } else if (filter === 'quarter') {
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return date >= quarterStart;
      } else if (filter === 'year') {
        return date.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const newClientsEvents = clients
      .filter(c => c.status !== 'Deleted' && !c.is_imported && isMatch(c.created_at))
      .map(c => ({
        id: c.id,
        membership_type: c.membership_type,
        classification: c.classification,
        payment_method: c.payment_method,
        amount_paid: c.amount_paid,
        price: c.price,
        event_date: c.created_at,
        event_type: 'New'
      }));

    const renewalEvents = payments
      .filter(p => p.type === 'Renewal' && !p.is_imported && isMatch(p.date))
      .map(p => {
        const c = clients.find(client => client.id === p.client_id);
        if (!c) return null;
        return {
          id: c.id,
          membership_type: c.membership_type,
          classification: c.classification,
          payment_method: p.method,
          amount_paid: p.amount,
          price: c.price,
          event_date: p.date,
          event_type: 'Renewal'
        };
      }).filter(Boolean);

    return [...newClientsEvents, ...renewalEvents];
  }
};
