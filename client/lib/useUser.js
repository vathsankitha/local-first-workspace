'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, clearUser, loadUser, saveUser } from './api';

const COLORS = ['#e4572e', '#0f6b6b', '#7a4fd6', '#c77d0a', '#2f7ed8', '#c2366b', '#4c8c2b'];

// undefined = still reading localStorage, null = signed out
export function useUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const u = loadUser();
    // verify the stored identity still exists on the server (e.g. DB was reset)
    if (!u) return setUser(null);
    api('/workspaces').then(() => setUser(u)).catch((e) => {
      if (/Not signed in/.test(e.message)) { clearUser(); setUser(null); } else setUser(u);
    });
  }, []);

  const login = useCallback(async (name, email) => {
    const u = await api('/login', { method: 'POST', body: { name, email } });
    const prev = loadUser();
    const color = prev?.id === u.id && prev.color ? prev.color : COLORS[Math.floor(Math.random() * COLORS.length)];
    const full = { id: u.id, name: u.name, email: u.email, color };
    saveUser(full);
    setUser(full);
  }, []);

  const logout = useCallback(() => { clearUser(); setUser(null); }, []);

  return { user, login, logout };
}
