import * as pdfjs from 'pdfjs-dist';

// Usar la misma versión exacta que tenemos instalada (5.2.133)
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.2.133/build/pdf.worker.min.js';

/**
 * Extrae el texto de un archivo PDF con opciones mejoradas
 * @param {File} file - Archivo PDF
 * @param {Object} options - Opciones de extracción
 * @returns {Promise<string>} - Texto extraído del PDF
 */
export const extractTextFromPDF = async (file, options = {}) => {
  const defaultOptions = {
    preserveFormatting: true,   // Mantener formato de texto
    includePageMarkers: true,   // Incluir marcadores de página
    normalizeSpaces: true,      // Normalizar espacios múltiples
    enhancedExtraction: true    // Usar extracción mejorada
  };
  
  const opts = { ...defaultOptions, ...options };
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    // Extraer texto de todas las páginas
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Para cada elemento de texto, normalizar caracteres y espacios
      let lastY = null;
      let lineText = '';
      
      // Ordenar los elementos por posición Y y luego X
      const sortedItems = textContent.items
        .sort((a, b) => {
          if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
            // Si están en la misma línea aproximadamente, ordenar por X
            return a.transform[4] - b.transform[4];
          }
          // Si están en diferentes líneas, ordenar por Y (de arriba hacia abajo)
          return b.transform[5] - a.transform[5];
        });
      
      // Procesar elementos ordenados
      for (const item of sortedItems) {
        // Normalizar el texto
        const normalizedText = item.str
          // Eliminar caracteres no imprimibles
          .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
          // Normalizar espacios
          .replace(/\s+/g, ' ')
          .trim();
        
        if (normalizedText.length === 0) continue;
        
        // Detectar cambio de línea
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          fullText += lineText.trim() + '\n';
          lineText = '';
        }
        
        // Añadir espacio si no es el inicio de la línea
        if (lineText.length > 0) {
          lineText += ' ';
        }
        
        lineText += normalizedText;
        lastY = item.transform[5];
      }
      
      // Añadir la última línea
      if (lineText.trim()) {
        fullText += lineText.trim() + '\n';
      }
      
      // Añadir separador de página
      fullText += '\n--- Página ' + i + ' ---\n\n';
    }
    
    // Limpiar el texto final
    fullText = fullText
      // Normalizar saltos de línea
      .replace(/\n\s*\n/g, '\n\n')
      // Eliminar caracteres especiales problemáticos
      .replace(/[\u0080-\u009F\u00A0-\u00FF]/g, match => {
        // Mapeo de caracteres especiales comunes
        const charMap = {
          '\u00A9': '(c)', // ©
          '\u00AE': '(r)', // ®
          '\u00B0': '°',   // °
          '\u00B1': '±',   // ±
          '\u00B2': '²',   // ²
          '\u00B3': '³',   // ³
          '\u00B5': 'μ',   // µ
          '\u00D7': 'x',   // ×
          '\u00F7': '/',   // ÷
          '\u00A0': ' ',   // espacio no rompible
          // Añadir más mapeos según sea necesario
        };
        
        return charMap[match] || ' ';
      })
      // Normalizar espacios redundantes
      .replace(/\s+/g, ' ')
      // Normalizar espacios alrededor de signos de puntuación
      .replace(/ ([.,;:!?])/g, '$1')
      // Normalizar saltos de línea
      .replace(/\n\s*\n/g, '\n\n');
    
    return fullText;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  }
};

/**
 * Normaliza caracteres especiales comunes en documentos bancarios
 * @param {string} text - Texto extraído del PDF que puede contener caracteres especiales
 * @returns {string} - Texto normalizado con caracteres legibles
 */
export const normalizeBankText = (text) => {
  if (!text) return "";
  
  // Mapeo de caracteres especiales usados comúnmente en documentos bancarios
  const bankCharMap = {
    'ð': '0', 'ñ': '1', 'ò': '2', 'ó': '3', 'ô': '4', 
    'õ': '5', 'ö': '6', '÷': '7', 'ø': '8', 'ù': '9',
    'Õ': 'N', 'Ö': 'O', 'Ç': 'C', 'É': 'E', 'Á': 'A',
    'Å': 'E', 'Â': 'B', 'Ã': 'C', 'Ä': 'D', 'Æ': 'F',
    'È': 'H', 'Ù': 'R', 'Ú': 'S', 'Û': 'T', 'Ü': 'U',
    'Ý': 'V', 'Þ': 'X', 'ß': 'Y', 'à': 'Z', 'Ñ': 'Ñ',
    'ä': 'd', 'ã': 'c', 'â': 'b', 'á': 'a', 'å': 'e',
    'é': 'i', 'è': 'h', 'ç': 'g', 'æ': 'f', 'í': 'm',
    'ì': 'l', 'ë': 'k', 'ê': 'j', 'ï': 'o', 'î': 'n',
    'ú': 's', 'ù': 'r', 'ø': 'p', '÷': 'q', 'ý': 'w',
    'ü': 'u', 'û': 't', '£': 'L', '¢': 'o', '×': 'x',
    'Ô': 'M', 'Ò': 'K', 'Ï': 'I', 'Ð': 'J', 'Ì': 'G',
    '@': '@', '#': '#', '$': '$', '%': '%', '^': '^',
    '&': '&', '*': '*', '(': '(', ')': ')', '-': '-',
    '+': '+', '=': '=', '{': '{', '}': '}', '[': '[',
    ']': ']', '|': '|', '\\': '\\', ':': ':', ';': ';',
    '"': '"', '\'': '\'', '<': '<', '>': '>', ',': ',',
    '.': '.', '?': '?', '/': '/',
  };
  
  // Substituir caracteres especiales por sus equivalentes legibles
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (bankCharMap[char]) {
      normalized += bankCharMap[char];
    } else {
      normalized += char;
    }
  }
  
  // Corregir números de cuenta y cantidades (patrón específico de bancos)
  normalized = normalized
    // Corregir números separados por espacio
    .replace(/([0-9]) ([0-9])/g, '$1$2')
    // Normalizar formatos de cantidades y números de cuenta
    .replace(/([0-9]),([0-9]{3})/g, '$1$2')
    // Normalizar marcadores especiales de saldos
    .replace(/\[(.*?)\]/g, '$1')
    // Reemplazar texto común en documentos bancarios
    .replace(/No\./gi, 'Número')
    .replace(/Num\./gi, 'Número')
    .replace(/Ref\./gi, 'Referencia');
  
  return normalized;
};

/**
 * Sanitiza el texto del PDF para remover información personal sensible
 * @param {string} text - Texto extraído del PDF
 * @returns {string} - Texto sanitizado
 */
export const sanitizePersonalData = (text) => {
  // Reemplazar posibles números de tarjeta de crédito (16 dígitos, pueden estar separados por espacios o guiones)
  const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  text = text.replace(creditCardRegex, '[NÚMERO DE TARJETA REDACTADO]');
  
  // Reemplazar posibles números de cuenta bancaria (normalmente entre 10-20 dígitos)
  const accountNumberRegex = /\b\d{10,20}\b/g;
  text = text.replace(accountNumberRegex, '[NÚMERO DE CUENTA REDACTADO]');
  
  // Reemplazar CLABE interbancaria (18 dígitos en México)
  const clabeRegex = /\b\d{18}\b/g;
  text = text.replace(clabeRegex, '[CLABE REDACTADA]');
  
  // Reemplazar posibles direcciones de correo electrónico
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  text = text.replace(emailRegex, '[CORREO REDACTADO]');
  
  // Reemplazar nombres completos (esto es más complejo y podría necesitar mejoras específicas)
  // Esta implementación es básica y podría requerir ajustes según el formato específico
  const nameRegex = /Titular:?\s*([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/g;
  text = text.replace(nameRegex, 'Titular: [NOMBRE REDACTADO]');
  
  return text;
};
