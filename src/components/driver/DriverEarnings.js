import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  useTheme,
} from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function DriverEarnings() {
  const theme = useTheme();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function fetchEarnings() {
      try {
        const snap = await getDocs(collection(db, "earnings"));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEntries(data);
      } catch (err) {
        // Fallback mock data if Firestore unavailable
        setEntries([
          { id: "1", date: "Mon", amount: 120 },
          { id: "2", date: "Tue", amount: 80 },
          { id: "3", date: "Wed", amount: 150 },
          { id: "4", date: "Thu", amount: 90 },
          { id: "5", date: "Fri", amount: 170 },
        ]);
      }
    }
    fetchEarnings();
  }, []);

  const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" color="primary.main" gutterBottom>
        Weekly Earnings
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Total: ${total.toFixed(2)}
      </Typography>
      <Box sx={{ height: 240, mb: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entries}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <List dense>
        {entries.map((e) => (
          <ListItem key={e.id} divider>
            <ListItemText primary={e.date} secondary={`$${e.amount}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
