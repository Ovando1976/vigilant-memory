import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Stack,
} from '@mui/material';
import { useArgonController } from '../context/ArgonControllerContext';

/**
 * Driver settings – profile + app preferences.
 * Extend with Stripe account, vehicle profile, etc.
 */
export default function DriverSettingsPage() {
  const [{ darkMode, gtaMode }, dispatch] = useArgonController();

  /* local profile state – stub */
  const [profile, setProfile] = React.useState({
    name: 'Jane Driver',
    email: 'driver@example.com',
    phone: '+1 340‑555‑1234',
  });

  const handleChange = (field) => (e) =>
    setProfile({ ...profile, [field]: e.target.value });

  const saveProfile = () => {
    console.log('Save profile', profile);
    // Firestore .update({profile})
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 640 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Settings
      </Typography>

      {/* Profile card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              value={profile.name}
              onChange={handleChange('name')}
              fullWidth
            />
            <TextField
              label="Email"
              value={profile.email}
              onChange={handleChange('email')}
              fullWidth
            />
            <TextField
              label="Phone"
              value={profile.phone}
              onChange={handleChange('phone')}
              fullWidth
            />
            <Button variant="contained" onClick={saveProfile}>
              Save
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Preferences card */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            App Preferences
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={() => dispatch({ type: 'TOGGLE_DARK' })}
              />
            }
            label="Dark Mode"
          />

          <FormControlLabel
            control={
              <Switch
                checked={gtaMode}
                onChange={() => dispatch({ type: 'TOGGLE_GTA' })}
              />
            }
            label="GTA Neon Theme"
          />

          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Push Notifications"
          />
        </CardContent>
      </Card>
    </Box>
  );
}
