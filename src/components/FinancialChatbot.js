import React, { useState, useRef, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Avatar, 
  CircularProgress,
  Divider,
  IconButton
} from '@mui/material';
import { Send, Person, SmartToy, Delete } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { getChatbotResponse } from '../services/openRouterService';

const FinancialChatbot = () => {
  const { 
    chatHistory, 
    addChatMessage, 
    loading, 
    setLoading, 
    setError 
  } = useApp();
  
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  
  // Auto-scroll al final del chat cuando hay nuevos mensajes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);
  
  // Enviar mensaje al chatbot
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = message.trim();
    addChatMessage(userMessage, true);
    setMessage('');
    
    try {
      setLoading(true);
      
      // Convertir el historial al formato esperado por la API
      const apiHistory = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Obtener respuesta del chatbot
      const response = await getChatbotResponse(userMessage, apiHistory);
      
      // Agregar respuesta al historial
      addChatMessage(response, false);
    } catch (error) {
      console.error('Error al obtener respuesta del chatbot:', error);
      setError(`Error al comunicarse con el asistente: ${error.message}`);
      
      // Agregar mensaje de error como respuesta del chatbot
      addChatMessage('Lo siento, tuve un problema para procesar tu solicitud. Por favor, intenta de nuevo más tarde.', false);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearChat = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar todo el historial del chat?')) {
      // Reinicia el chat con un mensaje de bienvenida
      addChatMessage('Hola, soy tu asistente financiero. ¿En qué puedo ayudarte hoy?', false);
    }
  };
  
  // Mensaje de bienvenida si el chat está vacío
  useEffect(() => {
    if (chatHistory.length === 0) {
      addChatMessage('Hola, soy tu asistente financiero. ¿En qué puedo ayudarte hoy?', false);
    }
  }, []);
  
  // Formateo de fecha para mostrar en el chat
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Asistente Financiero
        </Typography>
        <IconButton color="error" onClick={handleClearChat} title="Borrar chat">
          <Delete />
        </IconButton>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Área de mensajes */}
      <Box 
        sx={{ 
          height: 400, 
          overflowY: 'auto', 
          mb: 2,
          p: 2,
          backgroundColor: 'background.default',
          borderRadius: 1
        }}
      >
        {chatHistory.map((msg, index) => (
          <Box 
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 2
            }}
          >
            <Box 
              sx={{ 
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 1
              }}
            >
              <Avatar
                sx={{ 
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32
                }}
              >
                {msg.role === 'user' ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
              </Avatar>
              
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  backgroundColor: msg.role === 'user' ? 'primary.light' : 'background.paper',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0'
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
            
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                mt: 0.5,
                mr: msg.role === 'user' ? 1 : 0,
                ml: msg.role === 'user' ? 0 : 1
              }}
            >
              {formatTimestamp(msg.timestamp)}
            </Typography>
          </Box>
        ))}
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
              <SmartToy fontSize="small" />
            </Avatar>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {/* Referencia para auto-scroll */}
        <div ref={chatEndRef} />
      </Box>
      
      {/* Formulario para enviar mensajes */}
      <form onSubmit={handleSendMessage}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Pregunta cualquier cosa sobre tus finanzas..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            variant="outlined"
            size="medium"
            autoComplete="off"
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!message.trim() || loading}
            sx={{ minWidth: 100 }}
            endIcon={<Send />}
          >
            Enviar
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default FinancialChatbot;
