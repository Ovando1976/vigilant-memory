import React, { useState } from "react";
import { Box, Stack, Button, TextField, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import MicNoneIcon from "@mui/icons-material/MicNone";
import SendIcon from "@mui/icons-material/Send";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  events = [],
  isSessionActive = false,
}) {
  const [text, setText] = useState("");

  const onSend = () => {
    const msg = text.trim();
    if (!msg) return;
    sendTextMessage?.(msg);
    setText("");
  };

  const clearEvents = () => {
    // Optional: send a client-side "clear" event consumers can interpret
    sendClientEvent?.({ type: "client.clear" });
  };

  return (
    <Box sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={startSession}
            disabled={isSessionActive}
          >
            Start
          </Button>
          <Button
            fullWidth
            color="error"
            variant="outlined"
            startIcon={<StopIcon />}
            onClick={stopSession}
            disabled={!isSessionActive}
          >
            Stop
          </Button>
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message to the model…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            InputProps={{
              endAdornment: (
                <Tooltip title="Send">
                  <span>
                    <Button onClick={onSend} size="small" variant="text" disabled={!text.trim()}>
                      <SendIcon fontSize="small" />
                    </Button>
                  </span>
                </Tooltip>
              ),
            }}
          />
          <Tooltip title="Toggle mic (coming soon)">
            <span>
              <Button variant="outlined" disabled startIcon={<MicNoneIcon />}>
                Mic
              </Button>
            </span>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="text"
            startIcon={<DeleteSweepIcon />}
            onClick={clearEvents}
            disabled={!events?.length}
          >
            Clear Log
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}