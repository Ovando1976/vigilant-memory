import React from "react";
import { Box, Stack, Typography, Chip, Divider } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function EventLog({ events = [] }) {
  if (!Array.isArray(events)) events = [];

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
        Realtime Events
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack spacing={1.25}>
        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events yet. Start a session and send a message.
          </Typography>
        ) : (
          events.map((ev, idx) => {
            const type = ev?.type || "event";
            const ts = ev?.timestamp || "";
            const icon =
              type.includes("error") ? (
                <ErrorOutlineIcon fontSize="small" />
              ) : type.includes("response") || type.includes("assistant") ? (
                <AutoAwesomeIcon fontSize="small" />
              ) : (
                <ChatBubbleOutlineIcon fontSize="small" />
              );

            return (
              <Stack
                key={ev?.event_id || idx}
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{
                  p: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ mt: "2px" }}>{icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                    <Chip size="small" label={type} />
                    {!!ts && (
                      <Typography variant="caption" color="text.secondary">
                        {ts}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                    {typeof ev === "string" ? ev : JSON.stringify(ev)}
                  </Typography>
                </Box>
              </Stack>
            );
          })
        )}
      </Stack>
    </Box>
  );
}