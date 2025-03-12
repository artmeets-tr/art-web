import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  CircularProgress, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import DevicesIcon from '@mui/icons-material/Devices';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { userLocationService } from '../services';
import { UserLocation, User } from '../types';

// Google Maps API için tip tanımları
declare global {
  interface Window {
    initMap: () => void;
  }
}

export const UserLocationPage: React.FC = () => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Sayfa yüklendiğinde verileri getir
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Son 24 saat içindeki konumları getir
        const locationData = await userLocationService.getRecentLoginLocations();
        setLocations(locationData);
        
        // Kullanıcıları getir (filtre için)
        const userData = await fetchUsers();
        setUsers(userData);
        
        // Google Maps API'yi yükle
        loadGoogleMapsAPI();
      } catch (err: any) {
        console.error('Veri yüklenirken hata:', err);
        setError(err.message || 'Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Kullanıcıları getir
  const fetchUsers = async (): Promise<User[]> => {
    try {
      // Burada gerçek bir API çağrısı yapılmalı
      // Örnek olarak boş bir dizi döndürüyoruz
      return [];
    } catch (err) {
      console.error('Kullanıcılar alınırken hata:', err);
      return [];
    }
  };

  // Google Maps API'yi yükle
  const loadGoogleMapsAPI = () => {
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = initMap;
    
    document.head.appendChild(script);
  };

  // Haritayı başlat
  const initMap = () => {
    if (!mapRef.current) return;
    
    // Türkiye'nin merkezi
    const center = { lat: 39.9334, lng: 32.8597 };
    
    const mapOptions: google.maps.MapOptions = {
      center,
      zoom: 6,
      mapTypeId: google.maps.MapTypeId.ROADMAP as unknown as string,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
    };
    
    googleMapRef.current = new google.maps.Map(mapRef.current, mapOptions);
    setMapLoaded(true);
    
    // Konumları haritada göster
    if (locations.length > 0) {
      showLocationsOnMap();
    }
  };

  // Konumları haritada göster
  const showLocationsOnMap = () => {
    if (!googleMapRef.current) return;
    
    // Önceki işaretçileri temizle
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    
    // Sınırları belirlemek için sınırlar oluştur
    const bounds = new google.maps.LatLngBounds();
    
    // Her konum için işaretçi oluştur
    locations.forEach(location => {
      const position = {
        lat: location.latitude,
        lng: location.longitude
      };
      
      // Sınırlara ekle
      bounds.extend(position);
      
      // İşaretçi oluştur
      const marker = new google.maps.Marker({
        position,
        map: googleMapRef.current as google.maps.Map,
        title: location.users?.first_name 
          ? `${location.users.first_name} ${location.users.last_name || ''}`
          : location.users?.email || 'Bilinmeyen Kullanıcı',
        animation: google.maps.Animation.DROP
      });
      
      // Bilgi penceresi içeriği
      const infoContent = `
        <div style="padding: 10px;">
          <h3 style="margin: 0 0 8px 0;">${marker.getTitle()}</h3>
          <p style="margin: 0 0 5px 0;"><strong>Tarih:</strong> ${format(new Date(location.login_time), 'dd MMMM yyyy HH:mm', { locale: tr })}</p>
          <p style="margin: 0 0 5px 0;"><strong>Konum:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
          <p style="margin: 0;"><strong>Doğruluk:</strong> ${location.accuracy.toFixed(2)} metre</p>
        </div>
      `;
      
      // Bilgi penceresi oluştur
      const infoWindow = new google.maps.InfoWindow({
        content: infoContent
      });
      
      // İşaretçiye tıklandığında bilgi penceresini göster
      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current as google.maps.Map, marker);
      });
      
      // İşaretçiyi diziye ekle
      markersRef.current.push(marker);
    });
    
    // Haritayı tüm işaretçileri gösterecek şekilde ayarla
    if (markersRef.current.length > 0) {
      googleMapRef.current.fitBounds(bounds);
      
      // Eğer tek bir işaretçi varsa, yakınlaştırma seviyesini ayarla
      if (markersRef.current.length === 1) {
        googleMapRef.current.setZoom(14);
      }
    }
  };

  // Filtreleri uygula
  const applyFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {
        locationType: 'login'
      };
      
      if (selectedUser) {
        filters.userId = selectedUser;
      }
      
      if (startDate) {
        filters.startDate = startDate.toISOString();
      }
      
      if (endDate) {
        // Günün sonuna kadar olan kayıtları dahil et
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filters.endDate = endOfDay.toISOString();
      }
      
      const locationData = await userLocationService.getUserLocations(filters);
      setLocations(locationData);
      
      // Harita yüklendiyse, konumları göster
      if (mapLoaded) {
        showLocationsOnMap();
      }
    } catch (err: any) {
      console.error('Filtreler uygulanırken hata:', err);
      setError(err.message || 'Filtreler uygulanırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Filtreleri sıfırla
  const resetFilters = async () => {
    setSelectedUser('');
    setStartDate(null);
    setEndDate(null);
    
    try {
      setLoading(true);
      setError(null);
      
      const locationData = await userLocationService.getRecentLoginLocations();
      setLocations(locationData);
      
      if (mapLoaded) {
        showLocationsOnMap();
      }
    } catch (err: any) {
      console.error('Filtreler sıfırlanırken hata:', err);
      setError(err.message || 'Filtreler sıfırlanırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Kullanıcı Konum Takibi
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Kullanıcıların giriş yaptıkları konumları harita üzerinde görüntüleyin ve takip edin.
        </Typography>
      </Box>
      
      {/* Filtreler */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterAltIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filtreler</Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="user-select-label">Kullanıcı</InputLabel>
              <Select
                labelId="user-select-label"
                id="user-select"
                value={selectedUser}
                label="Kullanıcı"
                onChange={(e) => setSelectedUser(e.target.value as string)}
              >
                <MenuItem value="">Tüm Kullanıcılar</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DatePicker
                label="Başlangıç Tarihi"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
              <DatePicker
                label="Bitiş Tarihi"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={applyFilters}
                disabled={loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Filtrele'}
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={resetFilters}
                disabled={loading}
              >
                Sıfırla
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Hata mesajı */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {/* Harita ve Konum Listesi */}
      <Grid container spacing={4}>
        {/* Harita */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '600px' }}>
            <Box 
              ref={mapRef} 
              sx={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {!mapLoaded && (
                <CircularProgress />
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Konum Listesi */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '600px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Konum Geçmişi
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : locations.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Gösterilecek konum verisi bulunamadı.
                </Typography>
              </Box>
            ) : (
              <List>
                {locations.map((location) => (
                  <React.Fragment key={location.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle1" component="span">
                            {location.users?.first_name 
                              ? `${location.users.first_name} ${location.users.last_name || ''}`
                              : location.users?.email || 'Bilinmeyen Kullanıcı'}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" component="span">
                                {format(new Date(location.login_time), 'dd MMMM yyyy HH:mm', { locale: tr })}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" component="span">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <DevicesIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" component="span">
                                {(() => {
                                  try {
                                    const deviceInfo = JSON.parse(location.device_info);
                                    return deviceInfo.platform || 'Bilinmeyen Cihaz';
                                  } catch {
                                    return 'Bilinmeyen Cihaz';
                                  }
                                })()}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ mt: 1 }}>
                              <Chip 
                                size="small" 
                                label={`Doğruluk: ${location.accuracy.toFixed(2)} m`} 
                                color="primary" 
                                variant="outlined"
                              />
                            </Box>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}; 