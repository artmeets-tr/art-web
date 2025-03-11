import React, { useState, useEffect, useCallback } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  CardActions, 
  Button, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Chip, 
  Menu, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination
} from '@mui/material';
import { 
  Search, 
  FilterList, 
  Add, 
  Edit, 
  Delete, 
  MoreVert,
  Sort
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { userService } from '../services/apiService';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  category: string;
  stock_count: number;
  status: 'active' | 'inactive';
  image_url: string | null;
  created_at: string;
  region_id: number | null;
  region_name?: string;
}

interface FilterOptions {
  category: string | null;
  status: 'all' | 'active' | 'inactive';
  priceRange: { min: number | null; max: number | null };
  sortBy: 'name' | 'price' | 'stock' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [sortMenuAnchorEl, setSOrtMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    category: null,
    status: 'all',
    priceRange: { min: null, max: null },
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProducts(currentUser);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = async (currentUser: any) => {
    try {
      // Bölge yöneticileri sadece kendi bölgelerindeki ürünleri görebilir
      let query = supabase
        .from('products')
        .select(`
          id, 
          name, 
          description, 
          price,
          unit,
          category,
          stock_count,
          status,
          image_url,
          created_at,
          region_id
        `);
      
      if (currentUser?.role === 'regional_manager' && currentUser?.region_id) {
        query = query.eq('region_id', currentUser.region_id);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) {
        console.error('Ürün verileri alınırken hata:', error);
        throw error;
      }
      
      // Bölge bilgilerini ayrıca al
      const regionData: Record<number, string> = {};
      
      if (data && data.length > 0) {
        // Benzersiz bölge ID'leri topla
        const regionIds = Array.from(
          new Set(
            data
              .filter(p => p.region_id)
              .map(p => p.region_id)
          )
        );
        
        if (regionIds.length > 0) {
          const { data: regions } = await supabase
            .from('regions')
            .select('id, name')
            .in('id', regionIds);
            
          if (regions) {
            // Bölge ID'lerinden referans haritası oluştur
            regions.forEach(region => {
              regionData[region.id] = region.name;
            });
          }
        }
      }
      
      // Hata ayıklama için verileri görüntüle
      console.log('Ürün verileri:', data);
      console.log('Bölge verileri:', regionData);
      
      if (data) {
        const formattedProducts = data.map(p => ({
          ...p,
          region_name: p.region_id ? (regionData[p.region_id] || '-') : '-'
        }));
        
        // Kategorileri topla
        const uniqueCategories = Array.from(new Set(formattedProducts.map(p => p.category).filter(Boolean)));
        setCategories(uniqueCategories as string[]);
        
        setProducts(formattedProducts);
        applyFilters(formattedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const applyFilters = (data = products) => {
    let result = [...data];
    
    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(product => 
        product.name.toLowerCase().includes(query) || 
        (product.description && product.description.toLowerCase().includes(query))
      );
    }
    
    // Kategori filtresi
    if (filters.category) {
      result = result.filter(product => product.category === filters.category);
    }
    
    // Durum filtresi
    if (filters.status !== 'all') {
      result = result.filter(product => product.status === filters.status);
    }
    
    // Fiyat aralığı filtresi
    if (filters.priceRange.min !== null) {
      result = result.filter(product => product.price >= (filters.priceRange.min || 0));
    }
    
    if (filters.priceRange.max !== null) {
      result = result.filter(product => product.price <= (filters.priceRange.max || Infinity));
    }
    
    // Sıralama
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = (a.stock_count || 0) - (b.stock_count || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProducts(result);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, products]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };

  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSOrtMenuAnchorEl(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSOrtMenuAnchorEl(null);
  };

  const handleCategoryChange = (category: string | null) => {
    setFilters({...filters, category});
    handleFilterMenuClose();
  };

  const handleStatusChange = (status: 'all' | 'active' | 'inactive') => {
    setFilters({...filters, status});
    handleFilterMenuClose();
  };

  const handleSortChange = (sortBy: 'name' | 'price' | 'stock' | 'created_at') => {
    setFilters({
      ...filters, 
      sortBy,
      sortOrder: filters.sortBy === sortBy ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
    });
    handleSortMenuClose();
  };

  const resetFilters = () => {
    setFilters({
      category: null,
      status: 'all',
      priceRange: { min: null, max: null },
      sortBy: 'name',
      sortOrder: 'asc'
    });
    setSearchQuery('');
    handleFilterMenuClose();
  };

  const handleDeleteClick = (id: number) => {
    setProductToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);
        
      if (error) throw error;
      
      // Ürün listesini güncelle
      setProducts(products.filter(p => p.id !== productToDelete));
      setConfirmDeleteOpen(false);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      // Ürün listesini güncelle
      setProducts(products.map(product => 
        product.id === id ? { ...product, status: newStatus } : product
      ));
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(price);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Ürün Yönetimi
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={() => navigate('/products/create')}
        >
          Yeni Ürün
        </Button>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Ürün ara..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
          
          <IconButton 
            aria-label="filtre" 
            onClick={handleFilterMenuOpen}
            color={filters.category || filters.status !== 'all' ? "primary" : "default"}
          >
            <FilterList />
          </IconButton>
          
          <IconButton 
            aria-label="sırala" 
            onClick={handleSortMenuOpen}
          >
            <Sort />
          </IconButton>
        </Box>
        
        {(filters.category || filters.status !== 'all') && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {filters.category && (
              <Chip 
                label={`Kategori: ${filters.category}`} 
                onDelete={() => handleCategoryChange(null)} 
                color="primary" 
                variant="outlined"
              />
            )}
            
            {filters.status !== 'all' && (
              <Chip 
                label={`Durum: ${filters.status === 'active' ? 'Aktif' : 'Pasif'}`} 
                onDelete={() => handleStatusChange('all')} 
                color="primary" 
                variant="outlined"
              />
            )}
            
            <Chip 
              label="Filtreleri Temizle" 
              onClick={resetFilters} 
              color="secondary" 
              variant="outlined"
            />
          </Box>
        )}
      </Paper>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ürün Adı</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Fiyat</TableCell>
                <TableCell>Stok</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((product) => (
                <TableRow key={product.id}>
                  <TableCell component="th" scope="row">
                    {product.name}
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>{product.stock_count || 0}</TableCell>
                  <TableCell>
                    <Chip 
                      label={product.status === 'active' ? 'Aktif' : 'Pasif'} 
                      color={product.status === 'active' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/products/edit/${product.id}`)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteClick(product.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleUpdateStatus(
                        product.id, 
                        product.status === 'active' ? 'inactive' : 'active'
                      )}
                      color={product.status === 'active' ? 'error' : 'success'}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {searchQuery || filters.category || filters.status !== 'all' 
                      ? 'Filtrelere uygun ürün bulunamadı.'
                      : 'Henüz ürün eklenmemiş.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredProducts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </Paper>
      
      {/* Filtre Menüsü */}
      <Menu
        anchorEl={filterMenuAnchorEl}
        open={Boolean(filterMenuAnchorEl)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">Kategoriler</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleCategoryChange(null)}>
          <Typography variant="body2">Tümü</Typography>
        </MenuItem>
        {categories.map(category => (
          <MenuItem key={category} onClick={() => handleCategoryChange(category)}>
            <Typography variant="body2">{category}</Typography>
          </MenuItem>
        ))}
        
        <Divider />
        
        <MenuItem disabled>
          <Typography variant="subtitle2">Durum</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('all')}>
          <Typography variant="body2">Tümü</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('active')}>
          <Typography variant="body2">Aktif</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('inactive')}>
          <Typography variant="body2">Pasif</Typography>
        </MenuItem>
      </Menu>
      
      {/* Sıralama Menüsü */}
      <Menu
        anchorEl={sortMenuAnchorEl}
        open={Boolean(sortMenuAnchorEl)}
        onClose={handleSortMenuClose}
      >
        <MenuItem onClick={() => handleSortChange('name')}>
          <Typography variant="body2">İsim {filters.sortBy === 'name' && (filters.sortOrder === 'asc' ? '↑' : '↓')}</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('price')}>
          <Typography variant="body2">Fiyat {filters.sortBy === 'price' && (filters.sortOrder === 'asc' ? '↑' : '↓')}</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('stock')}>
          <Typography variant="body2">Stok {filters.sortBy === 'stock' && (filters.sortOrder === 'asc' ? '↑' : '↓')}</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('created_at')}>
          <Typography variant="body2">Oluşturma Tarihi {filters.sortBy === 'created_at' && (filters.sortOrder === 'asc' ? '↑' : '↓')}</Typography>
        </MenuItem>
      </Menu>
      
      {/* Silme Onay Dialogu */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Ürün Silme</DialogTitle>
        <DialogContent>
          <Typography>Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>İptal</Button>
          <Button onClick={handleDeleteProduct} color="error">Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 