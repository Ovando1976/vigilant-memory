'use client';

import * as React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';


export default function IslandToggle({
  value,
  onChange,
  color = 'primary',
  dark = false,
}) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, v) => v && onChange(v)}
      color={color}
      sx={{
        bgcolor: dark ? 'rgba(0,0,0,0.12)' : 'background.paper',
        p: 0.5,
        borderRadius: 999,
        '& .MuiToggleButton-root': {
          border: 0,
          px: 2.2,
          py: 0.7,
          fontWeight: 700,
          letterSpacing: 0.25,
        }
      }}
    >
      <ToggleButton value="STT">St. Thomas</ToggleButton>
      <ToggleButton value="STJ">St. John</ToggleButton>
      <ToggleButton value="STX">St. Croix</ToggleButton>
    </ToggleButtonGroup>
  );
}