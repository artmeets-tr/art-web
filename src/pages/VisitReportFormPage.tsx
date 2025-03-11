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
  SelectChangeEvent,
  Switch,
  FormControlLabel
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker, TimePicker } from '@mui/x-date-pickers';
import { tr } from 'date-fns/locale';
import { format } from 'date-fns';
import { VisitReport, Clinic } from '../types';
import { visitReportService, clinicService, userService } from '../services';
import { FormContainer } from '../components/common/FormContainer';
import { FormButtons } from '../components/common/FormButtons';

export const VisitReportFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [report, setReport] = useState<Partial<VisitReport>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    follow_up_required: false,
  });
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clinicsData, currentUser] = await Promise.all([
          clinicService.getAll(),
          userService.getCurrentUser()
        ]);

        setClinics(clinicsData);

        if (currentUser) {
          setReport(prev => ({ ...prev, user_id: currentUser.id }));
        }

        if (isEditMode && id) {
          const reportData = await visitReportService.getById(Number(id));
          setReport({
            ...reportData,
            // Bağlantılı verileri ayır
            clinic_id: reportData.clinic?.id,
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
    if (!report.subject?.trim()) newErrors.subject = 'Ziyaret konusu zorunludur';
    if (!report.date) newErrors.date = 'Tarih zorunludur';
    if (!report.time) newErrors.time = 'Saat zorunludur';
    
    // Takip gerekiyorsa takip tarihi de zorunlu
    if (report.follow_up_required && !report.follow_up_date) {
      newErrors.follow_up_date = 'Takip tarihi zorunludur';
    }

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
        await visitReportService.update(Number(id), report);
        setSuccess('Ziyaret raporu başarıyla güncellendi');
      } else {
        await visitReportService.create(report);
        setSuccess('Ziyaret raporu başarıyla oluşturuldu');
      }

      setTimeout(() => {
        navigate('/visit-reports');
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

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setReport(prev => ({ ...prev, [name]: checked }));
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

  const handleFollowUpDateChange = (date: Date | null) => {
    if (date) {
      setReport(prev => ({ ...prev, follow_up_date: format(date, 'yyyy-MM-dd') }));
      
      // Mevcut hata varsa temizle
      if (errors.follow_up_date) {
        setErrors(prev => ({ ...prev, follow_up_date: '' }));
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
    <FormContainer 
      title={isEditMode ? 'Ziyaret Raporu Düzenle' : 'Yeni Ziyaret Raporu'}
      error={error}
      success={success}
    >
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
              <TextField
                name="subject"
                label="Ziyaret Konusu"
                value={report.subject || ''}
                onChange={handleInputChange}
                fullWidth
                error={!!errors.subject}
                helperText={errors.subject}
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
              <TextField
                name="contact_person"
                label="İletişim Kurduğunuz Kişi"
                value={report.contact_person || ''}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    name="follow_up_required"
                    checked={report.follow_up_required || false}
                    onChange={handleSwitchChange}
                    color="primary"
                  />
                }
                label="Takip Gerekiyor"
              />
            </Grid>
            
            {report.follow_up_required && (
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                  <DatePicker
                    label="Takip Tarihi"
                    value={report.follow_up_date ? new Date(report.follow_up_date) : null}
                    onChange={handleFollowUpDateChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.follow_up_date,
                        helperText: errors.follow_up_date
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            )}
            
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
            
            <FormButtons 
              isEditMode={isEditMode}
              isSaving={saving}
              onCancel={() => navigate('/visit-reports')}
            />
          </Grid>
        </form>
    </FormContainer>
  );
};