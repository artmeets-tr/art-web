import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  InputAdornment,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton
} from '@mui/material';
import { 
  Search, 
  Add, 
  Visibility, 
  EventNote, 
  CalendarToday, 
  AccessTime, 
  Business,
  Person,
  Edit
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { visitReportService } from '../services/apiService';
import { VisitReport } from '../types';

export const VisitReportsPage: React.FC = () => {
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<VisitReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = reports.filter(report => 
        report.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.contact_person && report.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
      const data = await visitReportService.getAll();
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
          Ziyaret Raporları
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => navigate('/visit-reports/create')}
        >
          Yeni Rapor
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Konu, kişi veya klinik ara..."
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
                        <EventNote sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">{report.subject}</Typography>
                      </Box>
                      {report.follow_up_required && (
                        <Chip 
                          label="Takip Gerekli" 
                          color="warning"
                          size="small"
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <Business sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Klinik: {report.clinic?.name 
                        ? `${report.clinic.name} ${report.clinic.region?.name ? `(${report.clinic.region.name})` : ''}`
                        : <span style={{ color: 'red' }}>Klinik belirtilmemiş</span>}
                    </Typography>
                    
                    {report.contact_person && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <Person sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                        İlgili Kişi: {report.contact_person}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <CalendarToday sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Tarih: {formatDate(report.date)}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <AccessTime sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                      Saat: {report.time.substring(0, 5)}
                    </Typography>
                    
                    {report.follow_up_date && (
                      <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                        <Typography variant="body2">
                          <CalendarToday sx={{ fontSize: 'small', mr: 0.5, verticalAlign: 'middle' }} />
                          Takip Tarihi: {formatDate(report.follow_up_date)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/visit-reports/${report.id}`)}
                        sx={{ mr: 1 }}
                      >
                        Detay
                      </Button>
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => navigate(`/visit-reports/edit/${report.id}`)}
                      >
                        <Edit />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  {searchTerm ? 'Arama kriterlerine uygun ziyaret raporu bulunamadı' : 'Henüz ziyaret raporu bulunmuyor'}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}; 