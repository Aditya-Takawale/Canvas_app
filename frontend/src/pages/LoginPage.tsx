import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login } from '../services/authThunks';
import ErrorAlert from '../components/common/ErrorAlert';
import { Spinner } from '../components/common/Spinner';
import { FaUser, FaLock } from 'react-icons/fa';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // @ts-ignore
      const resultAction = await dispatch(login({ email: username, password }));
      if (login.fulfilled.match(resultAction)) {
        navigate('/rooms');
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px'
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1024px',
    display: 'flex',
    flexDirection: 'row',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden'
  };

  const leftPanelStyle: React.CSSProperties = {
    width: '50%',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const rightPanelStyle: React.CSSProperties = {
    width: '50%',
    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#6b7280',
    marginBottom: '32px'
  };

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: '24px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    paddingLeft: '48px',
    paddingRight: '16px',
    paddingTop: '12px',
    paddingBottom: '12px',
    background: '#f3f4f6',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    outline: 'none'
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '16px',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  };

  const srOnlyStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    background: '#111827',
    color: 'white',
    fontWeight: 'bold',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    marginBottom: '32px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Left Side: Form */}
        <div style={leftPanelStyle}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={titleStyle}>Welcome</h1>
            <p style={subtitleStyle}>We are glad to see you back with us</p>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#ff6b35',
              marginTop: '8px'
            }}>
              Canvas App
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              marginTop: '4px'
            }}>
              Collaborative Drawing Platform
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <ErrorAlert message={error} />}
            
            <div style={inputContainerStyle}>
              <label htmlFor="username-input" style={srOnlyStyle}>Username</label>
              <FaUser style={iconStyle} />
              <input
                id="username-input"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <div style={inputContainerStyle}>
              <label htmlFor="password-input" style={srOnlyStyle}>Password</label>
              <FaLock style={iconStyle} />
              <input
                id="password-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? <Spinner size="sm" /> : 'NEXT'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ fontWeight: 'medium', color: '#3b82f6' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side: Login Art Image */}
        <div style={rightPanelStyle}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/login-art.png"
              alt="Canvas App - Collaborative Drawing Platform"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;