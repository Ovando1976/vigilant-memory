'use client';

import * as React from 'react';
import { collection, getDocs, limit, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Box, Chip, Stack, Typography, Divider, Link } from '@mui/material';
import { Link as RouterLink } from "react-router-dom";

/**
 * @typedef {Object} EventDoc
 * @property {string} id
 * @property {string} title
 * @property {'STT'|'STJ'|'STX'} island
 * @property {import('firebase/firestore').Timestamp} startDate
 * @property {string} [venue]
 * @property {string} [slug]
 */

async function fetchUpcoming() {
  const now = new Date();
  const q = query(
    collection(db, 'events'),
    where('startDate', '>=', now),
    orderBy('startDate', 'asc'),
    limit(6)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export default function EventStrip() {
  const [events, setEvents] = React.useState([]);
  React.useEffect(() => {
    fetchUpcoming().then(setEvents).catch(() => setEvents([]));
  }, []);

  return (
    <Box sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      px: { xs: 2, md: 3 },
      py: 2,
      boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
    }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={800}>This Week in the USVI</Typography>
        <Divider orientation="vertical" flexItem />
        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No upcoming events found.</Typography>
        ) : (
          events.map(ev => (
            <Chip
              key={ev.id}
              component={Link}
              href={ev.slug ? `/events/${ev.slug}` : '/events'}
              clickable
              label={`${new Date(ev.startDate.toDate()).toLocaleDateString()} • ${ev.title} (${ev.island})`}
              sx={{ mr: 1, mb: 1 }}
            />
          ))
        )}
        <Stack direction="row" sx={{ ml: 'auto' }}>
          <Chip component={Link} href="/events" clickable label="All events" variant="outlined" />
        </Stack>
      </Stack>
    </Box>
  );
}