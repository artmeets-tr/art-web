import React, { useState, useEffect } from 'react';
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
  TextField, 
  InputAdornment,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { 
  Search, 
  Add, 
  Edit, 
  Delete, 
  Business, 
  Phone, 
  Email, 
  Person 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { clinicService, regionService, userService } from '../services/apiService';
import { Clinic, Region, User, UserRole } from '../types';
import { SelectChangeEvent } from '@mui/material/Select';

export const ClinicsPage: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    contact_person: string;
    contact_info: string;
    email: string;
    region_id: number;
    status: 'active' | 'inactive';
  }>({
    name: '',
    address: '',
    contact_person: '',
    contact_info: '',
    email: '',
    region_id: 0,
    status: 'active'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = clinics.filter(clinic => 
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clinic.address && clinic.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (clinic.contact_person && clinic.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredClinics(filtered);
    } else {
      setFilteredClinics(clinics);
    }
  }, [searchTerm, clinics]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clinicsData, regionsData, userData] = await Promise.all([
        clinicService.getAll(),
        regionService.getAll(),
        userService.getCurrentUser()
      ]);
      
      setClinics(clinicsData);
      setFilteredClinics(clinicsData);
      setRegions(regionsData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Veri alınırken hata oluştu:', error);
      setErrorMessage('Veri alınırken bir hata oluştu. Lütfen sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleOpenDialog = (clinic?: Clinic) => {
    // Reset error message
    setErrorMessage(null);
    
    if (clinic) {
      // Kullanıcı rolüne göre düzenleme izni kontrol et
      if (currentUser?.role === 'field_user' && clinic.region_id !== currentUser.region_id) {
        setErrorMessage('Yalnızca kendi bölgenizdeki klinikleri düzenleyebilirsiniz.');
        return;
      }
      
      setSelectedClinic(clinic);
      setFormData({
        name: clinic.name,
        address: clinic.address || '',
        contact_person: clinic.contact_person || '',
        contact_info: clinic.contact_info || '',
        email: clinic.email || '',
        region_id: clinic.region_id,
        status: clinic.status
      });
    } else {
      // Yeni klinik eklemesi için
      setSelectedClinic(null);
      
      // Saha kullanıcıları için, kendi bölgelerini otomatik seçili hale getir
      const initialRegionId = 
        currentUser?.role === 'field_user' && currentUser?.region_id 
          ? currentUser.region_id 
          : (regions.length > 0 ? regions[0].id : 0);
          
      setFormData({
        name: '',
        address: '',
        contact_person: '',
        contact_info: '',
        email: '',
        region_id: initialRegionId,
        status: 'active'
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setErrorMessage(null);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    if (name) {
      // Saha kullanıcısı, bölge değişimini engelle
      if (name === 'region_id' && currentUser?.role === 'field_user') {
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      // Form doğrulama
      if (!formData.name || !formData.region_id) {
        setErrorMessage('Lütfen zorunlu alanları doldurun (Klinik Adı ve Bölge)');
        return;
      }
      
      // Kullanıcı yetki kontrolü
      if (currentUser?.role === 'field_user') {
        // Saha kullanıcıları sadece kendi bölgelerinde işlem yapabilir
        if (formData.region_id !== currentUser.region_id) {
          setErrorMessage('Sadece kendi bölgenize klinik ekleyebilirsiniz.');
          return;
        }
      }
      
      const clinicData = {
        ...formData,
        created_by: currentUser?.id || undefined
      };
      
      if (selectedClinic) {
        // Güncelleme
        await clinicService.update(selectedClinic.id, clinicData);
      } else {
        // Yeni ekleme
        await clinicService.create(clinicData);
      }
      
      handleCloseDialog();
      // Veri güncellendikten sonra listeyi yenile
      fetchData();
    } catch (error) {
      console.error('Klinik kaydedilirken hata oluştu:', error);
      setErrorMessage('Klinik kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  // Kullanıcı rolüne göre "Yeni Klinik" butonu görünürlüğü
  const canAddClinic = () => {
    if (!currentUser) return false;
    
    // Admin ve Manager her zaman ekleyebilir
    if (['admin', 'manager'].includes(currentUser.role)) return true;
    
    // Regional Manager ve Field User sadece bölge ID'si varsa ekleyebilir
    return Boolean(currentUser.region_id);
  };

  // Kullanıcı rolüne göre kullanılabilir bölgeler
  const getAvailableRegions = () => {
    if (!currentUser || !regions) return [];
    
    if (['admin', 'manager'].includes(currentUser.role)) {
      return regions; // Tüm bölgeleri görebilir
    } else if (currentUser.role === 'regional_manager' || currentUser.role === 'field_user') {
      // Sadece kendi bölgesini görebilir
      if (currentUser.region_id) {
        return regions.filter(region => region.id === currentUser.region_id);
      }
    }
    
    return [];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Klinikler
        </Typography>
        {canAddClinic() && (
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Klinik
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Klinik adı, adres veya kişi ara..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Klinik Adı</TableCell>
                <TableCell>Bölge</TableCell>
                <TableCell>İletişim Kişisi</TableCell>
                <TableCell>İletişim Bilgisi</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClinics.length > 0 ? (
                filteredClinics.map((clinic) => {
                  // Saha kullanıcıları için düzenleme yetkisi kontrol et
                  const canEditClinic = currentUser?.role !== 'field_user' || 
                                        clinic.region_id === currentUser?.region_id;
                  
                  return (
                    <TableRow key={clinic.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Business sx={{ mr: 1, color: 'primary.main' }} />
                          {clinic.name}
                        </Box>
                      </TableCell>
                      <TableCell>{clinic.region?.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Person sx={{ fontSize: 'small', mr: 0.5 }} />
                          {clinic.contact_person || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Phone sx={{ fontSize: 'small', mr: 0.5 }} />
                          {clinic.contact_info || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={clinic.status === 'active' ? 'Aktif' : 'Pasif'} 
                          color={clinic.status === 'active' ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        {canEditClinic && (
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => handleOpenDialog(clinic)}
                          >
                            <Edit />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {searchTerm ? 'Arama kriterlerine uygun klinik bulunamadı' : 'Henüz klinik kaydı bulunmuyor'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Klinik Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedClinic ? 'Klinik Düzenle' : 'Yeni Klinik Ekle'}</DialogTitle>
        <DialogContent>
          {errorMessage && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Klinik Adı"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                name="address"
                value={formData.address}
                onChange={handleFormChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="İletişim Kişisi"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="İletişim Bilgisi"
                name="contact_info"
                value={formData.contact_info}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-posta"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Bölge</InputLabel>
                <Select
                  name="region_id"
                  value={formData.region_id}
                  onChange={handleSelectChange}
                  label="Bölge"
                  disabled={currentUser?.role === 'field_user'} // Saha kullanıcısı değiştiremez
                >
                  {getAvailableRegions().map((region) => (
                    <MenuItem key={region.id} value={region.id}>
                      {region.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
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
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 