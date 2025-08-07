import { useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

export default function useSnackbar() {
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnack({ open: true, message, severity });
  }, []);

  const handleClose = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnack(prev => ({ ...prev, open: false }));
  }, []);

  const SnackbarComponent = () => (
    <Snackbar open={snack.open} autoHideDuration={6000} onClose={handleClose}>
      <Alert onClose={handleClose} severity={snack.severity} sx={{ width: '100%' }}>
        {snack.message}
      </Alert>
    </Snackbar>
  );

  return { showSnackbar, SnackbarComponent };
}
