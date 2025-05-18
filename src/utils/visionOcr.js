/**
 * Implementación de extracción de texto mediante visión artificial (OCR)
 * Utiliza Tesseract.js para reconocimiento óptico de caracteres en el navegador
 */

import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

// Asegúrate de establecer el worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Convierte una página de PDF a una imagen base64
 * @param {Object} pdfDoc - Documento PDF cargado con PDF.js
 * @param {number} pageNum - Número de página a convertir
 * @returns {Promise<string>} - Imagen base64
 */
async function pdfPageToImage(pdfDoc, pageNum, scale = 2.0) {
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
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error al convertir página a imagen:', error);
    throw error;
  }
}

/**
 * Extrae texto de un PDF utilizando OCR (Tesseract.js)
 * @param {File} pdfFile - Archivo PDF
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<string>} - Texto extraído
 */
export async function extractTextWithOCR(pdfFile, progressCallback = () => {}) {
  try {
    progressCallback('Inicializando motor OCR...');
    
    // Crear worker con la API actualizada de Tesseract.js v6
    const worker = await createWorker({
      // En lugar de usar logger (que causa problemas), reportamos progreso manualmente
      // Esta es la nueva forma de inicializar el worker con v6
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });
    
    // Cargar idioma español e inglés para mayor precisión (nuevo formato en v6)
    progressCallback('Cargando idiomas español e inglés...');
    await worker.load();
    await worker.loadLanguage('spa+eng');
    await worker.initialize('spa+eng');
    progressCallback('Idiomas cargados correctamente.');
    
    // Usar reconocimiento con opciones específicas para documentos financieros
    const recognizeOptions = {
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:$%()=+-/*"\'´_[]{}eáíóúüñÉÁÍÓÚÜÑ ',
    };
    
    // Leer el archivo PDF como un ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el PDF con PDF.js
    progressCallback('Cargando documento PDF...');
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    // Extraer texto de cada página
    progressCallback(`Documento cargado. Procesando ${pdf.numPages} páginas con OCR...`);
    let completeText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      progressCallback(`Procesando página ${i} de ${pdf.numPages}...`);
      
      // Convertir página a imagen
      const imageBase64 = await pdfPageToImage(pdf, i);
      
      // Reconocer texto con Tesseract usando la nueva API
      progressCallback(`Aplicando OCR a la página ${i}...`);
      const result = await worker.recognize(imageBase64, recognizeOptions);
      
      // Añadir separador de página
      if (i > 1) {
        completeText += '\n--- Página ' + i + ' ---\n';
      }
      
      completeText += result.data.text + '\n';
    }
    
    // Finalizar el worker
    await worker.terminate();
    
    progressCallback('Procesamiento OCR completado');
    return completeText;
  } catch (error) {
    console.error('Error en OCR:', error);
    progressCallback(`Error en extracción OCR: ${error.message}`);
    throw error;
  }
}

/**
 * Detecta si el OCR sería más beneficioso que la extracción directa
 * @param {string} directText - Texto extraído directamente
 * @returns {boolean} - True si se recomienda usar OCR
 */
export function shouldUseOCR(directText) {
  // Si el texto es muy corto o contiene muchos caracteres extraños
  if (!directText || directText.length < 200) return true;
  
  // Contar caracteres especiales que suelen indicar problemas de extracción
  const specialChars = directText.match(/[^\w\s.,;:$%()=+-/*"'´áéíóúüñÁÉÍÓÚÜÑ]/g) || [];
  const specialCharRatio = specialChars.length / directText.length;
  
  // Si más del 15% son caracteres especiales, sugerir OCR
  return specialCharRatio > 0.15;
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
