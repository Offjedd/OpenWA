import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgencyAuth } from '../hooks/useAgencyAuth';

export const AgencyLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAgencyAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      navigate(result.redirectTo ?? '/agency');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '20px',
    } as React.CSSProperties,
    card: {
      width: '100%',
      maxWidth: '400px',
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e5e5',
      padding: '40px 32px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    } as React.CSSProperties,
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#7c3aed',
      marginBottom: '8px',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    subtitle: {
      fontSize: '14px',
      color: '#666666',
      textAlign: 'center' as const,
      marginBottom: '32px',
    } as React.CSSProperties,
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    } as React.CSSProperties,
    formGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '6px',
    } as React.CSSProperties,
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#1a1a1a',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid #e5e5e5',
      borderRadius: '8px',
      fontFamily: 'inherit',
      transition: 'all 0.2s',
      boxSizing: 'border-box' as const,
      outline: 'none',
    } as React.CSSProperties,
    inputFocus: {
      borderColor: '#7c3aed',
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
    } as React.CSSProperties,
    submitButton: {
      width: '100%',
      padding: '10px 16px',
      marginTop: '8px',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,
    submitButtonHover: {
      backgroundColor: '#6d28d9',
    } as React.CSSProperties,
    submitButtonDisabled: {
      backgroundColor: '#d1d5db',
      cursor: 'not-allowed',
      opacity: 0.6,
    } as React.CSSProperties,
    errorMessage: {
      padding: '10px 12px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#dc2626',
      marginBottom: '16px',
    } as React.CSSProperties,
    footer: {
      marginTop: '24px',
      textAlign: 'center' as const,
      fontSize: '13px',
      color: '#666666',
    } as React.CSSProperties,
    link: {
      color: '#7c3aed',
      textDecoration: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'color 0.2s',
    } as React.CSSProperties,
    linkHover: {
      color: '#6d28d9',
    } as React.CSSProperties,
  };

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>AgencyOS</h1>
        <p style={styles.subtitle}>Sign in to your agency</p>

        {error && <div style={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.input,
                ...(focusedField === 'email' ? styles.inputFocus : {}),
              }}
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              style={{
                ...styles.input,
                ...(focusedField === 'password' ? styles.inputFocus : {}),
              }}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            onMouseEnter={() => setHoveredButton(true)}
            onMouseLeave={() => setHoveredButton(false)}
            style={{
              ...styles.submitButton,
              ...(hoveredButton && !isLoading ? styles.submitButtonHover : {}),
              ...(isLoading ? styles.submitButtonDisabled : {}),
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          Don't have an account?{' '}
          <a
            href="/agency/register"
            style={styles.link}
            onMouseEnter={(e) => {
              (e.target as HTMLAnchorElement).style.color = '#6d28d9';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLAnchorElement).style.color = '#7c3aed';
            }}
          >
            Register here
          </a>
        </div>
      </div>
    </div>
  );
};

export default AgencyLogin;
