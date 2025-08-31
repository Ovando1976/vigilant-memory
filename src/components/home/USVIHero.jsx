'use client';

import * as React from 'react';
import { Box, Container, Typography, Stack, Button } from '@mui/material';
import IslandToggle from './IslandToggle';
import { Link as RouterLink } from "react-router-dom";
import { useTheme } from '@mui/material/styles';

export type IslandKey = 'STT' | 'STJ' | 'STX';

export default function USVIHero({
  onIslandChange,
  island = 'STT',
}: {
  onIslandChange?: (island: IslandKey) => void;
  island?: IslandKey;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: theme.usvi.gradients.hero,
        color: 'common.white',
        pt: { xs: 10, md: 14 },
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* Overlay pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.45) 0 2px, transparent 3px)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none',
        }}
      />
      <Container maxWidth="lg">
        <Stack spacing={3} alignItems="flex-start">
          <IslandToggle
            value={island}
            onChange={(v) => onIslandChange?.(v)}
            color="secondary"
            dark
          />
          <Typography variant="h1" sx={{ maxWidth: 900, lineHeight: 1.05 }}>
            Explore St. Thomas, St. John, and St. Croix
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.95, maxWidth: 720 }}>
            Beaches, events, rides, and historic layers—everything you need to
            plan your day in the USVI.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <Button
              component={RouterLink}
              to="/beaches"
              variant="contained"
              color="primary"
              size="large"
            >
              Discover Beaches
            </Button>
            <Button
              component={RouterLink}
              to="/events"
              variant="outlined"
              color="inherit"
              size="large"
            >
              What’s happening?
            </Button>
          </Stack>
        </Stack>
      </Container>

      {/* Wave divider */}
      <svg
        aria-hidden
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -1,
          width: '100%',
          height: 120,
          display: 'block',
        }}
      >
        <path
          d="M0,40 C240,100 480,0 720,40 C960,80 1200,20 1440,60 L1440,120 L0,120 Z"
          fill="#F7FBFC"
        />
      </svg>
    </Box>
  );
}