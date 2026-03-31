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
  membership_type: 'Diario' | 'Interdiario';
  classification: string;
  price: number;
  total_classes: number;
  start_date: string;
  end_date: string;
  payment_method: 'Efectivo' | 'Aplicativo' | 'Transferencia';
  amount_paid: number;
  observations: string;
  created_at: string;
  updated_at: string;
  status: 'Active' | 'Frozen' | 'Expired' | 'Deleted';
  
  // Computed/Joined fields
  classes_used?: number;
  total_paid?: number;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  method: 'Efectivo' | 'Aplicativo' | 'Transferencia';
  date: string;
  user_id: number;
  user_name: string;
  type: 'Initial' | 'Debt' | 'Renewal';
  
  // Joined
  full_name?: string;
  code?: string;
}

export interface Attendance {
  id: string;
  client_id: string;
  date: string;
}
