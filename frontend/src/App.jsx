// App.js (updated to use Dashboard)
import { useEffect, useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import Login from './Auth/Login';
import Register from './Auth/Register';
import ProtectedRoute from './utils/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import ForgotPassword from './Auth/ForgotPassword';
import Dashboard from './components/Dashboard/Dashboard';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';

function GlobalApiErrorToast() {
  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
  });
  const lastShownRef = useRef({ message: '', at: 0 });

  useEffect(() => {
    const handleError = (event) => {
      const message = String(event?.detail?.message || 'Something went wrong.').trim();
      const now = Date.now();

      if (
        lastShownRef.current.message === message
        && now - lastShownRef.current.at < 2000
      ) {
        return;
      }

      lastShownRef.current = { message, at: now };
      setToast({ isOpen: true, message });
    };

    window.addEventListener('app:api-error', handleError);
    return () => window.removeEventListener('app:api-error', handleError);
  }, []);

  return (
    <Toast
      type='error'
      message={toast.message}
      isOpen={toast.isOpen}
      onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
    />
  );
}

const AuthRedirect = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to='/dashboard' replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <Router>
            <GlobalApiErrorToast />
            <Routes>
              <Route path='/' element={<Navigate to='/dashboard' replace />} />
              <Route
                path='/dashboard/:tab?'
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/login'
                element={
                  <AuthRedirect>
                    <Login />
                  </AuthRedirect>
                }
              />
              <Route
                path='/register'
                element={
                  <AuthRedirect>
                    <Register />
                  </AuthRedirect>
                }
              />
              <Route path='/forgot-password' element={<ForgotPassword />} />
              <Route path='*' element={<Navigate to='/dashboard' replace />} />
            </Routes>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;