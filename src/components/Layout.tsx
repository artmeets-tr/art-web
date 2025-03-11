import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Description,
  LocalHospital as MedicalServices,
  EventNote as Assessment,
  People as Group,
  BarChart as Analytics,
  ShoppingCart as Inventory,
  Notifications,
  CalendarMonth,
  Person,
  Settings,
  Logout,
} from '@mui/icons-material';
import { User, UserRole } from '../types';
import { userService } from '../services/apiService';

const drawerWidth = 240;

interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
}

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await userService.getCurrentUser();
        setCurrentUser(user);
        setLoading(false);
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <Dashboard />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Klinikler',
      path: '/clinics',
      icon: <Business />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Proje Teklifleri',
      path: '/proposals',
      icon: <Description />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Ameliyat Raporları',
      path: '/surgery-reports',
      icon: <MedicalServices />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Ziyaret Raporları',
      path: '/visit-reports',
      icon: <Assessment />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Takvim',
      path: '/calendar',
      icon: <CalendarMonth />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Bildirimler',
      path: '/notifications',
      icon: <Notifications />,
      allowedRoles: ['admin', 'manager', 'regional_manager', 'field_user'],
    },
    {
      label: 'Takım Performansı',
      path: '/team-performance',
      icon: <Group />,
      allowedRoles: ['admin', 'manager'],
    },
    {
      label: 'Analitik',
      path: '/analytics',
      icon: <Analytics />,
      allowedRoles: ['admin', 'manager'],
    },
    {
      label: 'Ürün Yönetimi',
      path: '/products',
      icon: <Inventory />,
      allowedRoles: ['admin', 'manager'],
    },
    {
      label: 'Kullanıcı Yönetimi',
      path: '/user-management',
      icon: <Person />,
      allowedRoles: ['admin'],
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await userService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  // Kullanıcı rolüne göre menü öğelerini filtrele
  const filteredMenuItems = menuItems.filter(item => 
    currentUser && item.allowedRoles.includes(currentUser.role as UserRole)
  );

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
          ART CRM
        </Typography>
      </Box>
      <List component="nav" sx={{ flexGrow: 1, px: 1 }}>
        {menuItems
          .filter(
            (item) =>
              !currentUser ||
              item.allowedRoles.includes(currentUser.role as UserRole)
          )
          .map((item) => (
            <ListItem
              key={item.path}
              disablePadding
              sx={{ mb: 0.5 }}
            >
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.04)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: location.pathname === item.path ? 'white' : 'primary.main',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: location.pathname === item.path ? 600 : 500,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
          © {new Date().getFullYear()} ART CRM
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'text.primary',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Notifications />
          </IconButton>
          <Box>
            <IconButton
              onClick={handleMenuClick}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: 'primary.main',
                  fontSize: '1rem',
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                  mt: 1.5,
                  width: 200,
                  borderRadius: 2,
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    my: 0.5,
                    mx: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.04)',
                    },
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => navigate('/profile')}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Profil
              </MenuItem>
              <MenuItem onClick={() => navigate('/settings')}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Ayarlar
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" color="error" />
                </ListItemIcon>
                <Typography color="error">Çıkış Yap</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e2e8f0',
              boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid #e2e8f0',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}; 