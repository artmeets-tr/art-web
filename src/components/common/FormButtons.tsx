import React from 'react';
import { Button, CircularProgress, Grid } from '@mui/material';

interface FormButtonsProps {
  isEditMode: boolean;
  isSaving: boolean;
  onCancel: () => void;
}

/**
 * Form butonları için tutarlı bir bileşen
 * @param isEditMode Düzenleme modu mu?
 * @param isSaving Kaydediliyor mu?
 * @param onCancel İptal fonksiyonu
 */
export const FormButtons: React.FC<FormButtonsProps> = ({
  isEditMode,
  isSaving,
  onCancel
}) => {
  return (
    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
      <Button
        variant="outlined"
        onClick={onCancel}
        disabled={isSaving}
      >
        İptal
      </Button>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSaving}
      >
        {isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Güncelle' : 'Kaydet')}
      </Button>
    </Grid>
  );
};