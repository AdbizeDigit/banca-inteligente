/**
 * Este archivo proporciona una forma simple y robusta de extraer texto de PDFs
 * sin depender de configuraciones complejas de workers
 */

/**
 * Extrae texto de un PDF utilizando un método básico pero confiable
 * @param {File} pdfFile - El archivo PDF del cual extraer el texto
 * @param {Function} onProgress - Función callback para reportar progreso
 * @returns {Promise<string>} - El texto extraído del PDF
 */
export const extractTextFromPDF = async (pdfFile, onProgress = () => {}) => {
  try {
    // Carga dinámica de PDF.js solo cuando se necesita
    // Esto evita conflictos de configuración en tiempo de compilación
    const pdfjs = await import('pdfjs-dist/webpack');
    
    // Usar versión específica del worker desde CDN
    const version = pdfjs.version || '5.2.133';
    const workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    
    // Notificar inicio
    onProgress('Iniciando extracción de texto del PDF...');
    
    // Convertir el archivo a ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el documento
    onProgress('Cargando documento PDF...');
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Obtener el número de páginas
    const numPages = pdf.numPages;
    onProgress(`Documento cargado (${numPages} páginas)`);
    
    // Extraer texto de cada página
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress(`Procesando página ${pageNum} de ${numPages}`);
      
      // Obtener la página
      const page = await pdf.getPage(pageNum);
      
      // Extraer texto de la página
      const content = await page.getTextContent();
      
      // Procesar elementos de texto preservando formato
      let lastY;
      let pageText = '';
      let lineText = '';
      
      // Ordenar elementos por posición (primero por Y, luego por X)
      const items = [...content.items].sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) < 5) {
          return a.transform[4] - b.transform[4];
        }
        return b.transform[5] - a.transform[5];
      });
      
      // Procesar cada elemento de texto
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const y = item.transform[5];
        const text = item.str || '';
        
        if (text.trim() === '') continue;
        
        // Detectar cambios de línea basados en la posición Y
        if (lastY !== undefined && Math.abs(y - lastY) > 5) {
          pageText += lineText.trim() + '\n';
          lineText = '';
        }
        
        // Añadir espacio si no es inicio de línea
        if (lineText && text) {
          lineText += ' ';
        }
        
        lineText += text;
        lastY = y;
      }
      
      // Añadir la última línea
      if (lineText.trim()) {
        pageText += lineText.trim();
      }
      
      // Añadir el texto de la página con un separador
      fullText += pageText.trim() + `\n\n--- Página ${pageNum} ---\n\n`;
    }
    
    onProgress('Extracción de texto completada');
    
    // Limpiar y normalizar el texto final
    const cleanedText = fullText
      // Eliminar múltiples espacios en blanco
      .replace(/\s+/g, ' ')
      // Normalizar saltos de línea
      .replace(/\n\s*\n/g, '\n\n')
      // Eliminar caracteres no imprimibles
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .trim();
    
    return cleanedText;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw new Error(`Error al extraer texto: ${error.message}`);
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
  };
  
  // Substituir caracteres especiales por sus equivalentes legibles
  let normalized = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    normalized += bankCharMap[char] || char;
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
  if (!text) return "";
  
  // Reemplazar posibles números de tarjeta de crédito
  const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  text = text.replace(creditCardRegex, '[NÚMERO DE TARJETA REDACTADO]');
  
  // Reemplazar posibles números de cuenta bancaria
  const accountNumberRegex = /\b\d{10,20}\b/g;
  text = text.replace(accountNumberRegex, '[NÚMERO DE CUENTA REDACTADO]');
  
  // Reemplazar CLABE interbancaria (18 dígitos en México)
  const clabeRegex = /\b\d{18}\b/g;
  text = text.replace(clabeRegex, '[CLABE REDACTADA]');
  
  // Reemplazar posibles direcciones de correo electrónico
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  text = text.replace(emailRegex, '[CORREO REDACTADO]');
  
  return text;
};
