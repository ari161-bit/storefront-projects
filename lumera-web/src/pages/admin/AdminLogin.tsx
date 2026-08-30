import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log you in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory px-5">
      <div className="w-full max-w-sm bg-cream border border-espresso/10 rounded-2xl shadow-card p-8">
        <p className="font-serif-display text-2xl tracking-[0.14em] text-espressoDark mb-1 text-center">LUMÉRA</p>
        <p className="text-xs uppercase tracking-wide text-champagneDark text-center mb-8">Admin Dashboard</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-espresso/50">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-6 py-3 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-50">
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
