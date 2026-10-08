export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/collab';

const STORAGE_KEY = 'lfw_user';

export function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function saveUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}
export function clearUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function api(path, { method = 'GET', body } = {}) {
  const user = loadUser();
  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(user ? { 'x-user-id': user.id } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Is it running on port 4000?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
