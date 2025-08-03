// src/theme/index.js
import { createTheme } from '@mui/material/styles';

// Shared tokens
const shared = {
  typography: {
    fontFamily: 'Montserrat, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
};

// Light Theme: USVI Explorer style
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0366d6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#fdd835',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#0d1b2a',
      secondary: '#3c4858',
    },
  },
  ...shared,
});

// Dark Theme: GTA Vibe
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ff99',
      contrastText: '#000000',
    },
    secondary: {
      main: '#ffcc00',
    },
    background: {
      default: '#0d0d0d',
      paper: '#1a1a1a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#bbbbbb',
    },
  },
  typography: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeightBold: 700,
    button: { textTransform: 'uppercase', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.95rem',
          letterSpacing: '1px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundImage: 'none',
        },
      },
    },
  },
});