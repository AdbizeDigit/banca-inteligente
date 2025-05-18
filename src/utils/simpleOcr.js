import { createWorker } from 'tesseract.js';

/**
 * Función simple para realizar OCR en archivos PDF que son imágenes
 * @param {File} file - Archivo PDF a procesar
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<string>} - Texto extraído
 */
export const performOcrOnFile = async (file, progressCallback = () => {}) => {
  try {
    // Crear un worker de Tesseract con soporte para español e inglés
    progressCallback("Inicializando motor de OCR...");
    const worker = await createWorker('spa+eng');
    
    // Configurar Tesseract para documentos financieros
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:$%()=+-_*#@!?/\\"\'áéíóúÁÉÍÓÚñÑ ',
      preserve_interword_spaces: '1'
    });
    
    // Crear URL para el archivo
    const fileUrl = URL.createObjectURL(file);
    
    // Iniciar el reconocimiento
    progressCallback("Procesando documento con OCR (esto puede tardar hasta 30 segundos)...");
    const { data } = await worker.recognize(fileUrl);
    
    // Liberar recursos
    URL.revokeObjectURL(fileUrl);
    await worker.terminate();
    
    progressCallback("OCR completado con éxito");
    
    return data.text;
  } catch (error) {
    console.error("Error en OCR:", error);
    throw new Error(`Error al procesar el documento con OCR: ${error.message}`);
  }
};

/**
 * Limpia y mejora el texto extraído por OCR
 * @param {string} text - Texto extraído por OCR
 * @returns {string} - Texto limpio
 */
export const cleanOcrText = (text) => {
  if (!text) return '';
  
  return text
    // Eliminar caracteres no imprimibles
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    // Normalizar espacios
    .replace(/\s+/g, ' ')
    // Mejorar saltos de línea
    .replace(/\n\s*\n/g, '\n\n')
    // Corregir números separados por espacios
    .replace(/(\d)\s+(\d)/g, '$1$2')
    // Mejorar formato de montos monetarios
    .replace(/\$\s*(\d+)\s*,\s*(\d+)\s*\.\s*(\d+)/g, '$$1,$2.$3')
    // Mejorar formato de fechas
    .replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/g, '$1/$2/$3')
    .trim();
};

/**
 * Verifica si un PDF probablemente es una imagen escaneada
 * basándose en la calidad del texto extraído
 * @param {string} extractedText - Texto extraído del PDF
 * @returns {boolean} - True si parece una imagen escaneada
 */
export const isProbablyScannedPdf = (extractedText) => {
  if (!extractedText) return true;
  
  // Si el texto es muy corto, probablemente sea una imagen
  if (extractedText.length < 200) return true;
  
  // Contar caracteres problemáticos (que no son texto normal, números o símbolos comunes)
  const problematicChars = (extractedText.match(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,;:$%()=+\-_*#@!?\/\\'"]/g) || []);
  const problematicRatio = problematicChars.length / extractedText.length;
  
  // Si hay muchos caracteres problemáticos, probablemente sea una imagen escaneada mal extraída
  return problematicRatio > 0.08;
};

export default {
  performOcrOnFile,
  cleanOcrText,
  isProbablyScannedPdf
};
