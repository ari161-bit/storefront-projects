import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password, confirmPassword);
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-20 md:py-28">
      <h1 className="font-serif-display text-4xl text-espressoDark mb-2 text-center">Create Your Account</h1>
      <p className="text-espresso/50 text-sm text-center mb-10">Join LUMÉRA for faster checkout and order history.</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-espresso/50">Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
        </div>
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
        <div>
          <label className="text-[11px] uppercase tracking-wide text-espresso/50">Confirm Password</label>
          <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? 'text' : 'password'} className="w-full border-b border-espresso/20 bg-transparent px-1 py-2.5 text-sm focus:outline-none focus:border-champagneDark" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full px-6 py-3.5 rounded-full bg-espressoDark text-ivory text-sm uppercase tracking-wide hover:bg-espresso transition-colors disabled:opacity-50">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-espresso/50 mt-8">
        Already have an account? <Link to="/login" className="text-champagneDark hover:underline">Log in</Link>
      </p>
    </div>
  );
}
