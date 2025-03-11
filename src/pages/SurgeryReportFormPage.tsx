import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Box,
  SelectChangeEvent
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { SurgeryReport, Clinic, Product } from '../types';
import { surgeryReportService, clinicService, productService, userService } from '../services';
import { FormContainer } from '../components/common/FormContainer';
import { FormButtons } from '../components/common/FormButtons';

export const SurgeryReportFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [report, setReport] = useState<Partial<SurgeryReport>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    status: 'scheduled',
  });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clinicsData, productsData, currentUser] = await Promise.all([
          clinicService.getAll(),
          productService.getAll(),
          userService.getCurrentUser()
        ]);

        setClinics(clinicsData);
        setProducts(productsData);

        if (currentUser) {
          setReport(prev => ({ ...prev, user_id: currentUser.id }));
        }

        if (isEditMode && id) {
          const reportData = await surgeryReportService.getById(Number(id));
          setReport({
            ...reportData,
            // Bağlantılı verileri ayır
            clinic_id: reportData.clinic?.id,
            product_id: reportData.product?.id,
          });
        }
      } catch (err: any) {
        setError(err.message || 'Veriler yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!report.clinic_id) newErrors.clinic_id = 'Klinik seçimi zorunludur';
    if (!report.patient_name?.trim()) newErrors.patient_name = 'Hasta adı zorunludur';
    if (!report.surgery_type?.trim()) newErrors.surgery_type = 'Ameliyat türü zorunludur';
    if (!report.date) newErrors.date = 'Tarih zorunludur';
    if (!report.time) newErrors.time = 'Saat zorunludur';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Lütfen formdaki hataları düzeltin');
      return;
    }

    try {
      setSaving(true);
      
      if (isEditMode && id) {
        await surgeryReportService.update(Number(id), report);
        setSuccess('Ameliyat raporu başarıyla güncellendi');
      } else {
        await surgeryReportService.create(report);
        setSuccess('Ameliyat raporu başarıyla oluşturuldu');
      }

      setTimeout(() => {
        navigate('/surgery-reports');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Kayıt sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReport(prev => ({ ...prev, [name]: value }));
    
    // Mevcut hata varsa temizle
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<number | string>) => {
    const { name, value } = e.target;
    setReport(prev => ({ ...prev, [name]: value }));
    
    // Mevcut hata varsa temizle
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name as string]: '' }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setReport(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
      
      // Mevcut hata varsa temizle
      if (errors.date) {
        setErrors(prev => ({ ...prev, date: '' }));
      }
    }
  };

  const handleTimeChange = (time: Date | null) => {
    if (time) {
      setReport(prev => ({ ...prev, time: format(time, 'HH:mm') }));
      
      // Mevcut hata varsa temizle
      if (errors.time) {
        setErrors(prev => ({ ...prev, time: '' }));
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isEditMode ? 'Ameliyat Raporu Düzenle' : 'Yeni Ameliyat Raporu'}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.clinic_id}>
                <InputLabel>Klinik</InputLabel>
                <Select
                  name="clinic_id"
                  value={report.clinic_id || ''}
                  onChange={handleSelectChange}
                  label="Klinik"
                >
                  {clinics.map(clinic => (
                    <MenuItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.clinic_id && <FormHelperText>{errors.clinic_id}</FormHelperText>}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Ürün</InputLabel>
                <Select
                  name="product_id"
                  value={report.product_id || ''}
                  onChange={handleSelectChange}
                  label="Ürün"
                >
                  <MenuItem value="">Seçiniz</MenuItem>
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="patient_name"
                label="Hasta Adı"
                value={report.patient_name || ''}
                onChange={handleInputChange}
                fullWidth
                error={!!errors.patient_name}
                helperText={errors.patient_name}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                name="surgery_type"
                label="Ameliyat Türü"
                value={report.surgery_type || ''}
                onChange={handleInputChange}
                fullWidth
                error={!!errors.surgery_type}
                helperText={errors.surgery_type}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="Tarih"
                  value={report.date ? new Date(report.date) : null}
                  onChange={handleDateChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.date,
                      helperText: errors.date
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <TimePicker
                  label="Saat"
                  value={report.time ? new Date(`2000-01-01T${report.time}`) : null}
                  onChange={handleTimeChange}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.time,
                      helperText: errors.time
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Durum</InputLabel>
                <Select
                  name="status"
                  value={report.status || 'scheduled'}
                  onChange={handleSelectChange}
                  label="Durum"
                >
                  <MenuItem value="scheduled">Planlandı</MenuItem>
                  <MenuItem value="completed">Tamamlandı</MenuItem>
                  <MenuItem value="cancelled">İptal Edildi</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="notes"
                label="Notlar"
                value={report.notes || ''}
                onChange={handleInputChange}
                multiline
                rows={4}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/surgery-reports')}
                disabled={saving}
              >
                İptal
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : (isEditMode ? 'Güncelle' : 'Kaydet')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};