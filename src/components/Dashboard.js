import React from 'react';
import { Container, Grid, Box, Paper, Typography, Tab, Tabs } from '@mui/material';
import { Upload, BarChart, Chat, AssessmentOutlined } from '@mui/icons-material';
import { useState } from 'react';
import PdfUploader from './PdfUploader';
import FinancialAnalysis from './FinancialAnalysis';
import FinancialCharts from './FinancialCharts';
import FinancialChatbot from './FinancialChatbot';

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('upload');

  const handleSectionChange = (event, newValue) => {
    setActiveSection(newValue);
  };

  // Renderizar el componente activo según la sección seleccionada
  const renderActiveComponent = () => {
    switch (activeSection) {
      case 'upload':
        return <PdfUploader />;
      case 'analysis':
        return <FinancialAnalysis />;
      case 'charts':
        return <FinancialCharts />;
      case 'chatbot':
        return <FinancialChatbot />;
      default:
        return <PdfUploader />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Grid container spacing={3}>
        {/* Navegación principal */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Tabs 
              value={activeSection} 
              onChange={handleSectionChange}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab icon={<Upload />} label="Subir PDFs" iconPosition="start" value="upload" />
              <Tab icon={<AssessmentOutlined />} label="Análisis" iconPosition="start" value="analysis" />
              <Tab icon={<BarChart />} label="Gráficos" iconPosition="start" value="charts" />
              <Tab icon={<Chat />} label="Asistente" iconPosition="start" value="chatbot" />
            </Tabs>
          </Paper>
        </Grid>
        
        {/* Componente activo */}
        <Grid item xs={12}>
          {renderActiveComponent()}
        </Grid>
        
        {/* Información de privacidad */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Privacidad y Seguridad de Datos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Esta aplicación procesa tus datos bancarios de forma local en tu navegador. 
              La información sensible es sanitizada antes de ser enviada a la IA para su análisis.
              Ningún dato personal se almacena en servidores externos, todo permanece en tu dispositivo.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
