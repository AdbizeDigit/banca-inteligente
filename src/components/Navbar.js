import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton, Tooltip } from '@mui/material';
import { Savings, Upload, BarChart, Chat, InsertDriveFile, Delete } from '@mui/icons-material';
import { useApp } from '../context/AppContext';

const Navbar = () => {
  const { analyses, clearData } = useApp();
  
  const handleClearAllData = () => {
    clearData();
  };
  
  return (
    <AppBar position="sticky" color="primary" elevation={4} sx={{ mb: 3 }}>
      <Toolbar>
        <Savings sx={{ mr: 2 }} />
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Banca Inteligente
        </Typography>
        
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
          {analyses.length > 0 && (
            <Button 
              color="inherit" 
              startIcon={<InsertDriveFile />}
              sx={{ textTransform: 'none' }}
            >
              {analyses.length} Documentos
            </Button>
          )}
          
          <Tooltip title="Borrar todos los datos">
            <IconButton 
              color="inherit" 
              onClick={handleClearAllData}
              sx={{ ml: 1 }}
              aria-label="Borrar todos los datos"
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
