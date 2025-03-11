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
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import { 
  Search, 
  Add, 
  Visibility, 
  LocalHospital, 
  CalendarToday, 
  AccessTime, 
  Person,
  Business
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { surgeryReportService } from '../services/apiService';
import { SurgeryReport } from '../types';

export const SurgeryReportsPage: React.FC = () => {
  const [reports, setReports] = useState<SurgeryReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<SurgeryReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = reports.filter(report => 
        report.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.surgery_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.clinic?.name && report.clinic.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredReports(filtered);
    } else {
      setFilteredReports(reports);
    }
  }, [searchTerm, reports]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await surgeryReportService.getAll();
      setReports(data);
      setFilteredReports(data);
    } catch (error) {
      console.error('Veri alınırken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'scheduled': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'scheduled': return 'Planlandı';
      case 'cancelled': return 'İptal Edildi';
      default: return 'Bilinmiyor';
    }
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
          Ameliyat Raporları
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => navigate('/surgery-reports/create')}
        >
          Yeni Rapor
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Hasta adı, ameliyat türü veya klinik ara..."
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

        <Grid container spacing={2}>
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Grid item xs={12} md={6} lg={4} key={report.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocalHospital sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">{report.surgery_type}</Typography>
                      </Box>
                      <Chip 
                        label={getStatusText(report.status)} 
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <Person sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Hasta: {report.patient_name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <CalendarToday sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Tarih: {formatDate(report.date)}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <AccessTime sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Saat: {report.time.substring(0, 5)}
                    </Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <Business sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Klinik: {report.clinic?.name 
                        ? `${report.clinic.name} ${report.clinic.region?.name ? `(${report.clinic.region.name})` : ''}`
                        : <span style={{ color: 'red' }}>Klinik belirtilmemiş</span>}
                    </Typography>
                    
                    {report.product && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Ürün: {report.product.name}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/surgery-reports/${report.id}`)}
                      >
                        Detay
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  {searchTerm ? 'Arama kriterlerine uygun ameliyat raporu bulunamadı' : 'Henüz ameliyat raporu bulunmuyor'}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}; 