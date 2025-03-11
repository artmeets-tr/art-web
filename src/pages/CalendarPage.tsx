import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  DateCalendar,
  LocalizationProvider,
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import trLocale from 'date-fns/locale/tr';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import isSameDay from 'date-fns/isSameDay';
import {
  Today,
  Event as EventIcon,
  Description,
  LocalHospital,
  CalendarMonth,
  EventNote,
  CheckCircle,
  Cancel,
  HourglassEmpty,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { userService } from '../services/apiService';

// Etkinlik tipi
type EventType = 'proposal' | 'surgery' | 'visit';

// Etkinlik veri modeli
interface Event {
  id: number;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  location?: string;
  status?: string;
  clinicName?: string;
}

// Tarih işaretleme arayüzü
interface MarkedDates {
  [date: string]: {
    marked: boolean;
    dotColor: string;
    selectedColor?: string;
    selected?: boolean;
  };
}

export const CalendarPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventFilter, setEventFilter] = useState<EventType | null>(null);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<any | null>(null);

  const fetchEventsFromDB = useCallback(async () => {
    setLoading(true);
    
    try {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
      
      // Teklifleri al
      const { data: proposals, error: proposalError } = await supabase
        .from('proposals')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          clinic_id,
          clinics (
            name,
            address
          )
        `);
      
      if (proposalError) throw proposalError;
      
      // Ameliyat raporlarını al
      const { data: surgeries, error: surgeryError } = await supabase
        .from('surgery_reports')
        .select(`
          id,
          date,
          time,
          patient_name,
          surgery_type,
          status,
          clinic_id,
          clinics (
            name,
            address
          )
        `);
      
      if (surgeryError) throw surgeryError;
      
      // Ziyaret raporlarını al
      const { data: visits, error: visitError } = await supabase
        .from('visit_reports')
        .select(`
          id,
          date,
          time,
          subject,
          follow_up_required,
          follow_up_date,
          clinic_id,
          clinics (
            name,
            address
          )
        `);
      
      if (visitError) throw visitError;
      
      // Etkinlikleri formatla ve birleştir
      const proposalEvents: Event[] = (proposals || []).map((proposal: any) => ({
        id: proposal.id,
        title: `Teklif: ${proposal.clinics?.name || 'Bilinmeyen Klinik'}`,
        date: format(new Date(proposal.created_at), 'yyyy-MM-dd'),
        type: 'proposal',
        status: proposal.status,
        clinicName: proposal.clinics?.name || undefined,
        location: proposal.clinics?.address || undefined
      }));
      
      const surgeryEvents: Event[] = (surgeries || []).map((surgery: any) => ({
        id: surgery.id,
        title: `Ameliyat: ${surgery.patient_name} - ${surgery.surgery_type}`,
        date: surgery.date,
        time: surgery.time,
        type: 'surgery',
        status: surgery.status,
        clinicName: surgery.clinics?.name || undefined,
        location: surgery.clinics?.address || undefined
      }));
      
      const visitEvents: Event[] = (visits || []).map((visit: any) => ({
        id: visit.id,
        title: `Ziyaret: ${visit.subject}`,
        date: visit.date,
        time: visit.time,
        type: 'visit',
        status: visit.follow_up_required ? 'follow_up' : 'completed',
        clinicName: visit.clinics?.name || undefined,
        location: visit.clinics?.address || undefined
      }));
      
      // Tüm etkinlikleri birleştir
      const allEvents = [...proposalEvents, ...surgeryEvents, ...visitEvents];
      setEvents(allEvents);
      
      // Takvim işaretlerini oluştur
      createMarkedDates(allEvents);
      
      // Seçili günün etkinliklerini güncelle
      updateSelectedDateEvents(selectedDate, allEvents);
      
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchEventsFromDB();
  }, [fetchEventsFromDB]);

  const createMarkedDates = (eventList: Event[]) => {
    const markers: MarkedDates = {};
    
    eventList.forEach(event => {
      if (markers[event.date]) {
        // Tarih zaten işaretli, rengi güncelle
        markers[event.date].dotColor = '#1E88E5'; // Birden fazla etkinlik için mavi
      } else {
        // Yeni tarih işaretle
        markers[event.date] = {
          marked: true,
          dotColor: getEventColor(event.type)
        };
      }
      
      // Seçili tarih işaretlemesi
      if (selectedDate && isSameDay(parse(event.date, 'yyyy-MM-dd', new Date()), selectedDate)) {
        markers[event.date].selected = true;
        markers[event.date].selectedColor = theme.palette.primary.light;
      }
    });
    
    setMarkedDates(markers);
  };

  const updateSelectedDateEvents = (date: Date, eventList: Event[] = events) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const filteredEvents = eventList.filter(event => event.date === formattedDate);
    
    // Etkinlikleri filtreye göre sırala
    if (eventFilter) {
      const filtered = filteredEvents.filter(event => event.type === eventFilter);
      setSelectedDateEvents(filtered);
    } else {
      setSelectedDateEvents(filteredEvents);
    }
  };

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(newDate);
      updateSelectedDateEvents(newDate);
      
      // Takvim işaretlerini güncelle
      const updatedMarkedDates = { ...markedDates };
      
      // Önceki seçimi temizle
      Object.keys(updatedMarkedDates).forEach(dateKey => {
        if (updatedMarkedDates[dateKey].selected) {
          updatedMarkedDates[dateKey].selected = false;
          delete updatedMarkedDates[dateKey].selectedColor;
        }
      });
      
      // Yeni seçimi ekle
      const dateKey = format(newDate, 'yyyy-MM-dd');
      if (updatedMarkedDates[dateKey]) {
        updatedMarkedDates[dateKey].selected = true;
        updatedMarkedDates[dateKey].selectedColor = theme.palette.primary.light;
      } else {
        updatedMarkedDates[dateKey] = {
          marked: false,
          dotColor: 'transparent',
          selected: true,
          selectedColor: theme.palette.primary.light
        };
      }
      
      setMarkedDates(updatedMarkedDates);
    }
  };

  const getEventColor = (type: EventType): string => {
    switch (type) {
      case 'proposal': return theme.palette.info.main;
      case 'surgery': return theme.palette.error.main;
      case 'visit': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const getFilteredEvents = (): Event[] => {
    if (eventFilter) {
      return selectedDateEvents.filter(event => event.type === eventFilter);
    }
    return selectedDateEvents;
  };

  const getEventTypeTitle = (type: EventType): string => {
    switch (type) {
      case 'proposal': return 'Teklif';
      case 'surgery': return 'Ameliyat';
      case 'visit': return 'Ziyaret';
      default: return 'Etkinlik';
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'proposal': return <Description color="info" />;
      case 'surgery': return <LocalHospital color="error" />;
      case 'visit': return <EventNote color="success" />;
      default: return <EventIcon />;
    }
  };

  const getEventStatusText = (event: Event): string => {
    if (!event.status) return 'Bilinmiyor';
    
    if (event.type === 'proposal') {
      switch (event.status) {
        case 'pending': return 'Beklemede';
        case 'approved': return 'Onaylandı';
        case 'rejected': return 'Reddedildi';
        case 'expired': return 'Süresi Doldu';
        case 'contract_received': return 'Sözleşme Alındı';
        case 'in_transfer': return 'Transferde';
        case 'delivered': return 'Teslim Edildi';
        default: return event.status;
      }
    } else if (event.type === 'surgery') {
      switch (event.status) {
        case 'scheduled': return 'Planlandı';
        case 'completed': return 'Tamamlandı';
        case 'cancelled': return 'İptal Edildi';
        default: return event.status;
      }
    } else if (event.type === 'visit') {
      return event.status === 'follow_up' ? 'Takip Gerekli' : 'Tamamlandı';
    }
    
    return event.status;
  };

  const getEventStatusColor = (event: Event): string => {
    if (!event.status) return theme.palette.grey[500];
    
    if (event.type === 'proposal') {
      switch (event.status) {
        case 'pending': return theme.palette.warning.main;
        case 'approved': return theme.palette.success.main;
        case 'rejected': return theme.palette.error.main;
        case 'expired': return theme.palette.grey[500];
        case 'contract_received': 
        case 'in_transfer':
        case 'delivered': return theme.palette.info.main;
        default: return theme.palette.grey[500];
      }
    } else if (event.type === 'surgery') {
      switch (event.status) {
        case 'scheduled': return theme.palette.info.main;
        case 'completed': return theme.palette.success.main;
        case 'cancelled': return theme.palette.error.main;
        default: return theme.palette.grey[500];
      }
    } else if (event.type === 'visit') {
      return event.status === 'follow_up' ? theme.palette.warning.main : theme.palette.success.main;
    }
    
    return theme.palette.grey[500];
  };

  const formatSelectedDate = (): string => {
    if (!selectedDate) return 'Tarih seçilmedi';
    
    return format(selectedDate, 'd MMMM yyyy EEEE', { locale: trLocale });
  };

  const handleEventPress = (event: Event) => {
    // Etkinlik tipine göre ilgili sayfaya yönlendir
    switch (event.type) {
      case 'proposal':
        navigate(`/proposals/${event.id}`);
        break;
      case 'surgery':
        navigate(`/surgery-reports/${event.id}`);
        break;
      case 'visit':
        navigate(`/visit-reports/${event.id}`);
        break;
    }
  };

  const getStatusIcon = (event: Event) => {
    if (!event.status) return <HourglassEmpty />;
    
    if (event.type === 'proposal') {
      switch (event.status) {
        case 'pending': return <HourglassEmpty color="warning" />;
        case 'approved': return <CheckCircle color="success" />;
        case 'rejected': return <Cancel color="error" />;
        default: return <HourglassEmpty />;
      }
    } else if (event.type === 'surgery') {
      switch (event.status) {
        case 'scheduled': return <HourglassEmpty color="info" />;
        case 'completed': return <CheckCircle color="success" />;
        case 'cancelled': return <Cancel color="error" />;
        default: return <HourglassEmpty />;
      }
    } else if (event.type === 'visit') {
      return event.status === 'follow_up' ? <HourglassEmpty color="warning" /> : <CheckCircle color="success" />;
    }
    
    return <HourglassEmpty />;
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card 
      sx={{ 
        mb: 2, 
        borderLeft: `4px solid ${getEventColor(event.type)}`,
        cursor: 'pointer'
      }}
      onClick={() => handleEventPress(event)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getEventIcon(event.type)}
            <Typography variant="subtitle1">
              {event.title}
            </Typography>
          </Box>
          
          <Chip 
            label={getEventStatusText(event)} 
            size="small" 
            color="default"
            sx={{ backgroundColor: getEventStatusColor(event), color: 'white' }} 
          />
        </Box>
        
        {event.time && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Today fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {event.time}
            </Typography>
          </Box>
        )}
        
        {event.clinicName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocalHospital fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {event.clinicName}
            </Typography>
          </Box>
        )}
        
        {event.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarMonth fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {event.location}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

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
        Takvim
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: { xs: 2, md: 0 } }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={trLocale}>
              <DateCalendar
                value={selectedDate}
                onChange={handleDateChange}
              />
            </LocalizationProvider>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Filtreler
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label="Tümü"
                onClick={() => setEventFilter(null)}
                color={eventFilter === null ? 'primary' : 'default'}
                variant={eventFilter === null ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Teklifler"
                onClick={() => setEventFilter('proposal')}
                color={eventFilter === 'proposal' ? 'primary' : 'default'}
                variant={eventFilter === 'proposal' ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Ameliyatlar"
                onClick={() => setEventFilter('surgery')}
                color={eventFilter === 'surgery' ? 'primary' : 'default'}
                variant={eventFilter === 'surgery' ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Ziyaretler"
                onClick={() => setEventFilter('visit')}
                color={eventFilter === 'visit' ? 'primary' : 'default'}
                variant={eventFilter === 'visit' ? 'filled' : 'outlined'}
              />
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                startIcon={<EventIcon />}
                fullWidth
                onClick={() => navigate('/proposals/create')}
              >
                Yeni Teklif Oluştur
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {formatSelectedDate()} Etkinlikleri
            </Typography>
            
            {getFilteredEvents().length > 0 ? (
              <Box sx={{ mt: 2 }}>
                {getFilteredEvents().map((event) => (
                  <EventCard key={`${event.type}-${event.id}`} event={event} />
                ))}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EventIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Bu tarihte etkinlik bulunmuyor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Başka bir tarih seçin veya yeni bir etkinlik oluşturun
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}; 