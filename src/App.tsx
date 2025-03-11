import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Layout } from './components/Layout';
import { RoleBasedRoute } from './components/RoleBasedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClinicsPage } from './pages/ClinicsPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { SurgeryReportsPage } from './pages/SurgeryReportsPage';
import { VisitReportsPage } from './pages/VisitReportsPage';
import { TeamPerformancePage } from './pages/TeamPerformancePage';
import { ProductsPage } from './pages/ProductsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CalendarPage } from './pages/CalendarPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { userService } from './services';
import { User, UserRole } from './types';
import { CircularProgress, Box } from '@mui/material';
import { ProposalFormPage } from './pages/ProposalFormPage';
import { SurgeryReportFormPage } from './pages/SurgeryReportFormPage';
import { VisitReportFormPage } from './pages/VisitReportFormPage';

// Tema oluştur
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a', // Daha derin ve modern mavi
      light: '#4e67b0',
      dark: '#0d2b6b',
    },
    secondary: {
      main: '#64748b', // Çağdaş, zarif gri-mavi
      light: '#94a3b8',
      dark: '#475569',
    },
    error: {
      main: '#dc2626', // Modern kırmızı
    },
    warning: {
      main: '#f59e0b', // Canlı ama parlak olmayan amber
    },
    info: {
      main: '#0ea5e9', // Parlak gökyüzü mavisi
    },
    success: {
      main: '#059669', // Zarif yeşil
    },
    background: {
      default: '#f8fafc', // Çok hafif gri-mavi arka plan
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Koyu slate
      secondary: '#64748b', // Orta slate
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // Daha yuvarlak köşeler
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          fontWeight: 500,
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
          },
          padding: '6px 16px',
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          color: '#475569',
          backgroundColor: '#f8fafc',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Korumalı Route bileşeni
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Her kullanıcının erişebileceği sayfalar */}
          <Route path="/" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <DashboardPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/dashboard" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <DashboardPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/clinics" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <ClinicsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/proposals" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <ProposalsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/proposals/create" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <ProposalFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/proposals/:id" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <ProposalFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/proposals/edit/:id" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <ProposalFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/surgery-reports" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <SurgeryReportsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/surgery-reports/create" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <SurgeryReportFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/surgery-reports/edit/:id" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <SurgeryReportFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/visit-reports" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <VisitReportsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/visit-reports/create" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <VisitReportFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/visit-reports/edit/:id" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <VisitReportFormPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/calendar" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <CalendarPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/notifications" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'regional_manager', 'field_user']}>
              <Layout>
                <NotificationsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          
          {/* Yalnızca admin ve manager erişebilir */}
          <Route path="/team-performance" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <TeamPerformancePage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/analytics" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <AnalyticsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          <Route path="/products" element={
            <RoleBasedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <ProductsPage />
              </Layout>
            </RoleBasedRoute>
          } />
          
          {/* Yalnızca admin erişebilir */}
          <Route path="/user-management" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <Layout>
                <UserManagementPage />
              </Layout>
            </RoleBasedRoute>
          } />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
