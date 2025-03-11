import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Button,
  ButtonGroup,
  Divider,
  IconButton,
  Chip,
  Badge,
  Menu,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  NotificationsActive,
  CheckCircle,
  LocalHospital,
  Description,
  Assignment,
  Info,
  MoreVert,
  DeleteOutline,
  DoneAll,
  EventNote
} from '@mui/icons-material';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { tr as trLocale } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/apiService';

// Bildirim tipi tanımı
type NotificationType = 'proposal' | 'surgery' | 'visit' | 'system' | 'approval';

// Bildirim veri modeli
interface Notification {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  related_id?: number;
  related_type?: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  // Demo bildirimler - gerçek uygulamada veritabanından gelecek
  const demoNotifications: Notification[] = [
    {
      id: 1,
      title: 'Yeni Teklif Onaylandı',
      body: 'Özel Akdeniz Hastanesi için oluşturduğunuz teklif onaylandı.',
      type: 'approval',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 dakika önce
      related_id: 123,
      related_type: 'proposal'
    },
    {
      id: 2,
      title: 'Ameliyat Raporu Hatırlatması',
      body: 'Yarın 10:00\'da Doktor Mehmet Yılmaz ile ameliyat randevunuz var.',
      type: 'surgery',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 saat önce
      related_id: 456,
      related_type: 'surgery-report'
    },
    {
      id: 3,
      title: 'Yeni Ziyaret Raporu',
      body: 'Ankara Şehir Hastanesi ziyaret raporu oluşturuldu.',
      type: 'visit',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 saat önce
      related_id: 789,
      related_type: 'visit-report'
    },
    {
      id: 4,
      title: 'Sistem Güncellemesi',
      body: 'Sistem başarıyla güncellendi. Yeni özellikler için yardım bölümünü inceleyebilirsiniz.',
      type: 'system',
      is_read: true,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 gün önce
    },
    {
      id: 5,
      title: 'Teklif Onay Bekliyor',
      body: 'İzmir Medikal Merkezi için oluşturduğunuz teklif onay bekliyor.',
      type: 'proposal',
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 gün önce
      related_id: 234,
      related_type: 'proposal'
    }
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Kullanıcı bilgisini al
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
      
      // Gerçek uygulamada veritabanından bildirimler çekilecek
      // Şimdilik demo veriler kullanılıyor
      setNotifications(demoNotifications);
      
      // Filtreleri uygula
      applyFilters(demoNotifications);
    } catch (error) {
      console.error('Bildirim yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [notifications, filterType, tabValue]);

  const applyFilters = (notifData = notifications) => {
    let filtered = [...notifData];
    
    // Tip filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }
    
    // Tab filtresi (okunmamış/tümü)
    if (tabValue === 1) {
      filtered = filtered.filter(notification => !notification.is_read);
    }
    
    // Tarih sıralaması (en yeni en üstte)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setFilteredNotifications(filtered);
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      is_read: true
    }));
    
    setNotifications(updatedNotifications);
    setMenuAnchorEl(null);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setMenuAnchorEl(null);
  };

  const markAsRead = (id: number) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, is_read: true } : notification
    );
    
    setNotifications(updatedNotifications);
  };

  const handleNotificationPress = (notification: Notification) => {
    // Okundu olarak işaretle
    markAsRead(notification.id);
    
    // İlgili sayfaya yönlendir
    if (notification.related_type && notification.related_id) {
      switch (notification.related_type) {
        case 'proposal':
          navigate(`/proposals/${notification.related_id}`);
          break;
        case 'surgery-report':
          navigate(`/surgery-reports/${notification.related_id}`);
          break;
        case 'visit-report':
          navigate(`/visit-reports/${notification.related_id}`);
          break;
        default:
          // İlgili sayfa yoksa işlem yapma
          break;
      }
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'proposal': return <Description color="primary" />;
      case 'surgery': return <LocalHospital color="error" />;
      case 'visit': return <EventNote color="success" />;
      case 'system': return <Info color="warning" />;
      case 'approval': return <CheckCircle color="success" />;
      default: return <NotificationsActive />;
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'proposal': return '#3f51b5'; // primary
      case 'surgery': return '#f44336'; // error
      case 'visit': return '#4caf50'; // success
      case 'system': return '#ff9800'; // warning
      case 'approval': return '#2e7d32'; // dark green
      default: return '#757575'; // default grey
    }
  };

  const getNotificationTypeText = (type: NotificationType): string => {
    switch (type) {
      case 'proposal': return 'Teklif';
      case 'surgery': return 'Ameliyat';
      case 'visit': return 'Ziyaret';
      case 'system': return 'Sistem';
      case 'approval': return 'Onay';
      default: return 'Bildirim';
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: trLocale
      });
    } catch (error) {
      return 'Bilinmeyen zaman';
    }
  };

  const getUnreadCount = (): number => {
    return notifications.filter(notification => !notification.is_read).length;
  };

  const handleFilterChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFilterTypeChange = (type: NotificationType | 'all') => {
    setFilterType(type);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>, notification: Notification) => {
    event.stopPropagation();
    setSelectedNotification(notification);
    setMenuAnchorEl(event.currentTarget);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bildirimler
          {getUnreadCount() > 0 && (
            <Badge 
              badgeContent={getUnreadCount()} 
              color="error" 
              sx={{ ml: 2 }}
            />
          )}
        </Typography>
        
        <Box>
          <IconButton color="primary" onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={markAllAsRead}>
              <ListItemIcon>
                <DoneAll fontSize="small" />
              </ListItemIcon>
              <ListItemText>Tümünü Okundu İşaretle</ListItemText>
            </MenuItem>
            <MenuItem onClick={clearAllNotifications}>
              <ListItemIcon>
                <DeleteOutline fontSize="small" />
              </ListItemIcon>
              <ListItemText>Tümünü Temizle</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleFilterChange}>
            <Tab label="Tüm Bildirimler" />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Okunmamış
                  {getUnreadCount() > 0 && (
                    <Badge 
                      badgeContent={getUnreadCount()} 
                      color="error" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>
        
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="Tümü"
            onClick={() => handleFilterTypeChange('all')}
            color={filterType === 'all' ? 'primary' : 'default'}
            variant={filterType === 'all' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Teklifler"
            onClick={() => handleFilterTypeChange('proposal')}
            color={filterType === 'proposal' ? 'primary' : 'default'}
            variant={filterType === 'proposal' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Ameliyatlar"
            onClick={() => handleFilterTypeChange('surgery')}
            color={filterType === 'surgery' ? 'primary' : 'default'}
            variant={filterType === 'surgery' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Ziyaretler"
            onClick={() => handleFilterTypeChange('visit')}
            color={filterType === 'visit' ? 'primary' : 'default'}
            variant={filterType === 'visit' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Onaylar"
            onClick={() => handleFilterTypeChange('approval')}
            color={filterType === 'approval' ? 'primary' : 'default'}
            variant={filterType === 'approval' ? 'filled' : 'outlined'}
          />
          <Chip
            label="Sistem"
            onClick={() => handleFilterTypeChange('system')}
            color={filterType === 'system' ? 'primary' : 'default'}
            variant={filterType === 'system' ? 'filled' : 'outlined'}
          />
        </Box>
      </Paper>
      
      <Paper>
        {filteredNotifications.length > 0 ? (
          <List>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    bgcolor: notification.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.05)',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleNotificationPress(notification)}
                  secondaryAction={
                    <IconButton edge="end" onClick={(e) => handleNotificationMenuOpen(e, notification)}>
                      <MoreVert />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getNotificationColor(notification.type) }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle1"
                          component="span"
                          sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip 
                          label={getNotificationTypeText(notification.type)} 
                          size="small" 
                          color="default"
                          variant="outlined"
                        />
                        {!notification.is_read && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
                        )}
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'inline', color: 'text.primary' }}
                          component="span"
                          variant="body2"
                        >
                          {notification.body}
                        </Typography>
                        <Typography
                          sx={{ display: 'block', mt: 1, color: 'text.secondary' }}
                          component="span"
                          variant="caption"
                        >
                          {formatTime(notification.created_at)}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsActive sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              {filterType !== 'all' 
                ? `${getNotificationTypeText(filterType)} tipinde bildirim bulunamadı.` 
                : 'Hiç bildirim bulunamadı.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Yeni bildirimler geldiğinde burada görünecekler.
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Bildirim Menüsü */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && !!selectedNotification}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedNotification) {
            markAsRead(selectedNotification.id);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <DoneAll fontSize="small" />
          </ListItemIcon>
          <ListItemText>Okundu İşaretle</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedNotification) {
            const updated = notifications.filter(n => n.id !== selectedNotification.id);
            setNotifications(updated);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}; 