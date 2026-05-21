import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, MessageSquare, Loader as Loader2 } from 'lucide-react';
import { customerAuthApi } from '../../services/customerApi';
import { useCustomerAuth } from '../../hooks/useCustomerAuth';
import './CustomerAuth.css';

export function CustomerLogin() {
  const { login } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, customer } = await customerAuthApi.login(email, password);
      login(token, customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth">
      <div className="customer-auth__card">
        <div className="customer-auth__logo">
          <div className="customer-auth__logo-icon">
            <MessageSquare size={28} />
          </div>
          <span>OpenWA</span>
        </div>

        <h1 className="customer-auth__title">Welcome back</h1>
        <p className="customer-auth__subtitle">Sign in to manage your WhatsApp conversations</p>

        <form onSubmit={handleSubmit} className="customer-auth__form">
          <div className="customer-auth__field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="customer-auth__field">
            <label htmlFor="password">Password</label>
            <div className="customer-auth__password-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
              <button type="button" className="customer-auth__pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="customer-auth__error">{error}</div>}

          <button type="submit" className="customer-auth__submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="customer-auth__switch">
          Don't have an account?{' '}
          <Link to="/customer/register">Create one free</Link>
        </p>
      </div>
    </div>
  );
}
