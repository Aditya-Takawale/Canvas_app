import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { login } from '../services/authThunks';
import ErrorAlert from '../components/common/ErrorAlert';
import { Spinner } from '../components/common/Spinner';

const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginWithPassword, setLoginWithPassword] = useState(false);
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // @ts-ignore - Type issues with thunk actions
      const resultAction = await dispatch(login({ 
        email: emailOrUsername, // Use the email/username field
        password 
      }));
      
      if (login.fulfilled.match(resultAction)) {
        // The token is already saved in localStorage by the loginSuccess action
        // But we can additionally save to sessionStorage if not remember me
        if (!rememberMe) {
          const token = localStorage.getItem('token');
          if (token) {
            sessionStorage.setItem('auth_token', token);
          }
        }
        
        navigate('/rooms');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header with logo */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-gray-900">Canvas App</div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">
              Log in to access the Canvas Visual Collaboration Suite
            </h1>
          </div>
          
          {error && <ErrorAlert message={error} />}
          
          {!loginWithPassword ? (
            <>
              {/* Email/username input and next button */}
              <div className="mb-8">
                <label htmlFor="email-username" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or username
                </label>
                <input
                  id="email-username"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              
              <button
                type="button"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                onClick={() => setLoginWithPassword(true)}
              >
                Next
              </button>
            </>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-username" className="block text-sm font-medium text-gray-700 mb-1">
                  Email or username
                </label>
                <input
                  id="email-username"
                  name="email"
                  type="text"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  disabled
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="text-sm">
                    <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                >
                  {loading ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    'Log in with password'
                  )}
                </button>
              </div>
              
              <div className="text-center">
                <button 
                  type="button" 
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                  onClick={() => setLoginWithPassword(false)}
                >
                  Back to login options
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account? 
              <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;