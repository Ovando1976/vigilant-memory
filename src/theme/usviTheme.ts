'use client';

import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    usvi: {
      colors: {
        sea: string;
        deep: string;
        sand: string;
        coral: string;
        forest: string;
        sky: string;
      };
      gradients: {
        hero: string;
        header: string;
      };
      shadows: {
        card: string;
      };
    };
  }
  interface ThemeOptions {
    usvi?: Partial<Theme['usvi']>;
  }
}

export const usviTheme = createTheme({
  palette: {
    mode: 'light',
    // Caribbean vibes — high contrast for accessibility
    primary: { main: '#00A8C5' },   // sea
    secondary: { main: '#FF6F61' }, // coral
    info: { main: '#70C1FF' },      // sky
    success: { main: '#2E7D32' },   // rainforest
    warning: { main: '#F6E27A' },   // sand
    error: { main: '#D64550' },     // reef red
    background: { default: '#F7FBFC', paper: '#FFFFFF' },
    text: { primary: '#0B2E3E', secondary: '#34515E' }
  },
  shape: { borderRadius: 14 },
  typography: {
    // Friendly, modern. Swap if you have a brand font.
    fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"`,
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, textTransform: 'none', fontWeight: 700 },
        containedPrimary: { boxShadow: '0 8px 24px rgba(0,168,197,0.35)' },
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
      }
    },
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }
      }
    }
  },
  usvi: {
    colors: {
      sea: '#00A8C5',
      deep: '#0052A5',
      sand: '#F6E27A',
      coral: '#FF6F61',
      forest: '#2E7D32',
      sky: '#70C1FF',
    },
    gradients: {
      hero: 'linear-gradient(135deg, #00A8C5 0%, #70C1FF 50%, #F6E27A 100%)',
      header: 'linear-gradient(90deg, #0052A5 0%, #00A8C5 50%, #F6E27A 100%)',
    },
    shadows: {
      card: '0 12px 40px rgba(0,0,0,0.08)'
    }
  }
});