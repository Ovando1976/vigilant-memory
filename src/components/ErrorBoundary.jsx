import React from "react";
import { Alert, Button, Stack } from "@mui/material";

export default class ErrorBoundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <Stack sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 1 }}>
          Something went wrong. Try reloading the page.
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
      </Stack>
    );
  }
}