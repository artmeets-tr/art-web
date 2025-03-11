import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { User, UserRole } from '../types';
import { userService } from '../services';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  allowedRoles, 
  children 
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Kullanıcı bilgisini al
        const user = await userService.getCurrentUser();
        setCurrentUser(user);

        // Kullanıcı var mı ve izin verilen role sahip mi kontrol et
        if (user && allowedRoles.includes(user.role)) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (error) {
        console.error('Yetkilendirme kontrolü sırasında hata:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!authorized) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        padding={3}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Erişim Reddedildi
        </Typography>
        <Typography variant="body1" align="center" paragraph>
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
          Yalnızca {allowedRoles.join(', ')} rollerine sahip kullanıcılar erişebilir.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            // React Router yönlendirmesi kullan
            window.history.pushState({}, "", "/dashboard");
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        >
          Ana Sayfaya Dön
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}; 