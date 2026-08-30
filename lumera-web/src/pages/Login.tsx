import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log you in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20 md:py-28">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-2 text-center">Welcome Back</h1>
      <p className="text-espresso/50 text-sm text-center mb-10">Log in to your LUMÉRA account.</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-espresso/50">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-espresso/50">Password</label>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 pr-10 text-sm focus:outline-none focus:border-champagneDark"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-1 top-2.5 text-xs text-espresso/40 hover:text-espressoDark">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-espresso/60 cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-champagneDark w-4 h-4" />
            Remember me
          </label>
          <button type="button" onClick={() => alert('Password reset is not available in this demo yet.')} className="text-champagneDark hover:underline">
            Forgot password?
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-6 py-3.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-50">
          {loading ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <p className="text-center text-sm text-espresso/50 mt-8">
        New to LUMÉRA? <Link to="/signup" className="text-champagneDark hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
