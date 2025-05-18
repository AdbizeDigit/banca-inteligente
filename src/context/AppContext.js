import React, { createContext, useContext, useState, useEffect } from 'react';

// Crear el contexto
const AppContext = createContext();

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Estado para los archivos PDF subidos
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  // Estado para los análisis de los estados bancarios
  const [analyses, setAnalyses] = useState([]);
  
  // Estado para el historial del chat
  const [chatHistory, setChatHistory] = useState([]);
  
  // Estado para las categorías de gastos
  const [categories, setCategories] = useState({});
  
  // Estado para el resumen financiero
  const [financialSummary, setFinancialSummary] = useState(null);
  
  // Estado para las recomendaciones
  const [recommendations, setRecommendations] = useState([]);
  
  // Estado para el archivo actualmente seleccionado
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Estado para controlar cargas y procesamiento
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Cargar datos guardados del localStorage al iniciar
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('bancaInteligenteData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        if (parsedData.analyses) setAnalyses(parsedData.analyses);
        if (parsedData.categories) setCategories(parsedData.categories);
        if (parsedData.financialSummary) setFinancialSummary(parsedData.financialSummary);
        if (parsedData.recommendations) setRecommendations(parsedData.recommendations);
        if (parsedData.chatHistory) setChatHistory(parsedData.chatHistory);
      }
    } catch (err) {
      console.error('Error al cargar datos guardados:', err);
    }
  }, []);
  
  // Guardar datos en localStorage cuando cambian
  useEffect(() => {
    if (analyses.length > 0 || Object.keys(categories).length > 0 || financialSummary || recommendations.length > 0) {
      try {
        const dataToSave = {
          analyses,
          categories,
          financialSummary,
          recommendations,
          chatHistory
        };
        
        localStorage.setItem('bancaInteligenteData', JSON.stringify(dataToSave));
      } catch (err) {
        console.error('Error al guardar datos:', err);
      }
    }
  }, [analyses, categories, financialSummary, recommendations, chatHistory]);
  
  // Métodos para manipular el estado
  const addUploadedFile = (file) => {
    setUploadedFiles(prev => [...prev, file]);
  };
  
  const addAnalysis = (fileId, analysis) => {
    setAnalyses(prev => [...prev, { fileId, analysis, timestamp: new Date().toISOString() }]);
  };
  
  const updateCategories = (newCategories) => {
    setCategories(prev => ({ ...prev, ...newCategories }));
  };
  
  const updateFinancialSummary = (summary) => {
    setFinancialSummary(summary);
  };
  
  const addRecommendation = (recommendation) => {
    setRecommendations(prev => [...prev, { text: recommendation, timestamp: new Date().toISOString() }]);
  };
  
  const addChatMessage = (message, isUser = true) => {
    setChatHistory(prev => [...prev, { 
      role: isUser ? 'user' : 'assistant',
      content: message, 
      timestamp: new Date().toISOString() 
    }]);
  };
  
  const clearData = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar todos los datos? Esta acción no se puede deshacer.')) {
      setUploadedFiles([]);
      setAnalyses([]);
      setCategories({});
      setFinancialSummary(null);
      setRecommendations([]);
      setChatHistory([]);
      setSelectedFile(null);
      localStorage.removeItem('bancaInteligenteData');
    }
  };
  
  // Valores que se proveerán a través del contexto
  const contextValue = {
    uploadedFiles,
    analyses,
    categories,
    financialSummary,
    recommendations,
    chatHistory,
    selectedFile,
    loading,
    error,
    addUploadedFile,
    addAnalysis,
    updateCategories,
    updateFinancialSummary,
    addRecommendation,
    addChatMessage,
    setSelectedFile,
    setLoading,
    setError,
    clearData
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
