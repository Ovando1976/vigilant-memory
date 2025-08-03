// src/components/AppLayout.js
import React, { createContext, useContext, useState } from 'react';
import { Box, CssBaseline, IconButton, ThemeProvider, createTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const ColorModeContext = createContext();

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function AppLayout({ children }) {
  const [mode, setMode] = useState('light');

  const colorMode = {
    toggleColorMode: () => {
      setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    },
  };

  const theme = createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: {
              main: '#0077b6',
            },
            secondary: {
              main: '#00b4d8',
            },
            background: {
              default: '#e0f7fa',
              paper: '#ffffff',
            },
          }
        : {
            primary: {
              main: '#00ff99',
            },
            secondary: {
              main: '#ffcc00',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
          }),
    },
    typography: {
      fontFamily: '"Roboto", sans-serif',
    },
  });

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <IconButton onClick={colorMode.toggleColorMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}