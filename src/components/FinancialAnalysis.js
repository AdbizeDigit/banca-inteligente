import React, { useMemo } from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  Grid, 
  Divider, 
  Chip, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  Category, 
  Receipt, 
  Warning,
  AccountBalance,
  Insights,
  ShowChart,
  Payments,
  AttachMoney,
  Info
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';

const FinancialAnalysis = () => {
  const { analyses, recommendations, financialSummary, selectedFile, loading } = useApp();
  
  // Función para extraer secciones específicas del análisis
  const extractSection = (analysis, sectionTitle) => {
    if (!analysis) return null;
    
    const regex = new RegExp(`${sectionTitle}[:\s]?([\s\S]*?)(?:\n\n|\n##|\n###|$)`);
    const match = analysis.match(regex);
    return match ? match[1].trim() : null;
  };
  
  // Formatear fecha del análisis
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Obtener el análisis del archivo seleccionado o el más reciente
  const currentAnalysis = useMemo(() => {
    let analysis = null;
    
    if (selectedFile) {
      analysis = analyses.find(a => a.fileId === selectedFile);
    }
    
    if (!analysis && analyses.length > 0) {
      // Ordenar por timestamp y tomar el más reciente
      const sortedAnalyses = [...analyses].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      analysis = sortedAnalyses[0];
    }
    
    return analysis;
  }, [analyses, selectedFile]);
  
  // Extraer secciones específicas del análisis
  const financialData = useMemo(() => {
    if (!currentAnalysis) return {};
    
    return {
      resumen: extractSection(currentAnalysis.analysis, 'Resumen Financiero') || 
              extractSection(currentAnalysis.analysis, '1\\. Resumen'),
      categorias: extractSection(currentAnalysis.analysis, 'Categorización de Gastos') || 
                 extractSection(currentAnalysis.analysis, '2\\. Categorización'),
      patrones: extractSection(currentAnalysis.analysis, 'Patrones Detectados') || 
               extractSection(currentAnalysis.analysis, '3\\. Patrones') ||
               extractSection(currentAnalysis.analysis, 'Detección de Patrones'),
      recomendaciones: extractSection(currentAnalysis.analysis, 'Recomendaciones Financieras') || 
                      extractSection(currentAnalysis.analysis, '4\\. Recomendaciones')
    };
  }, [currentAnalysis]);
  
  // Si no hay datos, mostrar mensaje
  if (analyses.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Análisis Financiero
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ my: 4 }}>
          Sube y procesa tus estados bancarios para ver el análisis aquí.
        </Typography>
      </Paper>
    );
  }
  

  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <AccountBalance />
        </Avatar>
        <Typography variant="h5" gutterBottom sx={{ mb: 0, fontWeight: 600 }}>
          Análisis Financiero
        </Typography>
        {loading && (
          <CircularProgress size={24} sx={{ ml: 2 }} />
        )}
      </Box>
      
      {currentAnalysis ? (
          
        <>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Chip 
              label={`Análisis del ${formatDate(currentAnalysis.timestamp)}`} 
              color="primary" 
              variant="outlined" 
              icon={<Receipt />}
              sx={{ borderRadius: '12px', fontWeight: 500 }}
            />
            <Tooltip title="Este análisis se basa en la información proporcionada en su estado bancario" arrow>
              <IconButton size="small" sx={{ ml: 1 }}>
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {/* Columna de Resumen Financiero */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light', mr: 2, width: 36, height: 36 }}>
                      <TrendingUp fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Resumen Financiero</Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {financialData.resumen ? (
                    <Fade in={!!financialData.resumen} timeout={1000}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                        {financialData.resumen}
                      </Typography>
                    </Fade>
                  ) : (
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
                      No se ha podido extraer un resumen financiero.
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              {/* Patrones detectados y alertas */}
              <Card variant="outlined" sx={{ borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.light', mr: 2, width: 36, height: 36 }}>
                      <Insights fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Patrones Detectados</Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {financialData.patrones ? (
                    <Fade in={!!financialData.patrones} timeout={1000}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                        {financialData.patrones}
                      </Typography>
                    </Fade>
                  ) : (
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
                      No se han detectado patrones inusuales en tus gastos.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Columna de Categorización y Recomendaciones */}
            <Grid item xs={12} md={6}>
              {/* Categorización de Gastos */}
              <Card variant="outlined" sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'secondary.light', mr: 2, width: 36, height: 36 }}>
                      <Category fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Categorización de Gastos</Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {financialData.categorias ? (
                    <Fade in={!!financialData.categorias} timeout={1000}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                        {financialData.categorias}
                      </Typography>
                    </Fade>
                  ) : (
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
                      No se ha podido extraer la categorización de gastos.
                    </Alert>
                  )}
                </CardContent>
              </Card>
              
              {/* Recomendaciones Financieras */}
              <Card variant="outlined" sx={{ borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'success.light', mr: 2, width: 36, height: 36 }}>
                      <Lightbulb fontSize="small" />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Recomendaciones Financieras</Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {financialData.recomendaciones ? (
                    <Fade in={!!financialData.recomendaciones} timeout={1000}>
                      <Box>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, mb: 2 }}>
                          {financialData.recomendaciones}
                        </Typography>
                      </Box>
                    </Fade>
                  ) : (
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: '8px' }}>
                      No hay recomendaciones financieras disponibles.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Análisis completo */}
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ mt: 3, borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'info.light', mr: 2, width: 36, height: 36 }}>
                        <ShowChart fontSize="small" />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>Análisis Completo</Typography>
                    </Box>
                    <Chip 
                      label="Detallado" 
                      color="info" 
                      size="small"
                      sx={{ borderRadius: '8px' }}
                    />
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box sx={{ maxHeight: '400px', overflowY: 'auto', pr: 1, mt: 2 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                      {currentAnalysis.analysis}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No hay análisis disponible para mostrar.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FinancialAnalysis;
