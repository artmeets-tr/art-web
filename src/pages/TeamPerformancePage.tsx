import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider,
  LinearProgress,
  Chip,
  useTheme,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import formatDistance from 'date-fns/formatDistance';
import { tr as trLocale } from 'date-fns/locale';
import { userService } from '../services/apiService';

interface PerformanceData {
  userId: string;
  userName: string;
  role: string;
  proposalsCreated: number;
  proposalsApproved: number;
  proposalsRejected: number;
  surgeryReportsCreated: number;
  visitReportsCreated: number;
  totalActions: number;
  conversionRate: number;
  regionId?: number;
  regionName?: string;
  lastActive?: string;
  avatar?: string;
}

interface TimeRangeOption {
  label: string;
  value: 'week' | 'month' | 'quarter' | 'year';
  days: number;
}

const timeRangeOptions: TimeRangeOption[] = [
  { label: 'Bu Hafta', value: 'week', days: 7 },
  { label: 'Bu Ay', value: 'month', days: 30 },
  { label: 'Bu Çeyrek', value: 'quarter', days: 90 },
  { label: 'Bu Yıl', value: 'year', days: 365 },
];

export const TeamPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [topPerformers, setTopPerformers] = useState<PerformanceData[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [regionFilter, setRegionFilter] = useState<number | null>(null);
  const [regions, setRegions] = useState<{ id: number, name: string }[]>([]);
  const [chartData, setChartData] = useState<any>({});
  const [tabValue, setTabValue] = useState(0);

  const fetchRegions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  }, []);

  const fetchPerformanceData = useCallback(async (currentUser: any) => {
    try {
      const timeOption = timeRangeOptions.find((option) => option.value === timeRange);
      const daysAgo = timeOption ? timeOption.days : 30;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, user_regions(region_id, regions(name))')
        .eq(regionFilter ? 'user_regions.region_id' : 'id', regionFilter || 'id');

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        setPerformanceData([]);
        setTopPerformers([]);
        return;
      }

      // Get performance data for each user
      const performancePromises = users.map(async (user: any) => {
        // Get proposals created
        const { data: proposalsCreated, error: proposalsError } = await supabase
          .from('proposals')
          .select('id, status, created_at')
          .eq('created_by', user.id)
          .gte('created_at', dateThreshold.toISOString());

        if (proposalsError) throw proposalsError;

        // Get visit reports created
        const { data: visitReports, error: visitReportsError } = await supabase
          .from('visit_reports')
          .select('id, created_at')
          .eq('created_by', user.id)
          .gte('created_at', dateThreshold.toISOString());

        if (visitReportsError) throw visitReportsError;

        // Get surgery reports created
        const { data: surgeryReports, error: surgeryReportsError } = await supabase
          .from('surgery_reports')
          .select('id, created_at')
          .eq('created_by', user.id)
          .gte('created_at', dateThreshold.toISOString());

        if (surgeryReportsError) throw surgeryReportsError;

        // Count approved and rejected proposals
        const proposalsApproved = proposalsCreated?.filter((p: any) => p.status === 'approved').length || 0;
        const proposalsRejected = proposalsCreated?.filter((p: any) => p.status === 'rejected').length || 0;

        // Calculate total actions and conversion rate
        const proposalsCreatedCount = proposalsCreated?.length || 0;
        const visitReportsCreatedCount = visitReports?.length || 0;
        const surgeryReportsCreatedCount = surgeryReports?.length || 0;
        const totalActions = proposalsCreatedCount + visitReportsCreatedCount + surgeryReportsCreatedCount;
        const conversionRate = proposalsCreatedCount > 0 
          ? Math.round((proposalsApproved / proposalsCreatedCount) * 100) 
          : 0;

        // Get the user's region
        const userRegion = user.user_regions && user.user_regions.length > 0 
          ? { id: user.user_regions[0].region_id, name: user.user_regions[0].regions?.name } 
          : null;

        return {
          userId: user.id,
          userName: `${user.first_name} ${user.last_name}`,
          role: user.role,
          proposalsCreated: proposalsCreatedCount,
          proposalsApproved,
          proposalsRejected,
          surgeryReportsCreated: surgeryReportsCreatedCount,
          visitReportsCreated: visitReportsCreatedCount,
          totalActions,
          conversionRate,
          regionId: userRegion?.id,
          regionName: userRegion?.name,
          lastActive: user.last_sign_in_at,
          avatar: user.avatar_url,
        } as PerformanceData;
      });

      const performanceResults = await Promise.all(performancePromises);
      
      // Sort by total actions, descending
      performanceResults.sort((a: any, b: any) => b.totalActions - a.totalActions);
      setPerformanceData(performanceResults);
      
      // Set top performers (top 5)
      setTopPerformers(performanceResults.slice(0, 5));
      
      // Prepare chart data
      prepareChartData(performanceResults);
      
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  }, [timeRange, regionFilter]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          setUser(currentUser);
          await fetchRegions();
          await fetchPerformanceData(currentUser);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, fetchPerformanceData, fetchRegions]);

  const prepareChartData = (data: PerformanceData[]) => {
    // Prepare data for bar chart
    const barData = data.slice(0, 5).map(user => ({
      name: user.userName.split(' ')[0],
      proposals: user.proposalsCreated,
      visits: user.visitReportsCreated,
      surgeries: user.surgeryReportsCreated,
    }));

    // Prepare data for pie chart (by activity type)
    const totalProposals = data.reduce((sum, user) => sum + user.proposalsCreated, 0);
    const totalVisits = data.reduce((sum, user) => sum + user.visitReportsCreated, 0);
    const totalSurgeries = data.reduce((sum, user) => sum + user.surgeryReportsCreated, 0);

    const pieData = [
      { name: 'Teklifler', value: totalProposals, color: '#3f51b5' },
      { name: 'Ziyaretler', value: totalVisits, color: '#f50057' },
      { name: 'Ameliyatlar', value: totalSurgeries, color: '#4caf50' },
    ];

    setChartData({ barData, pieData });
  };

  const getCriteriaScore = (value: number, maxValue: number) => {
    return Math.min(1, Math.max(0, value / (maxValue || 1)));
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Bilinmiyor';
    return formatDistance(new Date(dateString), new Date(), { addSuffix: true, locale: trLocale });
  };

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
  };

  const handleRegionFilterChange = (event: any) => {
    setRegionFilter(event.target.value === 'all' ? null : event.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        Takım Performansı
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Filter controls */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Zaman Aralığı</InputLabel>
                  <Select
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    label="Zaman Aralığı"
                  >
                    {timeRangeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Bölge</InputLabel>
                  <Select
                    value={regionFilter === null ? 'all' : regionFilter}
                    onChange={handleRegionFilterChange}
                    label="Bölge"
                  >
                    <MenuItem value="all">Tüm Bölgeler</MenuItem>
                    {regions.map((region) => (
                      <MenuItem key={region.id} value={region.id}>{region.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Summary Cards */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">Toplam Kullanıcı</Typography>
                <Typography variant="h3">{performanceData.length}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">Toplam Aktivite</Typography>
                <Typography variant="h3">
                  {performanceData.reduce((sum, user) => sum + user.totalActions, 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">Ort. Dönüşüm</Typography>
                <Typography variant="h3">
                  {Math.round(performanceData.reduce((sum, user) => sum + user.conversionRate, 0) / (performanceData.length || 1))}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="performance tabs">
          <Tab label="Performans Sıralaması" />
          <Tab label="İstatistikler" />
        </Tabs>
      </Box>
      
      {/* Tab Panel content */}
      <div role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {performanceData.map((userData) => (
              <Grid item xs={12} md={6} lg={4} key={userData.userId}>
                <Card>
                  <CardHeader
                    avatar={
                      <Avatar src={userData.avatar || undefined}>
                        {userData.userName.substring(0, 1)}
                      </Avatar>
                    }
                    title={userData.userName}
                    subheader={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label={userData.role} color="primary" />
                        {userData.regionName && (
                          <Chip size="small" label={userData.regionName} variant="outlined" />
                        )}
                      </Box>
                    }
                  />
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Son aktiflik: {formatTimeAgo(userData.lastActive)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Teklifler</Typography>
                        <Typography variant="body2" fontWeight="bold">{userData.proposalsCreated}</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getCriteriaScore(userData.proposalsCreated, 10) * 100} 
                        sx={{ height: 8, borderRadius: 5, mb: 1 }}
                        color="primary"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Ziyaret Raporları</Typography>
                        <Typography variant="body2" fontWeight="bold">{userData.visitReportsCreated}</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getCriteriaScore(userData.visitReportsCreated, 15) * 100} 
                        sx={{ height: 8, borderRadius: 5, mb: 1 }}
                        color="secondary"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Ameliyat Raporları</Typography>
                        <Typography variant="body2" fontWeight="bold">{userData.surgeryReportsCreated}</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getCriteriaScore(userData.surgeryReportsCreated, 5) * 100} 
                        sx={{ height: 8, borderRadius: 5, mb: 1 }}
                        color="success"
                      />
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Toplam Aktivite</Typography>
                        <Typography variant="h6">{userData.totalActions}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Dönüşüm Oranı</Typography>
                        <Typography variant="h6" color={userData.conversionRate > 50 ? 'success.main' : 'error.main'}>
                          {userData.conversionRate}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </div>
      
      <div role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>İstatistikler Sayfası</Typography>
              <Typography>
                Grafik kütüphaneleri (Recharts) entegrasyonu tamamlanıp, kullanıcı performans istatistikleri görsel olarak burada sunulacaktır.
              </Typography>
            </Grid>
          </Grid>
        )}
      </div>
    </Box>
  );
}; 