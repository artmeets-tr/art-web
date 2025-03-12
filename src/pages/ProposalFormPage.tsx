import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid, 
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import tr from 'date-fns/locale/tr';
import { useNavigate, useParams } from 'react-router-dom';
import { clinicService, productService, userService, proposalService } from '../services/apiService';
import { Clinic, Product, User, Proposal, ProposalItem } from '../types';

export const ProposalFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && !isNaN(Number(id)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<{
    clinic_id: number;
    currency: 'TRY' | 'USD' | 'EUR';
    discount: number;
    total_amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'contract_received' | 'in_transfer' | 'delivered';
    notes: string;
    installment_count: number;
    first_payment_date: Date | null;
    installment_amount: number;
  }>({
    clinic_id: 0,
    currency: 'TRY',
    discount: 0,
    total_amount: 0,
    status: 'pending',
    notes: '',
    installment_count: 1,
    first_payment_date: new Date(),
    installment_amount: 0
  });

  const [items, setItems] = useState<{
    product_id: number;
    quantity: number;
    excess: boolean;
    unit_price: number;
    excess_percentage: number;
  }[]>([]);

  // Durum hiyerarşisi - sıra önemli
  const statusHierarchy = [
    'pending',           // Bekliyor
    'approved',          // Onaylandı
    'contract_received', // Sözleşme Alındı
    'in_transfer',       // Transfer Aşamasında
    'delivered'          // Teslim Edildi
  ];

  // Form alanları düzenlenebilir mi?
  const canEditProposal = () => {
    // Yeni teklif oluşturma her zaman mümkün olmalı
    if (!isEditMode) return true;
    
    // Kullanıcı bilgisi yoksa düzenleme yapılamaz
    if (!currentUser) return false;
    
    // Admin ve managerlar her zaman düzenleyebilir
    if (['admin', 'manager'].includes(currentUser.role)) return true;
    
    // Saha kullanıcıları için:
    if (currentUser.role === 'field_user') {
      // Düzenleme modunda değilse (yeni teklif) her zaman düzenleyebilir
      if (!isEditMode) return true;
      
      // Teklif "bekliyor" durumundaysa düzenleyebilir
      return formData.status === 'pending';
    }
    
    return false;
  };
  
  // Kullanıcı durumu değiştirebilir mi?
  const canChangeStatus = () => {
    if (!currentUser) return false;
    
    // Admin ve manager her durumda değiştirebilir
    if (['admin', 'manager'].includes(currentUser.role)) return true;
    
    // Saha kullanıcıları (field_user) sadece teklif onaylandıktan sonra süreci ilerletebilir
    // Onaylanmamış tekliflerin durumunu değiştiremezler
    if (currentUser.role === 'field_user' && formData.status !== 'pending') {
      return true;
    }
    
    return false;
  };
  
  // Kullanıcı için uygun durum seçeneklerini filtreler
  const getFilteredStatusOptions = () => {
    if (!isEditMode) return [];
    
    // Admin ve managerlar tüm durumları değiştirebilir
    if (['admin', 'manager'].includes(currentUser?.role || '')) {
      return statusHierarchy.concat(['rejected', 'expired']);
    }
    
    // Saha kullanıcıları için, eğer teklif onaylanmışsa sadece ileriye doğru durumlar gösterilir
    if (currentUser?.role === 'field_user' && formData.status !== 'pending') {
      const currentIndex = statusHierarchy.indexOf(formData.status);
      // Sadece mevcut durum ve sonraki durumları göster (geriye gidemezler)
      return statusHierarchy.filter((_, index) => index >= currentIndex);
    }
    
    return [];
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Klinikleri, ürünleri ve kullanıcı bilgilerini yükle
        const [clinicsData, productsData, userData] = await Promise.all([
          clinicService.getAll(),
          productService.getAll(),
          userService.getCurrentUser()
        ]);
        
        setClinics(clinicsData);
        setProducts(productsData);
        setCurrentUser(userData);
        
        if (clinicsData.length > 0) {
          setFormData(prev => ({ ...prev, clinic_id: clinicsData[0].id }));
        }

        // Düzenleme modunda ve geçerli bir ID varsa var olan teklifi yükle
        if (isEditMode && id && !isNaN(Number(id))) {
          try {
            const proposalId = parseInt(id);
            const proposal = await proposalService.getById(proposalId);
            
            // Eğer teklif bulunduysa formu doldur
            setFormData({
              clinic_id: proposal.clinic_id,
              currency: proposal.currency,
              discount: proposal.discount,
              total_amount: proposal.total_amount,
              status: proposal.status,
              notes: proposal.notes || '',
              installment_count: proposal.installment_count || 1,
              first_payment_date: proposal.first_payment_date ? new Date(proposal.first_payment_date) : null,
              installment_amount: proposal.installment_amount || 0
            });
            
            // Teklif kalemleri varsa onları da yükle
            if (proposal.items && proposal.items.length > 0) {
              setItems(proposal.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                excess: item.excess,
                unit_price: item.unit_price,
                excess_percentage: item.excess_percentage || 0
              })));
            }
          } catch (error) {
            console.error('Teklif yükleme hatası:', error);
            setMessage({ text: 'Teklif bilgileri yüklenirken bir hata oluştu', type: 'error' });
            // Hata durumunda yeni teklif oluşturma moduna geç
            handleNewProposal();
          }
        } else {
          // Yeni teklif için varsayılan bir ürün ekle
          handleNewProposal(productsData);
        }
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
        setMessage({ text: 'Veri yüklerken bir hata oluştu', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditMode]);

  useEffect(() => {
    // Toplam tutarı hesapla
    calculateTotals();
  }, [items, formData.discount]);

  const calculateTotals = () => {
    let subtotal = 0;
    
    // Ürünlerin toplam tutarını hesapla
    for (const item of items) {
      // Mal fazlası yok ise normal hesaplama
      if (!item.excess) {
        subtotal += item.quantity * item.unit_price;
      } else {
        // Mal fazlası varsa, birim adetine göre hesaplama - toplam tutar aynı kalır
        // Ancak fiili miktar arttırılır (kullanıcıya gösterilmek üzere)
        subtotal += item.quantity * item.unit_price;
      }
    }
    
    // İndirim uygula
    const discount = formData.discount || 0;
    const totalAmount = subtotal * (1 - discount / 100);
    
    // Taksit tutarını hesapla
    const installmentCount = formData.installment_count || 1;
    const installmentAmount = totalAmount / installmentCount;
    
    setFormData(prev => ({
      ...prev,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      installment_amount: parseFloat(installmentAmount.toFixed(2))
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'discount' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (newValue: Date | null) => {
    setFormData(prev => ({ ...prev, first_payment_date: newValue }));
  };

  const handleAddItem = () => {
    if (products.length === 0) return;
    
    const defaultProduct = products[0];
    setItems([
      ...items,
      {
        product_id: defaultProduct.id,
        quantity: 1,
        excess: false,
        unit_price: defaultProduct.price,
        excess_percentage: 0
      }
    ]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    
    // Ürün değişirse, fiyatı da güncelle
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct) {
        newItems[index] = {
          ...newItems[index],
          [field]: value,
          unit_price: selectedProduct.price
        };
      } else {
        newItems[index] = {
          ...newItems[index],
          [field]: value
        };
      }
    } else if (field === 'excess' || field === 'excess_percentage') {
      // Mal fazlası değiştiğinde mantığı güncelle
      const isExcess = field === 'excess' ? Boolean(value) : newItems[index].excess;
      const excessPercentage = field === 'excess_percentage' ? (parseFloat(value) || 0) : newItems[index].excess_percentage;
      
      newItems[index] = {
        ...newItems[index],
        excess: isExcess,
        excess_percentage: excessPercentage
      };
    } else {
      // Diğer alanlar için normal güncelleme
      newItems[index] = {
        ...newItems[index],
        [field]: ['quantity', 'unit_price'].includes(field) ? (parseFloat(value) || 0) : value
      };
    }
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setMessage({ text: 'En az bir ürün olmalıdır', type: 'error' });
      return;
    }
    
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: formData.currency 
    }).format(value);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      if (!formData.clinic_id || items.length === 0) {
        setMessage({ text: 'Lütfen bir klinik seçin ve en az bir ürün ekleyin', type: 'error' });
        setSaving(false);
        return;
      }

      // Toplam hesaplama
      let subtotal = 0;
      for (const item of items) {
        const unitPrice = parseFloat(item.unit_price.toString()) || 0;
        const quantity = parseInt(item.quantity.toString()) || 0;
        subtotal += unitPrice * quantity;
      }
      
      // İndirim uygula
      const discount = formData.discount || 0;
      const totalAmount = subtotal * (1 - discount / 100);
      
      // items alanından id ve proposal_id'yi kaldıralım, çünkü bunlar sunucuda oluşturulacak
      const proposalItems = items.map(item => {
        // Birim fiyat ve miktar ile toplam tutarı hesapla
        const unitPrice = parseFloat(item.unit_price.toString()) || 0;
        const quantity = parseInt(item.quantity.toString()) || 0;
        
        return {
          product_id: item.product_id,
          quantity: quantity,
          excess: item.excess,
          unit_price: unitPrice,
          excess_percentage: item.excess_percentage || 0
          // total_price ve discount alanları veritabanında olmadığı için kaldırıldı
        };
      });

      // Tarih kontrolü
      let paymentDate = formData.first_payment_date;
      if (!(paymentDate instanceof Date) && paymentDate) {
        paymentDate = new Date(paymentDate);
      }

      const proposalData = {
        ...formData,
        // first_payment_date'i string formatına dönüştürme
        first_payment_date: paymentDate ? paymentDate.toISOString().split('T')[0] : undefined,
        user_id: currentUser?.id || '',
        items: proposalItems,
        // Varsayılan değerler ve toplam tutar
        currency: formData.currency || 'TRY',
        discount: formData.discount || 0,
        total_amount: totalAmount,
        installment_count: formData.installment_count || 1,
        installment_amount: totalAmount / (formData.installment_count || 1)
      };

      console.log("Gönderilecek teklif verisi:", proposalData); // Debug için

      // API entegrasyonu
      let result;
      if (isEditMode && id && !isNaN(Number(id))) {
        result = await proposalService.update(parseInt(id), proposalData as any);
        console.log("Güncellenmiş teklif:", result);
      } else {
        result = await proposalService.create(proposalData as any);
        console.log("Oluşturulan teklif:", result);
      }

      setMessage({ 
        text: isEditMode 
          ? 'Teklif başarıyla güncellendi' 
          : 'Teklif başarıyla oluşturuldu',
        type: 'success' 
      });

      // Başarılı mesajı gösterdikten sonra listesiye dön
      setTimeout(() => {
        navigate('/proposals');
      }, 1500);
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      setMessage({ text: `Teklif kaydedilirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Yeni teklif oluşturma ayarları
  const handleNewProposal = (productsData = products) => {
    // Yeni teklif için varsayılan bir ürün ekle
    if (productsData.length > 0) {
      const defaultProduct = productsData[0];
      setItems([{
        product_id: defaultProduct.id,
        quantity: 1,
        excess: false,
        unit_price: defaultProduct.price,
        excess_percentage: 0
      }]);
    }
    
    // Yeni teklif için durum her zaman "bekliyor" olmalı
    setFormData(prev => ({ 
      ...prev, 
      status: 'pending',
      installment_count: 1,
      first_payment_date: new Date(),
      discount: 0,
      total_amount: 0,
      installment_amount: 0
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/proposals')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEditMode ? 'Teklif Detayları' : 'Yeni Teklif Oluştur'}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Klinik */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="clinic-label">Klinik *</InputLabel>
                <Select
                  labelId="clinic-label"
                  name="clinic_id"
                  value={formData.clinic_id}
                  onChange={handleSelectChange}
                  label="Klinik *"
                  disabled={isEditMode && !canEditProposal()}
                >
                  {clinics.map(clinic => (
                    <MenuItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Para Birimi */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="currency-label">Para Birimi</InputLabel>
                <Select
                  labelId="currency-label"
                  name="currency"
                  value={formData.currency}
                  onChange={handleSelectChange}
                  label="Para Birimi"
                  disabled={isEditMode && !canEditProposal()}
                >
                  <MenuItem value="TRY">Türk Lirası (₺)</MenuItem>
                  <MenuItem value="USD">Amerikan Doları ($)</MenuItem>
                  <MenuItem value="EUR">Euro (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* İndirim */}
            <Grid item xs={12} md={6}>
              <TextField
                name="discount"
                label="İndirim (%)"
                type="number"
                value={formData.discount}
                onChange={handleChange}
                fullWidth
                InputProps={{ inputProps: { min: 0, max: 100 } }}
                disabled={isEditMode && !canEditProposal()}
              />
            </Grid>

            {/* Taksit Sayısı */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Taksit Sayısı"
                name="installment_count"
                type="number"
                value={formData.installment_count || ''}
                onChange={handleChange}
                fullWidth
                inputProps={{ min: 1, max: 12 }}
                helperText="En fazla 12 taksit"
                disabled={false}
              />
            </Grid>

            {/* İlk Ödeme Tarihi */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                <DatePicker
                  label="İlk Ödeme Tarihi"
                  value={formData.first_payment_date || null}
                  onChange={(newValue) => handleDateChange(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      variant: 'outlined',
                      disabled: false // İlk ödeme tarihini her zaman aktif yapıyoruz
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Durum (sadece düzenleme modunda) */}
            {isEditMode && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleSelectChange}
                    label="Durum"
                    disabled={!canChangeStatus()}
                  >
                    {getFilteredStatusOptions().map(status => (
                      <MenuItem key={status} value={status}>
                        {status === 'pending' && 'Bekliyor'}
                        {status === 'approved' && 'Onaylandı'}
                        {status === 'rejected' && 'Reddedildi'}
                        {status === 'expired' && 'Süresi Doldu'}
                        {status === 'contract_received' && 'Sözleşme Alındı'}
                        {status === 'in_transfer' && 'Transfer Aşamasında'}
                        {status === 'delivered' && 'Teslim Edildi'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {!canChangeStatus() && formData.status === 'pending' && (
                  <Typography variant="caption" color="text.secondary">
                    Yeni oluşturulan teklif onaylandıktan sonra süreci ilerletebilirsiniz.
                  </Typography>
                )}
                {!canChangeStatus() && formData.status !== 'pending' && (
                  <Typography variant="caption" color="text.secondary">
                    Bu teklifin mevcut durumu değiştirilemez.
                  </Typography>
                )}
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Ürünler</Typography>
                {(!isEditMode || canEditProposal()) && (
                  <Button 
                    startIcon={<AddIcon />} 
                    variant="outlined"
                    onClick={handleAddItem}
                  >
                    Ürün Ekle
                  </Button>
                )}
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Ürün</TableCell>
                      <TableCell align="right">Miktar</TableCell>
                      <TableCell align="right">Birim Fiyat</TableCell>
                      <TableCell align="center">Mal Fazlası</TableCell>
                      <TableCell align="right">Mal Fazlası %</TableCell>
                      <TableCell align="right">Toplam</TableCell>
                      {(!isEditMode || canEditProposal()) && (
                        <TableCell align="center">İşlem</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => {
                      const product = products.find(p => p.id === item.product_id);
                      let itemTotal = item.quantity * item.unit_price;
                      
                      // Kullanıcıya gösterilecek fiili miktar
                      let effectiveQuantity = item.quantity;
                      if (item.excess && item.excess_percentage > 0) {
                        // Mal fazlası durumunda gösterilecek toplam miktar
                        effectiveQuantity = item.quantity * (1 + item.excess_percentage / 100);
                      }
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <FormControl fullWidth>
                              <Select
                                value={item.product_id}
                                onChange={e => handleItemChange(index, 'product_id', e.target.value)}
                                disabled={isEditMode && !canEditProposal()}
                              >
                                {products.map(product => (
                                  <MenuItem key={product.id} value={product.id}>
                                    {product.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="right">
                            <Box>
                              <TextField
                                type="number"
                                value={item.quantity}
                                onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                InputProps={{ inputProps: { min: 1 } }}
                                sx={{ width: '80px' }}
                                disabled={isEditMode && !canEditProposal()}
                              />
                              {item.excess && item.excess_percentage > 0 && (
                                <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                                  Fiili: {effectiveQuantity.toFixed(0)}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              value={item.unit_price}
                              onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                              InputProps={{ inputProps: { min: 0 } }}
                              sx={{ width: '100px' }}
                              disabled={isEditMode && !canEditProposal()}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Select
                              value={item.excess ? 1 : 0}
                              onChange={e => handleItemChange(index, 'excess', e.target.value === 1)}
                              sx={{ width: '80px' }}
                              disabled={isEditMode && !canEditProposal()}
                            >
                              <MenuItem value={0}>Hayır</MenuItem>
                              <MenuItem value={1}>Evet</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              value={item.excess_percentage}
                              onChange={e => handleItemChange(index, 'excess_percentage', e.target.value)}
                              disabled={!item.excess || (isEditMode && !canEditProposal())}
                              InputProps={{ inputProps: { min: 0, max: 100 } }}
                              sx={{ width: '80px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(itemTotal)}
                          </TableCell>
                          {(!isEditMode || canEditProposal()) && (
                            <TableCell align="center">
                              <IconButton 
                                color="error" 
                                onClick={() => handleRemoveItem(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <Typography variant="subtitle1">
                          İndirim ({formData.discount}%):
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(
                          items.reduce((total, item) => {
                            let itemTotal = item.quantity * item.unit_price;
                            if (item.excess) {
                              itemTotal += (itemTotal * item.excess_percentage / 100);
                            }
                            return total + (itemTotal * formData.discount / 100);
                          }, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <Typography variant="h6">
                          Toplam:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6">
                          {formatCurrency(formData.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Taksit Tutarı"
                value={formatCurrency(formData.installment_amount)}
                InputProps={{ readOnly: true }}
                disabled={isEditMode && !canEditProposal()}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notlar"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={4}
                disabled={isEditMode && !canEditProposal()}
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/proposals')}
                sx={{ mr: 2 }}
              >
                İptal
              </Button>
              {(!isEditMode || canEditProposal() || canChangeStatus()) && (
                <Button 
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Oluştur'}
                </Button>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert onClose={() => setMessage(null)} severity={message.type} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}; 