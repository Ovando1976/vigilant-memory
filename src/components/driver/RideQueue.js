import React from 'react';
import { Typography, List, ListItem, ListItemText } from '@mui/material';

export function RideQueue({ rides = [], onAccept }) {
  if (!rides.length) {
    return <Typography>No pending rides right now.</Typography>;
  }

  return (
    <List>
      {rides.map((ride) => (
        <ListItem
          key={ride.id}
          divider
          button
          onClick={() => onAccept(ride.id)}
        >
          <ListItemText
            primary={`${ride.pickup} → ${ride.dropoff}`}
            secondary={`Passengers: ${ride.passengerCount}`}
          />
        </ListItem>
      ))}
    </List>
  );
}
