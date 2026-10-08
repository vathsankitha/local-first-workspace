'use client';
import { useUser } from '@/lib/useUser';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { user, login, logout } = useUser();
  if (user === undefined) return <div className="center muted">Loading…</div>;
  if (!user) return <Login onLogin={login} />;
  return <Dashboard user={user} onLogout={logout} />;
}
