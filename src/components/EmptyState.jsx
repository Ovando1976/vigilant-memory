import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function EmptyState({ title, subtitle, to, cta = "Back to Home" }) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 4,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      <Typography variant="h6" gutterBottom>{title}</Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {to && (
        <Button component={RouterLink} to={to} variant="contained">
          {cta}
        </Button>
      )}
    </Box>
  );
}