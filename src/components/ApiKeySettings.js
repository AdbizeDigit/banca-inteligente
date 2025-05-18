import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Key, Save, Check } from '@mui/icons-material';
import { saveApiKey, hasApiKey } from '../services/openRouterService';
import { useApp } from '../context/AppContext';

const ApiKeySettings = ({ onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { setError } = useApp();

  // Verificar si ya hay una API key guardada
  useEffect(() => {
    setHasKey(hasApiKey());
  }, []);

  const handleToggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleSaveApiKey = () => {
    try {
      if (!apiKey.trim()) {
        setError('Por favor, introduce una API key válida.');
        return;
      }

      // Validar formato de API key (básico)
      if (!apiKey.startsWith('sk-or-')) {
        setError('La API key debe comenzar con "sk-or-".');
        return;
      }

      // Guardar la API key
      saveApiKey(apiKey);
      setHasKey(true);
      setIsSaved(true);
      
      // Notificar al componente padre si es necesario
      if (onSave) {
        onSave();
      }

      // Mostrar confirmación temporalmente
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      setError(`Error al guardar la API key: ${error.message}`);
    }
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Key color="primary" sx={{ mr: 1 }} />
          <Typography variant="h5">Configuración de API</Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />

        <Typography variant="body1" paragraph>
          Para usar esta aplicación, necesitas configurar tu API key de OpenRouter. 
          Puedes obtener una clave API gratuita registrándote en {' '}
          <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">
            OpenRouter.ai
          </a>.
        </Typography>

        {hasKey ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Ya tienes configurada una API key para OpenRouter.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No has configurado una API key. Por favor, configura tu clave para usar todas las funciones.
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="API Key de OpenRouter"
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type={showApiKey ? 'text' : 'password'}
            placeholder="sk-or-v1-..."
            helperText="Tu clave API se almacena localmente en tu navegador y nunca se envía a nuestros servidores."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle api key visibility"
                    onClick={handleToggleShowApiKey}
                    edge="end"
                  >
                    {showApiKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenDialog}
          >
            ¿Dónde conseguir la API key?
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={isSaved ? <Check /> : <Save />}
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || isSaved}
          >
            {isSaved ? 'Guardada' : 'Guardar API Key'}
          </Button>
        </Box>
      </Paper>

      {/* Dialog with instructions */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>
          Cómo obtener tu API Key de OpenRouter
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Para obtener una API Key de OpenRouter, sigue estos pasos:
          </DialogContentText>
          <Box component="ol" sx={{ mt: 2 }}>
            <Box component="li" sx={{ mb: 1 }}>
              Visita <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">OpenRouter.ai</a>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              Regístrate o inicia sesión en tu cuenta
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              En tu panel de control, busca la sección "API Keys"
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              Crea una nueva API Key y cópiala
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              Pega la API Key en el campo correspondiente en esta aplicación
            </Box>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Las llamadas al modelo Llama 4 Scout están incluidas en el plan gratuito de OpenRouter.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApiKeySettings;
