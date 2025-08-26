import React from 'react';
import { Box, Typography } from '@mui/material';

export default function ChatMessage({ message, sender }) {
  return (
    <Box sx={{ mb: 1, textAlign: sender === 'user' ? 'right' : 'left' }}>
      <Typography variant="body2" color="text.secondary">
        {sender}
      </Typography>
      <Box
        sx={{
          display: 'inline-block',
          px: 1.5,
          py: 1,
          borderRadius: 1,
          bgcolor: sender === 'user' ? 'primary.main' : 'grey.300',
          color: sender === 'user' ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {message}
      </Box>
    </Box>
  );
}
