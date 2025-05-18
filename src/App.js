import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Alert, Snackbar } from '@mui/material';
import './App.css';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import { AppProvider, useApp } from './context/AppContext';
import { useState } from 'react';

// Crear tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Componente para manejar los errores
const AppContent = () => {
  const { error, setError } = useApp();
  
  const handleCloseError = () => {
    setError(null);
  };
  
  return (
    <>
      <CssBaseline />
      <Navbar />
      <Dashboard />
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
