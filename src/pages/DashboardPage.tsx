import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Box, Card, CardContent, Divider, CircularProgress, useTheme } from '@mui/material';
import { Business, LocalHospital, Description, EventNote } from '@mui/icons-material';
import { clinicService, surgeryReportService, visitReportService, proposalService } from '../services/apiService';
import { Clinic, SurgeryReport, VisitReport, Proposal } from '../types';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [surgeryReports, setSurgeryReports] = useState<SurgeryReport[]>([]);
  const [visitReports, setVisitReports] = useState<VisitReport[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Tüm verileri paralel olarak al
        const [clinicsData, surgeryReportsData, visitReportsData, proposalsData] = await Promise.all([
          clinicService.getAll(),
          surgeryReportService.getAll(),
          visitReportService.getAll(),
          proposalService.getAll()
        ]);
        
        setClinics(clinicsData);
        setSurgeryReports(surgeryReportsData);
        setVisitReports(visitReportsData);
        setProposals(proposalsData);
      } catch (error) {
        console.error('Veri alınırken hata oluştu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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
      <Typography variant="h4" component="h1" gutterBottom>
        Gösterge Paneli
      </Typography>
      
      {/* Özet Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: theme.palette.primary.light,
              color: theme.palette.primary.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              }
            }}
            onClick={() => navigate('/clinics')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Business sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Klinikler
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {clinics.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: theme.palette.secondary.light,
              color: theme.palette.secondary.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              }
            }}
            onClick={() => navigate('/surgery-reports')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocalHospital sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Ameliyatlar
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {surgeryReports.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: theme.palette.success.light,
              color: theme.palette.success.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              }
            }}
            onClick={() => navigate('/visit-reports')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EventNote sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Ziyaretler
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {visitReports.length}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              bgcolor: theme.palette.warning.light,
              color: theme.palette.warning.contrastText,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              }
            }}
            onClick={() => navigate('/proposals')}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Description sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Teklifler
              </Typography>
            </Box>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {proposals.length}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Son Etkinlikler */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Son Ameliyatlar
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {surgeryReports.slice(0, 5).map((report) => (
              <Card 
                key={report.id} 
                sx={{ 
                  mb: 2, 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }
                }}
                onClick={() => navigate(`/surgery-reports/${report.id}`)}
              >
                <CardContent>
                  <Typography variant="subtitle1" component="div">
                    {report.surgery_type}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hasta: {report.patient_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Klinik: {report.clinic?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tarih: {formatDate(report.date)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            
            {surgeryReports.length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
                Henüz ameliyat raporu bulunmuyor
              </Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Son Ziyaretler
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {visitReports.slice(0, 5).map((report) => (
              <Card 
                key={report.id} 
                sx={{ 
                  mb: 2, 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }
                }}
                onClick={() => navigate(`/visit-reports/${report.id}`)}
              >
                <CardContent>
                  <Typography variant="subtitle1" component="div">
                    {report.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Klinik: {report.clinic?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    İlgili Kişi: {report.contact_person || 'Belirtilmemiş'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tarih: {formatDate(report.date)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            
            {visitReports.length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2 }}>
                Henüz ziyaret raporu bulunmuyor
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};