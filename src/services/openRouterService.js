import { OpenAI } from 'openai';

// Constantes para API key y configuraciones
const DEFAULT_API_KEY = "sk-83af55b186ce4123923cfd6b54db74e3";
const LOCAL_STORAGE_KEY = 'deepseekApiKey';
const API_MODEL = "deepseek-chat";

// Función para obtener la API key
const getApiKey = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_API_KEY;
  }
  
  try {
    // Intentar obtener la API key desde localStorage
    const savedKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedKey || DEFAULT_API_KEY;
  } catch (error) {
    console.warn('Error accediendo a localStorage:', error);
    return DEFAULT_API_KEY;
  }
};

// Inicializar localStorage si es posible
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, DEFAULT_API_KEY);
    }
  } catch (error) {
    console.warn('No se pudo inicializar localStorage:', error);
  }
}

// Función para guardar la API key
export const saveApiKey = (apiKey) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
      return true;
    } catch (error) {
      console.error('Error guardando API key:', error);
      return false;
    }
  }
  return false;
};

// Función para crear un cliente de DeepSeek
const createClient = () => {
  const apiKey = getApiKey();
  console.log(`Configurando cliente DeepSeek (${API_MODEL}), API key: ${apiKey.substring(0, 10)}...`);
  
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
};

// Verificar si hay una API key configurada
export const hasApiKey = () => {
  const apiKey = getApiKey();
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
};

// Función para analizar el contenido de los PDFs
export const analyzeBankStatement = async (content) => {
  try {
    if (!hasApiKey()) {
      throw new Error('No se ha configurado una API key para OpenRouter. Por favor, configúrala en la sección de ajustes.');
    }
    
    console.log('Iniciando análisis del estado bancario con OpenRouter...');
    
    // Crear cliente una sola vez
    const client = createClient();
    
    // Truncar contenido si es necesario
    const maxContentLength = 50000; // Reducido para evitar problemas de tamaño
    const truncatedContent = content.length > maxContentLength ? 
      content.substring(0, maxContentLength) + '... [Contenido truncado debido a limitaciones de tamaño]' : 
      content;
    
    // Crear la solicitud de completación
    const systemPrompt = "Eres un asistente financiero especializado en analizar estados bancarios. Proporciona análisis detallados con: 1) Resumen Financiero conciso, 2) Categorización de gastos, 3) Patrones detectados, 4) Recomendaciones financieras. Usa formato claro y estructurado."
    
    const userPrompt = `Analiza este estado bancario y proporciona:
      1. Resumen Financiero: Incluye un resumen claro y conciso de la situación financiera.
      2. Categorización de gastos: Clasifica todos los gastos en categorías e incluye montos.
      3. Patrones Detectados: Identifica patrones de gasto inusuales o recurrentes.
      4. Recomendaciones Financieras: Ofrece recomendaciones accionables.
      5. Análisis Completo: Proporciona un análisis detallado de la información.
      
      Usa secciones claras, listas numeradas y viñetas.
      Incluye datos numéricos y porcentajes cuando sea posible.
      No incluyas información personal sensible.
      
      Contenido del estado bancario:
      ${truncatedContent}`;
      
    console.log('Enviando solicitud a DeepSeek con modelo:', API_MODEL);
    
    const response = await client.chat.completions.create({
      model: API_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      stream: false
    });
    
    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('Respuesta inválida de la API de DeepSeek');
    }
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error al analizar el estado bancario:", error);
    if (error.status === 401) {
      console.error("Error de autenticación. Verifique su API key de OpenRouter.");
    }
    throw error;
  }
};

// Función para obtener respuestas del chatbot
export const getChatbotResponse = async (message, history) => {
  try {
    if (!hasApiKey()) {
      throw new Error('No se ha configurado una API key para OpenRouter. Por favor, configúrala en la sección de ajustes.');
    }
    
    console.log('Iniciando chat con OpenRouter...');
    const client = createClient(); // Sin pasar apiKey, se obtiene internamente
    
    // Truncar el mensaje si es necesario
    const maxMessageLength = 10000;
    const truncatedMessage = typeof message === 'string' && message.length > maxMessageLength ? 
      message.substring(0, maxMessageLength) + '... [Contenido truncado debido a limitaciones de tamaño]' : 
      message;
    
    // Asegurar que history sea un arreglo válido
    const validHistory = Array.isArray(history) ? history : [];
    
    // Construir mensajes para la API
    const messages = [
      {
        role: "system",
        content: "Eres un asistente financiero amigable que ayuda a entender y mejorar las finanzas personales basándote en estados bancarios analizados previamente."
      },
      ...validHistory,
      {
        role: "user",
        content: truncatedMessage
      }
    ];
    
    // Limitar la longitud del historial si es necesario
    const limitedMessages = messages.length > 20 ? messages.slice(-20) : messages;
    
    console.log(`Enviando solicitud de chat a DeepSeek con ${limitedMessages.length} mensajes`);
    
    const response = await client.chat.completions.create({
      model: API_MODEL,
      messages: limitedMessages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    });
    
    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('Respuesta inválida de la API de DeepSeek');
    }
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error al obtener respuesta del chatbot:", error);
    if (error.status === 401) {
      console.error("Error de autenticación. Verifique su API key de OpenRouter.");
    }
    throw error;
  }
};
