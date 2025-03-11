import React from 'react';
import { Box, Typography, Divider, Alert, Paper } from '@mui/material';

interface FormContainerProps {
  title: string;
  error: string | null;
  success: string | null;
  children: React.ReactNode;
}

/**
 * Formlar için tutarlı bir container bileşeni
 * @param title Form başlığı
 * @param error Hata mesajı
 * @param success Başarı mesajı
 * @param children Form içeriği
 */
export const FormContainer: React.FC<FormContainerProps> = ({
  title,
  error,
  success,
  children
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        {children}
      </Paper>
    </Box>
  );
};