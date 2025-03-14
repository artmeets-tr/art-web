import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Avatar
} from '@mui/material';
import {
  Add,
  Edit,
  Block,
  CheckCircle,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { checkSupabaseConnection } from '../services/supabaseClient';
import { userService } from '../services';
import { User, UserRole } from '../types';

interface UserForm {
  id?: string;
  email: string;
  first_name: string | undefined;
  last_name: string | undefined;
  role: UserRole;
  status: 'active' | 'inactive';
  region_id?: number | null;
}

export const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [regions, setRegions] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<UserForm>({
    email: '',
    first_name: '',
    last_name: '',
    role: 'field_user',
    status: 'active',
    region_id: null
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Önce Supabase bağlantısını kontrol et
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.error('Supabase bağlantısı kurulamadı!');
        return;
      }
      
      // Mevcut kullanıcı bilgilerini al
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
      
      console.log('Mevcut kullanıcı:', user);
      
      if (!user) {
        console.error('Oturum açmış kullanıcı bulunamadı');
        return;
      }
      
      // Kullanıcı rolü kontrolü
      // Admin ve yöneticiler tüm kullanıcıları görebilir
      if (user.role !== 'admin' && user.role !== 'manager') {
        console.log('Yalnızca admin ve yöneticiler kullanıcı yönetimi sayfasına erişebilir');
        navigate('/'); // Ana sayfaya yönlendir
        return;
      }
      
      // Bölgeleri yükle
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name')
        .order('name');
        
      if (regionsError) throw regionsError;
      setRegions(regionsData || []);
      
      await fetchUsers();
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      console.log('fetchUsers çağrıldı');
      
      // userService ile tüm kullanıcıları al
      const allUsers = await userService.getAllUsers();
      console.log('getAllUsers sonuçları:', allUsers);
      
      if (!allUsers || allUsers.length === 0) {
        console.log('Kullanıcı bulunamadı');
        setUsers([]);
        return;
      }
      
      // Bölge alanını düzelt
      const formattedUsers = allUsers.map(user => {
        // regions verilerini user_regions dizisi yapısına dönüştür
        if (!user.user_regions) {
          user.user_regions = [];
          
          // Eğer regions verisi varsa
          if (user.regions) {
            const regionInfo = user.regions;
            user.user_regions.push({
              region_id: user.region_id || regionInfo.id,
              regions: regionInfo
            });
          }
        }
        
        return user;
      });
      
      console.log('Formatlanmış kullanıcılar:', formattedUsers);
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    
    // Form verilerini doldur
    setFormData({
      id: user.id,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      status: user.status,
      region_id: user.region_id || null
    });
    
    setOpenDialog(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'field_user',
      status: 'active',
      region_id: null
    });
    setOpenDialog(true);
  };

  const handleStatusToggle = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Kullanıcı listesini güncelle
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Kullanıcı durumu güncellenirken hata:', error);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Form doğrulama
      if (!formData.email || !formData.first_name || !formData.last_name) {
        alert('Lütfen tüm gerekli alanları doldurun');
        return;
      }
      
      // first_name ve last_name için güvenli değerler oluştur
      const safeFirstName = formData.first_name || '';
      const safeLastName = formData.last_name || '';
      
      if (selectedUser) {
        // Kullanıcı güncelleme
        const { error } = await supabase
          .from('users')
          .update({
            email: formData.email,
            first_name: safeFirstName,
            last_name: safeLastName,
            role: formData.role as UserRole,
            status: formData.status,
            region_id: formData.region_id
          })
          .eq('id', selectedUser.id);
          
        if (error) throw error;
        
        // Kullanıcı-bölge ilişkisini güncelle
        if (formData.region_id) {
          // Önce eski ilişkileri sil
          await supabase
            .from('user_regions')
            .delete()
            .eq('user_id', selectedUser.id);
            
          // Yeni ilişki ekle
          await supabase
            .from('user_regions')
            .insert({
              user_id: selectedUser.id,
              region_id: formData.region_id
            });
        }
      } else {
        // Yeni kullanıcı oluşturma
        try {
          // Geçici rastgele şifre oluştur (kullanıcı daha sonra değiştirebilir)
          const tempPassword = Math.random().toString(36).slice(-10);
          
          // Kullanıcı verilerini hazırla
          const userData = {
            first_name: safeFirstName,
            last_name: safeLastName,
            role: formData.role as UserRole,
            status: formData.status,
            region_id: formData.region_id || undefined
          };
          
          // userService ile kullanıcı oluştur
          const createdUser = await userService.createUser(formData.email, tempPassword, userData);
          console.log('Kullanıcı başarıyla oluşturuldu:', createdUser);
          
          // Kullanıcı-bölge ilişkisini ekle
          if (formData.region_id && createdUser.id) {
            await supabase
              .from('user_regions')
              .insert({
                user_id: createdUser.id,
                region_id: formData.region_id
              });
          }
          
          alert(`Kullanıcı başarıyla oluşturuldu. Geçici şifre: ${tempPassword}`);
        } catch (error: any) {
          console.error('Kullanıcı oluşturulurken hata:', error);
          alert(`Kullanıcı oluşturulurken hata: ${error.message || 'Bilinmeyen hata'}`);
          return;
        }
      }
      
      // Kullanıcı listesini yenile
      await fetchUsers();
      setOpenDialog(false);
    } catch (error) {
      console.error('Kullanıcı kaydedilirken hata:', error);
      alert('Kullanıcı kaydedilirken bir hata oluştu');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'regional_manager': return 'success';
      case 'field_user': return 'info';
      default: return 'default';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Yönetici';
      case 'regional_manager': return 'Bölge Yöneticisi';
      case 'field_user': return 'Saha Kullanıcısı';
      default: return role;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Aktif' : 'Pasif';
  };

  const getRegionName = (user: User) => {
    // Önce user_regions'dan kontrol et
    if (user.user_regions && user.user_regions.length > 0 && user.user_regions[0].regions?.name) {
      return user.user_regions[0].regions.name;
    }
    
    // Sonra doğrudan region'dan kontrol et
    if (user.region && user.region.name) {
      return user.region.name;
    }
    
    // Son olarak regions'dan kontrol et
    if (user.regions && user.regions.name) {
      return user.regions.name;
    }
    
    // Hiçbir bölge bilgisi yoksa
    return '-';
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
        <Typography variant="h4" component="h1">
          Kullanıcı Yönetimi
        </Typography>
        
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Add />}
            onClick={handleAddUser}
            sx={{ mr: 1 }}
          >
            Yeni Kullanıcı
          </Button>
          
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={() => fetchUsers()}
          >
            Yenile
          </Button>
        </Box>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Kullanıcı</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Bölge</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar>
                      {user.first_name?.charAt(0)}
                    </Avatar>
                    <Typography>
                      {user.first_name} {user.last_name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={getRoleText(user.role)} 
                    color={getRoleBadgeColor(user.role) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{getRegionName(user)}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusText(user.status)} 
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    color="primary" 
                    size="small" 
                    onClick={() => handleUserSelect(user)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    color={user.status === 'active' ? 'error' : 'success'} 
                    size="small"
                    onClick={() => handleStatusToggle(user)}
                  >
                    {user.status === 'active' ? <Block /> : <CheckCircle />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography>Henüz kullanıcı bulunmuyor</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Kullanıcı Ekleme/Düzenleme Modal */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="E-posta"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleFormChange}
              autoComplete="email"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Ad"
              name="first_name"
              value={formData.first_name}
              onChange={handleFormChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Soyad"
              name="last_name"
              value={formData.last_name}
              onChange={handleFormChange}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Rol</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleSelectChange}
                label="Rol"
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager">Yönetici</MenuItem>
                <MenuItem value="regional_manager">Bölge Yöneticisi</MenuItem>
                <MenuItem value="field_user">Saha Kullanıcısı</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Bölge</InputLabel>
              <Select
                name="region_id"
                value={formData.region_id || ''}
                onChange={handleSelectChange}
                label="Bölge"
              >
                <MenuItem value="">
                  <em>Bölge Seçiniz</em>
                </MenuItem>
                {regions.map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Durum</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleSelectChange}
                label="Durum"
              >
                <MenuItem value="active">Aktif</MenuItem>
                <MenuItem value="inactive">Pasif</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained">Kaydet</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 