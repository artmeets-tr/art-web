import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Button,
  ButtonGroup,
  Divider,
  useTheme,
  Avatar
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { userService } from '../services/apiService';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { tr as trLocale } from 'date-fns/locale';

interface AnalyticData {
  label: string;
  value: number;
  color: string;
}

interface UserPerformance {
  user: string;
  count: number;
}

interface ClinicPerformance {
  clinic: string;
  count: number;
}

export const AnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState({
    proposalsByStatus: [] as AnalyticData[],
    proposalsByRegion: [] as AnalyticData[],
    monthlyProposals: [] as { name: string; value: number }[],
    monthlyRevenue: [] as { name: string; value: number }[],
    clinicPerformance: [] as ClinicPerformance[],
    userPerformance: [] as UserPerformance[],
    productCategories: [] as AnalyticData[],
    conversionRate: 0,
    avgProcessingTime: 0
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchAnalytics(currentUser);
      }
    } catch (error) {
      console.error('Analytics data loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchAnalytics = async (currentUser: any) => {
    try {
      let dateThreshold = new Date();
      
      // Set date threshold based on selected time range
      switch (timeRange) {
        case 'week':
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case 'month':
          dateThreshold.setDate(dateThreshold.getDate() - 30);
          break;
        case 'quarter':
          dateThreshold.setDate(dateThreshold.getDate() - 90);
          break;
        case 'year':
          dateThreshold.setDate(dateThreshold.getDate() - 365);
          break;
      }
      
      // Fetch proposals
      let proposalsQuery = supabase
        .from('proposals')
        .select(`
          id, 
          status, 
          total_amount, 
          currency, 
          created_at, 
          approved_at,
          user_id,
          clinic_id
        `)
        .gte('created_at', dateThreshold.toISOString());
        
      // Bölge filtresi uygula (eğer bölge yöneticisi ise)
      if (currentUser.role === 'regional_manager' && currentUser.region_id) {
        // Önce bu bölgedeki klinikleri bul
        const { data: clinicData } = await supabase
          .from('clinics')
          .select('id')
          .eq('region_id', currentUser.region_id);
        
        if (clinicData && clinicData.length > 0) {
          const clinicIds = clinicData.map(c => c.id);
          proposalsQuery = proposalsQuery.in('clinic_id', clinicIds);
        }
      }
      
      const { data: proposals, error: proposalsError } = await proposalsQuery;
      
      if (proposalsError) {
        console.error('Teklif verileri alınırken hata:', proposalsError);
        throw proposalsError;
      }
      
      console.log('Analiz için teklifler:', proposals);
      
      // Teklifler yoksa, boş veri ile devam et
      if (!proposals || proposals.length === 0) {
        console.log('Herhangi bir teklif verisi bulunamadı.');
        // Boş varsayılan veriyi ayarla
        setAnalyticsData({
          proposalsByStatus: [],
          proposalsByRegion: [],
          monthlyProposals: [],
          monthlyRevenue: [],
          clinicPerformance: [],
          userPerformance: [],
          productCategories: [],
          conversionRate: 0,
          avgProcessingTime: 0
        });
        return;
      }
      
      // Klinik verilerini al
      const clinicIds = proposals.map(p => p.clinic_id).filter(Boolean);
      const { data: clinics, error: clinicsError } = await supabase
        .from('clinics')
        .select('id, name, region_id')
        .in('id', clinicIds);
      
      if (clinicsError) {
        console.error('Klinik verileri alınırken hata:', clinicsError);
      }
      
      console.log('Analiz için klinikler:', clinics);
      
      // Fetch region data
      const regionIds = clinics
        ? Array.from(new Set(clinics.map(c => c.region_id).filter(Boolean)))
        : [];
      
      const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name');
        
      if (regionsError) {
        console.error('Bölge verileri alınırken hata:', regionsError);
      }
      
      console.log('Analiz için bölgeler:', regions);
      
      // Kullanıcı verilerini al
      let users = null;
      const userIds = proposals.map(p => p.user_id).filter(Boolean);
      
      if (userIds.length > 0) {
        try {
          // Supabase'e göndermeden önce userIds'in benzersiz olduğundan emin ol
          const uniqueUserIds = Array.from(new Set(userIds.map(id => id.toString())));
          
          // Diziyi string olarak formatlama
          console.log('Kullanıcı ID\'leri:', uniqueUserIds);
          
          // Tek tek kullanıcıları çek (in operatörü 400 hatası veriyor)
          const userPromises = uniqueUserIds.map(userId => 
            supabase
              .from('users')
              .select('id, first_name, last_name')
              .eq('id', userId)
              .single()
          );
          
          const userResults = await Promise.all(userPromises);
          users = userResults
            .filter(result => !result.error)
            .map(result => result.data);
          
          console.log('Analiz için kullanıcılar:', users);
        } catch (error) {
          console.error('Kullanıcı verileri alınırken hata:', error);
        }
      } else {
        console.log('Kullanıcı ID\'si bulunamadı');
      }
      
      // Ürün verilerini al
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, category');
        
      if (productsError) {
        console.error('Ürün verileri alınırken hata:', productsError);
      }
      
      console.log('Analiz için ürünler:', products);
      
      // Process proposals by status
      const statusGroups: Record<string, number> = {};
      proposals?.forEach((proposal: any) => {
        statusGroups[proposal.status] = (statusGroups[proposal.status] || 0) + 1;
      });
      
      // Durum renkleri
      const statusColors = {
        pending: '#f1c40f',     // Sarı
        approved: '#2ecc71',    // Yeşil
        rejected: '#e74c3c',    // Kırmızı
        expired: '#95a5a6',     // Gri
        contract_received: '#3498db', // Mavi
        in_transfer: '#9b59b6', // Mor
        delivered: '#1abc9c'    // Turkuaz
      };
      
      // Durum verilerini hazırla
      const proposalsByStatus = Object.keys(statusGroups).map(status => ({
        label: getStatusName(status),
        value: statusGroups[status],
        color: statusColors[status as keyof typeof statusColors] || '#34495e'
      }));
      
      // Bölge verilerini hazırla
      const regionGroups: Record<string, number> = {};
      
      if (clinics && regions) {
        clinics.forEach((clinic) => {
          if (clinic.region_id) {
            // Bu kliniğe ait teklif sayısını bul
            const proposalCount = proposals.filter(p => p.clinic_id === clinic.id).length;
            // Bu bölgeye ait teklif sayısını artır
            regionGroups[clinic.region_id] = (regionGroups[clinic.region_id] || 0) + proposalCount;
          }
        });
      }
      
      // Bölgelerin renk paleti
      const regionColors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#e74c3c', '#34495e'];
      
      // Bölge verilerini formatla
      const proposalsByRegion = Object.keys(regionGroups).map((regionId, index) => {
        const region = regions?.find((r: any) => r.id.toString() === regionId);
        return {
          label: region?.name || 'Bilinmiyor',
          value: regionGroups[regionId],
          color: regionColors[index % regionColors.length]
        };
      });
      
      // Dönüşüm oranını ve işlem süresini hesapla
      const conversionRate = calculateConversionRate(proposals);
      const avgProcessingTime = calculateProcessingTime(proposals);
      
      // Verileri güncelle
      setAnalyticsData({
        ...analyticsData,
        proposalsByStatus,
        proposalsByRegion,
        conversionRate,
        avgProcessingTime,
        // Diğer özellikler mevcut değerlerini korusun
        monthlyProposals: analyticsData.monthlyProposals,
        monthlyRevenue: analyticsData.monthlyRevenue,
        clinicPerformance: analyticsData.clinicPerformance,
        userPerformance: analyticsData.userPerformance,
        productCategories: analyticsData.productCategories
      });
      
    } catch (error) {
      console.error('Analiz verileri işlenirken hata:', error);
    }
  };
  
  // Dönüşüm oranını hesapla: onaylanan teklifler / toplam teklifler
  const calculateConversionRate = (proposals: any[]) => {
    if (!proposals || proposals.length === 0) return 0;
    
    const approvedCount = proposals.filter(p => p.status === 'approved' || p.status === 'contract_received' ||
      p.status === 'in_transfer' || p.status === 'delivered').length;
    
    return (approvedCount / proposals.length) * 100;
  };
  
  // Ortalama işlem süresini hesapla: onaylanma süresi - oluşturulma süresi (gün olarak)
  const calculateProcessingTime = (proposals: any[]) => {
    if (!proposals || proposals.length === 0) return 0;
    
    const proposalsWithApproval = proposals.filter(p => p.status === 'approved' && p.approved_at);
    
    if (proposalsWithApproval.length === 0) return 0;
    
    let totalProcessingDays = 0;
    
    proposalsWithApproval.forEach(p => {
      const createdDate = new Date(p.created_at);
      const approvedDate = new Date(p.approved_at);
      const diffTime = Math.abs(approvedDate.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalProcessingDays += diffDays;
    });
    
    return totalProcessingDays / proposalsWithApproval.length;
  };

  const handleTimeRangeChange = (range: 'week' | 'month' | 'quarter' | 'year') => {
    setTimeRange(range);
  };

  const getStatusName = (status: string): string => {
    switch (status) {
      case 'pending': return 'Bekleyen';
      case 'approved': return 'Onaylanan';
      case 'rejected': return 'Reddedilen';
      case 'expired': return 'Süresi Dolmuş';
      case 'contract_received': return 'Sözleşme Alındı';
      case 'in_transfer': return 'Transfer Edildi';
      case 'delivered': return 'Teslim Edildi';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
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
      <Typography variant="h4" component="h1" gutterBottom>
        Analitik Gösterge Paneli
      </Typography>
      
      {/* Time Range Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography variant="body1">Zaman Aralığı:</Typography>
          </Grid>
          <Grid item>
            <ButtonGroup variant="outlined" aria-label="time range selection">
              <Button 
                onClick={() => handleTimeRangeChange('week')} 
                variant={timeRange === 'week' ? 'contained' : 'outlined'}
              >
                Hafta
              </Button>
              <Button 
                onClick={() => handleTimeRangeChange('month')} 
                variant={timeRange === 'month' ? 'contained' : 'outlined'}
              >
                Ay
              </Button>
              <Button 
                onClick={() => handleTimeRangeChange('quarter')} 
                variant={timeRange === 'quarter' ? 'contained' : 'outlined'}
              >
                Çeyrek
              </Button>
              <Button 
                onClick={() => handleTimeRangeChange('year')} 
                variant={timeRange === 'year' ? 'contained' : 'outlined'}
              >
                Yıl
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%', backgroundColor: theme.palette.primary.main, color: 'white' }}>
            <Typography variant="h6" gutterBottom>Toplam Teklif</Typography>
            <Typography variant="h3">
              {analyticsData.proposalsByStatus.reduce((total, item) => total + item.value, 0)}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%', backgroundColor: theme.palette.success.main, color: 'white' }}>
            <Typography variant="h6" gutterBottom>Dönüşüm Oranı</Typography>
            <Typography variant="h3">
              {formatPercentage(analyticsData.conversionRate)}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%', backgroundColor: theme.palette.error.main, color: 'white' }}>
            <Typography variant="h6" gutterBottom>Toplam Gelir</Typography>
            <Typography variant="h3">
              {formatCurrency(analyticsData.monthlyRevenue.reduce((total, item) => total + item.value, 0))}
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, height: '100%', backgroundColor: theme.palette.warning.main, color: 'white' }}>
            <Typography variant="h6" gutterBottom>İşlem Süresi</Typography>
            <Typography variant="h3">
              {analyticsData.avgProcessingTime.toFixed(1)} gün
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts - First Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Aylık Teklif Sayısı</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyProposals}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3f51b5" activeDot={{ r: 8 }} name="Teklif Sayısı" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Teklif Durumları</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.proposalsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="label"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {analyticsData.proposalsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} teklif`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts - Second Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Bölgelere Göre Teklifler</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.proposalsByRegion.map(item => ({ name: item.label, value: item.value, color: item.color }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Teklif Sayısı">
                  {analyticsData.proposalsByRegion.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Aylık Gelir</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => new Intl.NumberFormat('tr-TR', { notation: 'compact', compactDisplay: 'short' }).format(value)} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Gelir']} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Gelir" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Performance Cards */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>En İyi Klinikler</Typography>
            {analyticsData.clinicPerformance.length > 0 ? (
              analyticsData.clinicPerformance.map((clinic, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {clinic.clinic.charAt(0)}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Typography variant="body1">{clinic.clinic}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {clinic.count} teklif
                      </Typography>
                    </Grid>
                  </Grid>
                  {index < analyticsData.clinicPerformance.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">Veri yok</Typography>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>En İyi Kullanıcılar</Typography>
            {analyticsData.userPerformance.length > 0 ? (
              analyticsData.userPerformance.map((user, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item>
                      <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                        {user.user.charAt(0)}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Typography variant="body1">{user.user}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.count} teklif
                      </Typography>
                    </Grid>
                  </Grid>
                  {index < analyticsData.userPerformance.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">Veri yok</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 