import { JSX, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Register(): JSX.Element {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({ username: username.trim(), email: email.trim().toLowerCase(), password })
      setSuccess('Account created! Redirecting to login...')
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      const msg = err.response?.data?.error
      setError(msg || err.message || 'Registration failed. Username or email may already be taken.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '40px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0' }}>Create Account</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Register to join the compliance platform
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--warning-subtle)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: '12px', marginBottom: '16px' }}>
          <strong>Note:</strong> New accounts default to the Author role. Contact an administrator to change your role.
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--error-subtle)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'var(--success-subtle)', color: 'var(--success)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--r-sm)', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="username" style={labelStyle}>Username</label>
            <input id="username" type="text" placeholder="e.g. adarsh.g" value={username} onChange={e => setUsername(e.target.value)} disabled={isSubmitting} required style={inputStyle} onFocus={e => { e.target.style.borderColor = 'var(--accent)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)' }} />
          </div>

          <div>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input id="email" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isSubmitting} required style={inputStyle} onFocus={e => { e.target.style.borderColor = 'var(--accent)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)' }} />
          </div>

          <div>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input id="password" type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} required style={inputStyle} onFocus={e => { e.target.style.borderColor = 'var(--accent)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)' }} />
          </div>

          <div>
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
            <input id="confirmPassword" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={isSubmitting} required style={inputStyle} onFocus={e => { e.target.style.borderColor = 'var(--accent)' }} onBlur={e => { e.target.style.borderColor = 'var(--border)' }} />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', padding: '11px', backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 'var(--r-sm)', fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, marginTop: '4px' }}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-text)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
