import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useThemeMode } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode();

  return (
    <Tooltip title="Toggle theme">
      <IconButton
        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
        color="inherit"
      >
        {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
