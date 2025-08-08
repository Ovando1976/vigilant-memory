import React from "react";
import { Typography, List, ListItem, ListItemText } from "@mui/material";

export function RideQueue({ rides = [], onAccept, loading = false, dense = false }) {
  if (loading) {
    return <Typography>Loading rides...</Typography>;
  }

  if (!rides.length) {
    return <Typography>No pending rides right now.</Typography>;
  }

  return (
    <List dense={dense}>
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