/**
 * Servicio de OCR basado en API (OCR.space)
 * Permite extraer texto de imágenes de manera confiable
 */

// Usaremos la API gratuita de OCR.space que ofrece hasta 500 peticiones gratis por día
// No requiere registro, solo usar la API key gratuita
const OCR_API_KEY = 'K83739770488957';  // API key gratuita de OCR.space

/**
 * Convierte una página de PDF a una imagen base64 para enviar a la API OCR
 * @param {Object} pdfDoc - Documento PDF cargado con PDF.js
 * @param {number} pageNum - Número de página a convertir
 * @returns {Promise<string>} - Imagen base64
 */
export async function pdfPageToImage(pdfDoc, pageNum, scale = 2.0) {
  try {
    // Obtener la página
    const page = await pdfDoc.getPage(pageNum);
    
    // Definir escala para mejorar la resolución para OCR
    const viewport = page.getViewport({ scale });
    
    // Crear un canvas para renderizar la página
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Renderizar la página en el canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Convertir canvas a imagen base64
    const imageBase64 = canvas.toDataURL('image/png');
    
    // Mantener el formato completo que OCR.space necesita
    return imageBase64;
  } catch (error) {
    console.error('Error al convertir página a imagen:', error);
    throw error;
  }
}

/**
 * Envía una imagen base64 a la API OCR.space para extraer texto
 * @param {string} imageBase64 - Imagen codificada en base64 (sin prefijo)
 * @returns {Promise<string>} - Texto extraído
 */
async function extractTextFromImage(imageBase64, retryCount = 0) {
  try {
    // Extraer la parte base64 sin el prefijo para usar en la API
    const base64Data = imageBase64.split(',')[1];
    
    // Verificar que tenemos datos válidos
    if (!base64Data) {
      throw new Error('Datos de imagen no válidos');
    }
    
    const formData = new FormData();
    formData.append('apikey', OCR_API_KEY);
    formData.append('base64Image', base64Data);
    formData.append('language', 'spa'); // Español
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('isTable', 'true'); // Mejor para estados bancarios
    formData.append('OCREngine', '2'); // Motor OCR más preciso
    formData.append('filetype', 'png'); // Especificar el tipo de archivo
    
    console.log('Enviando imagen a OCR.space...');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Error en API OCR: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.IsErroredOnProcessing) {
      throw new Error(`Error en procesamiento OCR: ${result.ErrorMessage}`);
    }
    
    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No se pudo extraer texto de la imagen');
    }
    
    return result.ParsedResults[0].ParsedText;
  } catch (error) {
    console.error(`Error en OCR API (intento ${retryCount + 1}):`, error);
    
    // Sistema de reintentos - intentar hasta 3 veces en caso de error
    if (retryCount < 2) { // Máximo 3 intentos (0, 1, 2)
      console.log(`Reintentando OCR (intento ${retryCount + 2} de 3)...`);
      // Esperar un segundo antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
      return extractTextFromImage(imageBase64, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Extrae texto de un PDF utilizando la API OCR.space
 * @param {File} pdfFile - Archivo PDF
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<string>} - Texto extraído
 */
export async function extractTextWithOCR(pdfFile, progressCallback = () => {}) {
  try {
    progressCallback('Inicializando procesamiento OCR en la nube...');
    
    // Leer el archivo PDF como un ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el PDF con PDF.js
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    
    progressCallback('Cargando documento PDF...');
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Extraer texto de cada página
    progressCallback(`Documento cargado. Procesando ${pdf.numPages} páginas con OCR en la nube...`);
    let completeText = '';
    
    // Para ser respetuosos con la API gratuita, procesamos las primeras 4 páginas
    // (suficiente para la mayoría de estados bancarios)
    const pagesToProcess = Math.min(pdf.numPages, 4);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      progressCallback(`Procesando página ${i} de ${pagesToProcess}...`);
      
      // Convertir página a imagen
      progressCallback(`Convirtiendo página ${i} a imagen...`);
      const imageBase64 = await pdfPageToImage(pdf, i);
      
      // Reconocer texto con la API OCR
      progressCallback(`Enviando página ${i} a la API de OCR...`);
      const extractedText = await extractTextFromImage(imageBase64);
      
      // Añadir separador de página
      if (i > 1) {
        completeText += '\n--- Página ' + i + ' ---\n';
      }
      
      completeText += extractedText + '\n';
    }
    
    progressCallback('Procesamiento OCR completado exitosamente');
    return completeText;
  } catch (error) {
    console.error('Error en OCR:', error);
    progressCallback(`Error en extracción OCR: ${error.message}`);
    throw error;
  }
}

/**
 * Limpia y formatea el texto extraído por OCR
 * @param {string} text - Texto extraído con OCR
 * @returns {string} - Texto limpio y formateado
 */
export function cleanOcrText(text) {
  if (!text) return "";
  
  return text
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    // Normalizar saltos de línea
    .replace(/\n+/g, '\n')
    // Normalizar caracteres de moneda
    .replace(/\$(s+)\d/g, '$$$1')
    // Eliminar caracteres invisibles
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalizar guiones
    .replace(/[‐‑‒–—―−]/g, '-')
    // Normalizar comillas
    .replace(/[''‛]/g, "'")
    .replace(/[""„‟]/g, '"')
    // Normalizar espacios después de signos de puntuación
    .replace(/([.,;:!?])(\w)/g, '$1 $2')
    // Tratar posibles errores OCR en cifras
    .replace(/(\d)[\s,.](\d{3}([.,]\d{1,2})?)/g, '$1,$2')
    .trim();
}
