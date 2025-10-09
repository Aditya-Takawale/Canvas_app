import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import Layout from './components/layout/Layout';
import { selectIsAuthenticated } from './store/slices/authSlice';
import { checkAuthStatus } from './services/authThunks';
import PerformanceMonitor from './components/PerformanceMonitor';
import { performanceOptimizer } from './utils/performanceOptimizer';

// Lazy load components for better performance and code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const RoomPage = lazy(() => import('./pages/RoomPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DebugPage = lazy(() => import('./pages/DebugPage'));
const MultiUserDemoPage = lazy(() => import('./pages/MultiUserDemoPage'));
const SimpleCursorTestPage = lazy(() => import('./pages/SimpleCursorTestPage'));

// Optimized loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// Protected route component with optimized loading state
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);
  
  // Show lightweight loading while checking authentication
  if (loading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public route component with optimized loading (redirects if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAppSelector(state => state.auth);
  
  // Show lightweight loading while checking authentication
  if (loading) {
    return <PageLoader />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/rooms" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Check authentication status when the app loads
  useEffect(() => {
    // @ts-ignore - Type issues with thunk actions
    dispatch(checkAuthStatus());
  }, [dispatch]);
  
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={
            <Suspense fallback={<PageLoader />}>
              <HomePage />
            </Suspense>
          } />
          <Route path="login" element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            </PublicRoute>
          } />
          <Route path="register" element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <RegisterPage />
              </Suspense>
            </PublicRoute>
          } />
          
          {/* Protected routes */}
          <Route path="debug" element={
            <Suspense fallback={<PageLoader />}>
              <DebugPage />
            </Suspense>
          } />
          <Route path="multi-user-demo" element={
            <Suspense fallback={<PageLoader />}>
              <MultiUserDemoPage />
            </Suspense>
          } />
          <Route path="simple-cursors" element={
            <Suspense fallback={<PageLoader />}>
              <SimpleCursorTestPage />
            </Suspense>
          } />
          <Route path="rooms" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <RoomsPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="room/:id" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <RoomPage />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="profile" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            </ProtectedRoute>
          } />
          
          {/* 404 route */}
          <Route path="*" element={
            <Suspense fallback={<PageLoader />}>
              <NotFoundPage />
            </Suspense>
          } />
        </Route>
      </Routes>
      
      {/* Performance monitor - only in development */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor 
          showOverlay={false}
          onMetricsUpdate={(metrics) => {
            console.log('Performance metrics:', metrics);
          }}
        />
      )}
    </>
  );
};

export default App;