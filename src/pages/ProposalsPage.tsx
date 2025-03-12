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
  TextField, 
  InputAdornment,
  Chip,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  Search, 
  Add, 
  Visibility, 
  Business, 
  AttachMoney,
  Edit,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { proposalService, userService } from '../services/apiService';
import { Proposal, User } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`proposal-tabpanel-${index}`}
      aria-labelledby={`proposal-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const ProposalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const filterProposals = useCallback((data = proposals) => {
    if (!data) return;
    
    const filtered = data.filter(proposal => {
      const matchesSearch = !searchTerm || 
        proposal.clinic?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.total_amount.toString().includes(searchTerm);
        
      if (tabValue === 0) return matchesSearch; // Tümü
      if (tabValue === 1) return matchesSearch && proposal.status === 'pending'; // Bekleyenler
      if (tabValue === 2) return matchesSearch && proposal.status === 'approved'; // Onaylananlar
      if (tabValue === 3) return matchesSearch && proposal.status === 'rejected'; // Reddedilenler
      if (tabValue === 4) return matchesSearch && ['contract_received', 'in_transfer', 'delivered'].includes(proposal.status); // Tamamlananlar
      
      return matchesSearch;
    });
    
    setFilteredProposals(filtered);
  }, [searchTerm, tabValue, proposals]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Her sorguda cache'i önlemek için timestamp ekleyelim
      const timestamp = new Date().getTime();
      console.log(`Teklifler yükleniyor... ${timestamp}`);
      const data = await proposalService.getAll();
      
      console.log('Yüklenen teklifler:', data.length);
      console.log('Kullanıcı rolü:', currentUser?.role);
      
      // Teklifleri kontrol et
      if (data.length > 0) {
        // Eğer saha kullanıcısı ise, teklifleri logla
        if (currentUser?.role === 'field_user') {
          console.log('Saha kullanıcısının teklifleri:', data.map(p => ({ 
            id: p.id, 
            status: p.status, 
            user_id: p.user_id, 
            current_user_id: currentUser?.id
          })));
        }
      }
      
      setProposals(data);
      filterProposals(data);
    } catch (error) {
      console.error('Teklifler alınırken hata:', error);
      setMessage({ type: 'error', text: 'Teklifler yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, filterProposals]);

  const loadUser = useCallback(async () => {
    try {
      const user = await userService.getCurrentUser();
      setCurrentUser(user);
      // Kullanıcı bilgisi yüklendikten sonra teklifleri yükle
      fetchData();
    } catch (error) {
      console.error('Kullanıcı bilgisi alınırken hata:', error);
    }
  }, [fetchData]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Sekme değiştiğinde teklifleri yeniden yükle
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [tabValue, currentUser, fetchData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('Sekme değişti:', newValue);
    setTabValue(newValue);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'default';
      case 'contract_received': return 'info';
      case 'in_transfer': return 'info';
      case 'delivered': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'expired': return 'Süresi Doldu';
      case 'contract_received': return 'Sözleşme Alındı';
      case 'in_transfer': return 'Sevkiyatta';
      case 'delivered': return 'Teslim Edildi';
      default: return 'Bilinmiyor';
    }
  };

  // Durum değiştirme dialog'unu aç
  const handleOpenStatusDialog = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setNewStatus(proposal.status);
    setStatusNotes(proposal.notes || '');
    setStatusDialogOpen(true);
  };

  // Durum değiştirme dialog'unu kapat
  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
    setSelectedProposal(null);
    setNewStatus('');
    setStatusNotes('');
  };

  // Durum güncelleme işlemi
  const handleUpdateStatus = async () => {
    if (!selectedProposal || !newStatus) return;
    
    try {
      setProcessing(true);
      await proposalService.updateStatus(selectedProposal.id, newStatus as any, statusNotes);
      setMessage({ type: 'success', text: 'Teklif durumu başarıyla güncellendi' });
      fetchData(); // Verileri yeniden yükle
      handleCloseStatusDialog();
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
      setMessage({ type: 'error', text: 'Durum güncellenirken bir hata oluştu' });
    } finally {
      setProcessing(false);
    }
  };

  // Mesaj kapatma
  const handleCloseMessage = () => {
    setMessage(null);
  };

  const canEditStatus = (proposal: Proposal) => {
    // Admin ve manager her zaman durumu değiştirebilir
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      return true;
    }
    
    // Diğer kullanıcılar tekliflerin sadece belirli durumlarda durumlarını değiştirebilirler
    // Saha kullanıcıları, teklif onaylandıktan sonra süreç adımlarını değiştirebilir
    if (currentUser?.id === proposal.user_id) {
      // Eğer teklif onaylandıysa durumları değiştirebilir
      if (proposal.status === 'approved') {
        return true;
      }
      // Beklemedeyse veya reddedildiyse de değiştirebilir
      if (proposal.status === 'pending' || proposal.status === 'rejected') {
        return true;
      }
    }
    
    return false;
  };

  // Düzenleme izinleri kontrolü
  const canEditProposal = (proposal: Proposal) => {
    // Admin ve manager her zaman düzenleyebilir
    if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
      return true;
    }
    
    // Diğer kullanıcılar sadece kendi tekliflerini ve sadece "pending" durumunda olanları düzenleyebilir
    return currentUser?.id === proposal.user_id && proposal.status === 'pending';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Teklifler</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchData}
          >
            Yenile
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={() => navigate('/proposals/new')}
          >
            Yeni Teklif
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={3} sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable" 
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Tümü" id="proposal-tab-0" aria-controls="proposal-tabpanel-0" />
          <Tab label="Bekleyenler" id="proposal-tab-1" aria-controls="proposal-tabpanel-1" />
          <Tab label="Onaylananlar" id="proposal-tab-2" aria-controls="proposal-tabpanel-2" />
          <Tab label="Reddedilenler" id="proposal-tab-3" aria-controls="proposal-tabpanel-3" />
          <Tab label="Tamamlananlar" id="proposal-tab-4" aria-controls="proposal-tabpanel-4" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Klinik, kullanıcı veya tutar ara..."
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <ProposalTable 
          proposals={filteredProposals} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          navigate={navigate}
          onStatusChange={handleOpenStatusDialog}
          canEditStatus={canEditStatus}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ProposalTable 
          proposals={filteredProposals} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          navigate={navigate}
          onStatusChange={handleOpenStatusDialog}
          canEditStatus={canEditStatus}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <ProposalTable 
          proposals={filteredProposals} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          navigate={navigate}
          onStatusChange={handleOpenStatusDialog}
          canEditStatus={canEditStatus}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        <ProposalTable 
          proposals={filteredProposals} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          navigate={navigate}
          onStatusChange={handleOpenStatusDialog}
          canEditStatus={canEditStatus}
        />
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
        <ProposalTable 
          proposals={filteredProposals} 
          formatCurrency={formatCurrency} 
          formatDate={formatDate}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          navigate={navigate}
          onStatusChange={handleOpenStatusDialog}
          canEditStatus={canEditStatus}
        />
      </TabPanel>

      {/* Durum Değiştirme Dialog'u */}
      <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog}>
        <DialogTitle>Teklif Durumunu Güncelle</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {selectedProposal?.clinic?.name} için oluşturulan teklifin durumunu değiştirin:
          </DialogContentText>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Durum</InputLabel>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              label="Durum"
            >
              <MenuItem value="pending">Beklemede</MenuItem>
              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                <>
                  <MenuItem value="approved">Onaylandı</MenuItem>
                  <MenuItem value="rejected">Reddedildi</MenuItem>
                  <MenuItem value="expired">Süresi Doldu</MenuItem>
                </>
              )}
              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && newStatus === 'approved' && (
                <>
                  <MenuItem value="contract_received">Sözleşme Alındı</MenuItem>
                  <MenuItem value="in_transfer">Sevkiyatta</MenuItem>
                  <MenuItem value="delivered">Teslim Edildi</MenuItem>
                </>
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Notlar"
            multiline
            rows={4}
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog} disabled={processing}>İptal</Button>
          <Button 
            onClick={handleUpdateStatus} 
            variant="contained" 
            color="primary"
            disabled={processing}
          >
            {processing ? 'İşleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bildirme mesajı */}
      {message && (
        <Snackbar 
          open={true} 
          autoHideDuration={6000} 
          onClose={handleCloseMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseMessage} severity={message.type} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

interface ProposalTableProps {
  proposals: Proposal[];
  formatCurrency: (amount: number, currency: string) => string;
  formatDate: (dateString?: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
  navigate: (path: string) => void;
  onStatusChange: (proposal: Proposal) => void;
  canEditStatus: (proposal: Proposal) => boolean;
}

const ProposalTable: React.FC<ProposalTableProps> = ({ 
  proposals, 
  formatCurrency, 
  formatDate, 
  getStatusColor, 
  getStatusText, 
  navigate,
  onStatusChange,
  canEditStatus
}) => {
  // canEditProposal fonksiyonunu props olarak almadığımız için, bunu tekrar tanımlıyoruz
  const canEditProposal = (proposal: Proposal) => {
    // canEditStatus'un erişebildiği tüm değişkenlere erişemediğimiz için, 
    // burada sadece temel bir kontrole göre düzenleme butonunu gösterip göstermemeye karar veriyoruz
    
    // Admin ve manager olma durumunu doğrudan kontrol edemediğimiz için, duruma göre karar veriyoruz:
    // Eğer durumu değiştirebiliyorsa ve teklif pending durumundaysa, düzenleme de yapabilsin
    return canEditStatus(proposal) && proposal.status === 'pending';
  };
  
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Klinik</TableCell>
            <TableCell>Tutar</TableCell>
            <TableCell>Oluşturma Tarihi</TableCell>
            <TableCell>Durum</TableCell>
            <TableCell>İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {proposals.length > 0 ? (
            proposals.map((proposal) => (
              <TableRow key={proposal.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Business sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1">
                      {proposal.clinic?.name 
                        ? `${proposal.clinic.name} ${proposal.clinic.region?.name ? `(${proposal.clinic.region.name})` : ''}`
                        : "Klinik belirtilmemiş"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                    {formatCurrency(proposal.total_amount, proposal.currency)}
                  </Box>
                </TableCell>
                <TableCell>{formatDate(proposal.created_at)}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusText(proposal.status)} 
                    color={getStatusColor(proposal.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton 
                      color="primary" 
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      size="small"
                      title="Görüntüle"
                    >
                      <Visibility />
                    </IconButton>
                    
                    {/* Düzenleme butonu */}
                    {canEditProposal(proposal) && (
                      <IconButton
                        color="primary"
                        onClick={() => navigate(`/proposals/edit/${proposal.id}`)}
                        size="small"
                        title="Düzenle"
                      >
                        <Edit />
                      </IconButton>
                    )}
                    
                    {/* Durum değiştirme butonu */}
                    {canEditStatus(proposal) && (
                      <IconButton
                        color="secondary"
                        onClick={() => onStatusChange(proposal)}
                        size="small"
                        title="Durumu Güncelle"
                      >
                        <AttachMoney />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Teklif bulunamadı
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 