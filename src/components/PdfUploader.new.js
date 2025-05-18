import React, { useState, useRef, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress, Paper, Stack, Alert } from '@mui/material';
import { CloudUpload, InsertDriveFile, Visibility } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import { sanitizePersonalData } from '../utils/simpleTextExtract';
import { extractTextWithOCR, isFileProcessable } from '../services/ocrService';
import { analyzeBankStatement, hasApiKey } from '../services/openRouterService';

const PdfUploader = () => {
  const { 
    addUploadedFile, 
    addAnalysis, 
    updateCategories, 
    updateFinancialSummary, 
    addRecommendation, 
    setLoading, 
    setError, 
    loading 
  } = useApp();
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingFile, setProcessingFile] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(!hasApiKey());
  const [processLogs, setProcessLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [textViewMode, setTextViewMode] = useState('ocr'); // 'raw' o 'ocr'
  const logsEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Verificar si hay una API key configurada cada vez que el componente se monta
  useEffect(() => {
    setApiKeyMissing(!hasApiKey());
  }, []);
  
  // Auto-scroll al final de los logs cuando se agregan nuevos
  useEffect(() => {
    if (logsEndRef.current && showLogs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processLogs, showLogs]);
  
  // Función para agregar un nuevo log al registro
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setProcessLogs(prevLogs => [...prevLogs, { message, timestamp, type }]);
    // Activar logs automáticamente cuando empiezan a aparecer
    if (!showLogs) {
      setShowLogs(true);
    }
  };
  
  // Manejar arrastrar y soltar archivos
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  // Manejar selección de archivos por clic
  const handleClick = () => {
    fileInputRef.current.click();
  };
  
  const handleChange = (e) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  // Procesar los archivos seleccionados
  const handleFiles = (files) => {
    const newFiles = Array.from(files).filter(file => isFileProcessable(file));
    
    if (newFiles.length > 0) {
      setSelectedFiles(prevFiles => [...prevFiles, ...newFiles]);
    } else {
      setError('Por favor, selecciona archivos PDF o imágenes válidas (JPG, PNG, GIF, TIF, BMP).');
    }
  };
  
  // Procesar archivo con IA
  const processFile = async (file) => {
    try {
      // Limpiar logs anteriores si es el primer archivo
      if (!processingFile) {
        setProcessLogs([]);
      }
      
      setProcessingFile(file.name);
      setLoading(true);
      addLog(`Iniciando procesamiento del archivo: ${file.name}`, 'info');
      
      // Generar ID único para el archivo
      const fileId = `file_${Date.now()}`;
      addLog(`ID asignado al archivo: ${fileId}`, 'info');
      
      // Función para mostrar el progreso del procesamiento
      const progressCallback = (message) => {
        addLog(message, 'info');
      };
      
      // Extraer texto del archivo usando el servicio OCR.space
      addLog('Iniciando extracción OCR con OCR.space API...', 'info');
      let extractionResult;
      
      // Extraer texto usando el nuevo servicio OCR
      extractionResult = await extractTextWithOCR(file, progressCallback);
      
      // Verificar si hay resultados
      if (!extractionResult || !extractionResult.ocr || !extractionResult.ocr.trim()) {
        addLog('Error: No se pudo extraer texto del archivo', 'error');
        throw new Error('No se pudo extraer texto del archivo');
      }
      
      // Guardar texto extraído para mostrar
      setExtractedText(extractionResult);
      setShowExtractedText(true);
      
      // Sanitizar datos personales (opcional)
      const sanitizedText = sanitizePersonalData(extractionResult.ocr);
      addLog('Texto extraído y sanitizado correctamente', 'success');
      
      // Mostrar información sobre el texto procesado
      addLog(`Texto extraído y optimizado: ${sanitizedText.length} caracteres`, 'success');
      
      // Activar visualización del texto
      setShowExtractedText(true);
      
      // Analizar el texto con IA (OpenRouter)
      addLog('Enviando texto a analizar con IA...', 'info');
      addLog('Esto puede tardar entre 10-60 segundos dependiendo de la complejidad', 'info');
      
      const analysis = await analyzeBankStatement(sanitizedText);
      addLog('Análisis de IA completado', 'success');
      
      // Añadir a la biblioteca de archivos procesados
      addUploadedFile({
        id: fileId,
        name: file.name,
        date: new Date().toISOString(),
        extractedText: sanitizedText,
        bankType: extractionResult.bankType || 'Desconocido'
      });
      
      // Guardar análisis
      addAnalysis(fileId, analysis);
      
      // Extraer y actualizar categorías de gastos desde el análisis
      addLog('Extrayendo categorías de gastos del análisis...', 'info');
      
      try {
        // Buscar las categorías en el análisis
        const categoryMatch = analysis.match(/categorización de gastos:(.*?)(?=\d\.\s|$)/is);
        if (categoryMatch && categoryMatch[1]) {
          const categoryText = categoryMatch[1].trim();
          // Extraer categorías con formato: Categoría: $XXX.XX o XX%
          const categoryPattern = /(\w[\w\s]+):\s*\$?([\d,.]+)\s*(%)?/gi;
          const categories = [];
          let match;
          
          while ((match = categoryPattern.exec(categoryText)) !== null) {
            const category = {
              name: match[1].trim(),
              value: match[2].replace(/,/g, ''),
              isPercentage: !!match[3]
            };
            categories.push(category);
          }
          
          if (categories.length > 0) {
            updateCategories(fileId, categories);
            addLog(`Se identificaron ${categories.length} categorías de gastos`, 'success');
          } else {
            addLog('No se pudieron extraer categorías en formato esperado', 'warning');
          }
        } else {
          addLog('No se encontró la sección de categorización de gastos', 'warning');
        }
        
        // Extraer resumen financiero
        const summaryMatch = analysis.match(/resumen de ingresos y egresos:(.*?)(?=\d\.\s|$)/is);
        if (summaryMatch && summaryMatch[1]) {
          const summaryText = summaryMatch[1].trim();
          updateFinancialSummary(fileId, summaryText);
          addLog('Resumen financiero extraído correctamente', 'success');
        }
        
        // Extraer recomendaciones
        const recommendationsMatch = analysis.match(/recomendaciones financieras:(.*?)(?=\d\.\s|$)/is);
        if (recommendationsMatch && recommendationsMatch[1]) {
          const recommendations = recommendationsMatch[1].trim();
          addRecommendation(fileId, recommendations);
          addLog('Recomendaciones financieras extraídas correctamente', 'success');
        }
        
      } catch (extractionError) {
        console.error('Error al extraer información del análisis:', extractionError);
        addLog('Error al procesar los resultados del análisis', 'error');
      }
      
      addLog(`Procesamiento de '${file.name}' completado con éxito!`, 'success');
      return { success: true, fileId };
      
    } catch (error) {
      const errorMessage = error.message || 'Error al procesar el archivo';
      addLog(`Error: ${errorMessage}`, 'error');
      setError(errorMessage);
      
      // Si hubo extracción parcial, todavía mostrar el resultado
      if (extractionResult && (extractionResult.raw || extractionResult.ocr)) {
        setExtractedText(extractionResult);
        setShowExtractedText(true);
        addLog('Se muestra el texto extraído parcialmente (puede estar incompleto)', 'warning');
      }
      
      return false;
    } finally {
      setLoading(false);
      setProcessingFile(null);
    }
  };
  
  // Procesar todos los archivos
  const processAllFiles = async () => {
    if (selectedFiles.length === 0) {
      setError('No hay archivos seleccionados para procesar.');
      return;
    }
    
    for (const file of selectedFiles) {
      await processFile(file);
    }
    
    // Limpiar la lista de archivos
    setSelectedFiles([]);
  };
  
  // Remover un archivo de la lista
  const removeFile = (index) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };
  
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3,
        borderRadius: 2,
        position: 'relative'
      }}
    >
      {apiKeyMissing && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No se ha configurado una API key para OpenRouter. Algunas funciones pueden no estar disponibles.
        </Alert>
      )}
      
      {/* Área de carga de archivos */}
      <Box
        sx={{
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          backgroundColor: dragActive ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          style={{ display: 'none' }}
          accept="application/pdf,image/png,image/jpeg,image/jpg,image/gif,image/tiff,image/bmp"
        />
        
        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Arrastra o haz clic para subir tus estados de cuenta
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Soporta PDFs e imágenes (JPG, PNG, GIF, TIF, BMP)
        </Typography>
      </Box>
      
      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              Archivos seleccionados: {selectedFiles.length}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={processAllFiles}
              disabled={loading}
            >
              Procesar todos
            </Button>
          </Stack>
          
          <Paper variant="outlined" sx={{ p: 0 }}>
            {selectedFiles.map((file, index) => (
              <Stack 
                key={index} 
                direction="row" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                  p: 1.5, 
                  borderBottom: index < selectedFiles.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <InsertDriveFile color="primary" />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {(file.size / 1024).toFixed(2)} KB
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                    onClick={() => processFile(file)}
                    disabled={loading}
                  >
                    Procesar
                  </Button>
                  <Button 
                    size="small" 
                    color="error" 
                    onClick={() => removeFile(index)}
                  >
                    Eliminar
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Paper>
        </Box>
      )}
      
      {/* Indicador de carga durante el procesamiento */}
      {loading && (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Procesando: {processingFile}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ mt: 2 }}
            onClick={() => setShowExtractedText(!showExtractedText)}
          >
            {showExtractedText ? 'Ocultar' : 'Mostrar'}
          </Button>
          
          {showExtractedText && (
            <Box sx={{ mt: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1">
                  Vista previa del texto extraído
                  {extractedText.bankType && extractedText.bankType !== 'Desconocido' && (
                    <span> - Banco detectado: <strong>{extractedText.bankType}</strong></span>
                  )}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button 
                    size="small" 
                    onClick={() => {
                      const modes = ['raw', 'ocr'];
                      const currentIndex = modes.indexOf(textViewMode);
                      const nextIndex = (currentIndex + 1) % modes.length;
                      setTextViewMode(modes[nextIndex]);
                    }}
                    startIcon={<Visibility />}
                  >
                    Ver texto {textViewMode === 'raw' ? 'procesado' : 'original'}
                  </Button>
                </Stack>
              </Stack>
              
              <Paper 
                variant="outlined" 
                sx={{ 
                  maxHeight: '200px', 
                  overflow: 'auto', 
                  p: 1,
                  backgroundColor: '#f5f5f5',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {textViewMode === 'raw' ? extractedText.raw : extractedText.ocr}
              </Paper>
            </Box>
          )}
        </Box>
      )}
      
      {/* Log de procesamiento en tiempo real */}
      {processLogs.length > 0 && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              Registro de procesamiento en tiempo real
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              color="primary"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? 'Ocultar' : 'Mostrar'}
            </Button>
          </Box>
          
          {showLogs && (
            <Paper 
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: 300,
                overflowY: 'auto',
                backgroundColor: 'black',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}
            >
              {processLogs.map((log, index) => (
                <Box key={index} sx={{ mb: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    sx={{
                      fontFamily: 'monospace',
                      color: log.type === 'error' ? '#ff6b6b' :
                             log.type === 'warning' ? '#ffd166' :
                             log.type === 'success' ? '#06d6a0' : '#f8f9fa'
                    }}
                  >
                    [{log.timestamp}] - {log.message}
                  </Typography>
                </Box>
              ))}
              <div ref={logsEndRef} />
            </Paper>
          )}
        </Box>
      )}
      
      {selectedFiles.length === 0 && !loading && !processLogs.length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Todos los análisis se realizan localmente en tu navegador. Tus archivos no se suben a ningún servidor.
        </Alert>
      )}
    </Paper>
  );
};

export default PdfUploader;
