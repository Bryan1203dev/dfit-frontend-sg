import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import Login from '@/components/Login';
import Layout from '@/components/Layout';
import RegisterClient from '@/components/RegisterClient';
import AdminPanel from '@/components/AdminPanel';
import Payments from '@/components/Payments';
import Monitoring from '@/components/Monitoring';
import FinancialControl from '@/components/FinancialControl';
import Consolidated from '@/components/Consolidated';

export default function App() {
  const user = useAuthStore((state) => state.user);
  const [activeModule, setActiveModule] = useState('register');

  if (!user) {
    return <Login />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'register': return <RegisterClient />;
      case 'admin': return <AdminPanel />;
      case 'payments': return <Payments />;
      case 'monitoring': return <Monitoring />;
      case 'financial': return <FinancialControl />;
      case 'consolidated': return <Consolidated />;
      default: return <RegisterClient />;
    }
  };

  return (
    <Layout activeModule={activeModule} setActiveModule={setActiveModule}>
      {renderModule()}
    </Layout>
  );
}
