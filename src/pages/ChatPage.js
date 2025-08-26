import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography } from '@mui/material';
import ChatMessage from '../components/ChatMessage';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: Date.now(), text, sender: 'user' }]);
    setInput('');
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Chat
      </Typography>
      <Box
        sx={{
          height: '60vh',
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          mb: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m.text} sender={m.sender} />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <Button variant="contained" onClick={handleSend}>
          Send
        </Button>
      </Box>
    </Container>
  );
}
