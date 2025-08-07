import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

export default function KpiRow() {
  return (
    <Grid container spacing={2}>
      {['Today’s Rides', 'Earnings', 'Rating'].map((label, i) => (
        <Grid item xs={12} sm={4} key={label}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {i === 0 ? '3' : i === 1 ? '$120' : '4.8⭐'}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
