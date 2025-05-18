/**
 * Servicio para OCR utilizando la API de OCR.space
 * https://api.ocr.space/parse/image
 */

// Importar el conversor de PDF a imágenes basado en navegador (sin dependencias de versiones)
import { convertPdfToImagesInBrowser, compressImageInBrowser } from '../utils/browserPdfConverter';

// Configuración de OCR.space API
const API_KEY = 'K89993322388957';
const API_URL = 'https://api.ocr.space/parse/image';
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_PREMIUM_FILE_SIZE = 5 * 1024 * 1024; // 5MB para cuenta premium

// Importación de dependencias
let pdfjsLib = null;
async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // No inicializamos worker aquí porque usaremos convertPdfToImages
  }
  return pdfjsLib;
}

/**
 * Extrae texto de un archivo PDF o imagen usando OCR.space API
 * @param {File} file - El archivo PDF o imagen a procesar
 * @param {Function} progressCallback - Función para reportar progreso
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Objeto con el texto extraído y metadatos
 */
export const extractTextWithOCR = async (file, progressCallback = () => {}, options = {}) => {
  try {
    progressCallback('Iniciando procesamiento OCR con OCR.space API...');
    
    // Comprobar si es un PDF para procesarlo página por página
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    // Procesamiento de PDFs usando el método de conversión a imágenes basado en navegador
    if (isPdf) {
      progressCallback(`Procesando PDF página por página automáticamente...`);
      
      try {
        // Convertir PDF a imágenes usando el conversor basado en navegador
        const imageFiles = await convertPdfToImagesInBrowser(file, progressCallback);
        
        if (imageFiles && imageFiles.length > 0) {
          // Procesar cada imagen individualmente con OCR
          return await processImagePages(imageFiles, progressCallback, options);
        } else {
          throw new Error('No se pudieron generar imágenes a partir del PDF');
        }
      } catch (conversionError) {
        progressCallback(`Error al convertir PDF a imágenes: ${conversionError.message}. Intentando método alternativo...`);
        // Si la conversión falla, continuar con el método normal para archivos pequeños
      }
    }
    
    // Verificar el tamaño del archivo para imágenes o si falló el método de división por páginas
    if (file.size > MAX_FILE_SIZE) {
      progressCallback(`Advertencia: El archivo excede el límite de 1MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
      
      // Si es una imagen, intentar comprimir
      if (file.type.startsWith('image/')) {
        progressCallback('Intentando comprimir imagen...');
        try {
          const compressedFile = await compressImageInBrowser(file, progressCallback);
          if (compressedFile && compressedFile.size <= MAX_FILE_SIZE) {
            progressCallback(`Imagen comprimida con éxito a ${(compressedFile.size / 1024).toFixed(2)}KB`);
            return await processIndividualFile(compressedFile, progressCallback, options);
          } else {
            progressCallback('La compresión no fue suficiente.');
          }
        } catch (compressError) {
          progressCallback(`Error al comprimir imagen: ${compressError.message}`);
        }
      }
      
      // Para archivos PDF grandes, convertir a imágenes y usar OCR
      if (isPdf) {
        progressCallback('Convirtiendo PDF a imágenes para procesamiento...');
        try {
          // Usar el sistema de conversión a imágenes basado en navegador
          const imageFiles = await convertPdfToImagesInBrowser(file, progressCallback);
          
          if (imageFiles && imageFiles.length > 0) {
            progressCallback(`PDF convertido a ${imageFiles.length} imágenes. Procesando con OCR...`);
            // Procesar cada imagen individualmente
            return await processImagePages(imageFiles, progressCallback, options);
          } else {
            throw new Error('No se pudieron extraer imágenes del PDF');
          }
        } catch (conversionError) {
          progressCallback(`Error en conversión a imágenes: ${conversionError.message}`);
          throw new Error(`No se pudo procesar el archivo grande: ${conversionError.message}`);
        }
      }
      
      progressCallback('El archivo es demasiado grande para la API gratuita de OCR.space (límite: 1MB)');
      throw new Error('El archivo excede el límite de tamaño de 1MB de la API gratuita de OCR.space');
    }
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', options.language || 'spa'); // Español por defecto para estados bancarios
    formData.append('isOverlayRequired', 'true'); // Obtener coordenadas del texto
    formData.append('isTable', 'true'); // Mejor para tablas como estados bancarios
    formData.append('scale', 'true'); // Mejor para PDFs de baja resolución
    formData.append('OCREngine', '2'); // Engine 2 generalmente es mejor para documentos complejos
    
    // Tipo de archivo (importante para correcta detección)
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      formData.append('filetype', 'PDF');
    } else if (file.type.includes('image/')) {
      const extension = file.name.split('.').pop().toUpperCase();
      formData.append('filetype', extension);
    }
    
    progressCallback('Enviando archivo al servicio OCR...');
    
    // Realizar la petición a la API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'apikey': API_KEY
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Error en la API OCR: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(`Error en procesamiento OCR: ${data.ErrorMessage || 'Error desconocido'}`);
    }
    
    progressCallback('Procesamiento OCR completado. Analizando resultados...');
    
    // Procesar resultados
    let fullText = '';
    let pageTexts = [];
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      data.ParsedResults.forEach((result, index) => {
        const pageText = result.ParsedText;
        fullText += pageText + '\n';
        pageTexts.push({
          pageNumber: index + 1,
          text: pageText,
          overlay: result.TextOverlay
        });
      });
    } else {
      progressCallback('Advertencia: No se encontró texto en el documento');
    }
    
    // Detectar banco del resultado
    const bankType = detectBankFromContent(fullText);
    progressCallback(`Banco detectado: ${bankType}`);
    
    // Aplicar mejoras específicas al texto según el banco
    if (bankType !== 'Desconocido') {
      fullText = bankSpecificEnhancement(fullText, bankType);
      progressCallback('Mejoras específicas aplicadas según el banco detectado');
    }
    
    return {
      raw: fullText,
      ocr: fullText, // En este caso son iguales ya que todo viene del OCR
      bankType,
      pages: pageTexts,
      parsed: data
    };
  } catch (error) {
    console.error('Error en extracción OCR:', error);
    progressCallback(`Error en extracción OCR: ${error.message}`);
    throw error;
  }
};

/**
 * Detecta el banco emisor del estado de cuenta
 * @param {string} text - Texto extraído
 * @returns {string} - Nombre del banco identificado
 */
export function detectBankFromContent(text) {
  const upperText = text.toUpperCase();
  
  if (upperText.includes('HSBC') || upperText.includes('2NOW')) {
    return 'HSBC';
  }
  
  if (upperText.includes('BBVA') || upperText.includes('BANCOMER')) {
    return 'BBVA';
  }
  
  if (upperText.includes('SANTANDER')) {
    return 'SANTANDER';
  }
  
  if (upperText.includes('BANORTE')) {
    return 'BANORTE';
  }
  
  if (upperText.includes('BANAMEX') || upperText.includes('CITIBANAMEX')) {
    return 'CITIBANAMEX';
  }
  
  return 'Desconocido';
}

/**
 * Aplica mejoras específicas adicionales según el banco detectado
 * @param {string} text - Texto extraído
 * @param {string} bankType - Tipo de banco detectado
 * @returns {string} - Texto optimizado para el banco específico
 */
export function bankSpecificEnhancement(text, bankType) {
  if (!text) return '';
  
  let enhancedText = text;
  
  switch(bankType) {
    case 'HSBC':
      // Mejoras específicas para HSBC
      enhancedText = enhancedText
        .replace(/(\d+)[,.](\d{3})[,.](\d{2})/g, '$1,$2.$3') // Formato de cantidades
        .replace(/(\d+)[ ](\d{3})[ ](\d{2})/g, '$1,$2.$3')
        .replace(/SALDO DISPONIBLE/gi, 'SALDO DISPONIBLE')
        .replace(/CARGO A MESES/gi, 'CARGO A MESES')
        .replace(/PAGO MINIMO/gi, 'PAGO MÍNIMO')
        .replace(/SALDO ANTERIOR/gi, 'SALDO ANTERIOR')
        .replace(/FECHA LIMITE/gi, 'FECHA LÍMITE');
      break;
      
    case 'BBVA':
      // Mejoras específicas para BBVA
      enhancedText = enhancedText
        .replace(/(\d+)[,\.](\d{3})[,\.](\d{2})/g, '$1,$2.$3')
        .replace(/TDC/gi, 'TARJETA DE CRÉDITO');
      break;
      
    // Puedes añadir más bancos en el futuro
      
    default:
      // No se aplican mejoras específicas
      break;
  }
  
  return enhancedText;
}

/**
 * Verifica si un archivo es procesable (PDF o imagen soportada)
 * @param {File} file - El archivo a verificar
 * @returns {boolean} - true si el archivo es procesable
 */
export const isFileProcessable = (file) => {
  if (!file) return false;
  
  // Verificar por tipo MIME
  if (file.type === 'application/pdf' || 
      file.type.startsWith('image/jpeg') || 
      file.type.startsWith('image/jpg') || 
      file.type.startsWith('image/png') || 
      file.type.startsWith('image/gif') || 
      file.type.startsWith('image/tiff') || 
      file.type.startsWith('image/bmp')) {
    return true;
  }
  
  // Verificar por extensión si el tipo MIME no está disponible
  const fileName = file.name.toLowerCase();
  // eslint-disable-next-line no-useless-escape
  const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.bmp'];
  
  return validExtensions.some(ext => fileName.endsWith(ext));
};

/**
 * Comprime una imagen para reducir su tamaño
 * @param {File} imageFile - El archivo de imagen a comprimir
 * @param {Function} progressCallback - Función para reportar progreso
 * @param {Object} options - Opciones de compresión
 * @returns {Promise<File>} - Archivo comprimido
 */
async function compressImage(imageFile, progressCallback, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      progressCallback('Comprimiendo imagen...');
      
      // Crear elemento de imagen y URL de objeto
      const img = new Image();
      const objectUrl = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        // Liberar URL de objeto
        URL.revokeObjectURL(objectUrl);
        
        // Configurar canvas para compresión
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calcular dimensiones (reducir tamaño a la mitad manteniendo relación de aspecto)
        let width = img.width;
        let height = img.height;
        
        // Objetivo: reducir tamaño para que quepa en 1MB
        const scaleFactor = Math.min(1, Math.sqrt(MAX_FILE_SIZE / imageFile.size));
        width = Math.floor(width * scaleFactor * 0.8); // 20% extra de reducción para compensar overhead
        height = Math.floor(height * scaleFactor * 0.8);
        
        // Establecer dimensiones del canvas
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Blob con calidad reducida para JPEG
        const format = options.format || 'image/jpeg';
        const quality = options.quality || 0.7; // 70% calidad
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Error al generar blob comprimido'));
            return;
          }
          
          // Crear nuevo archivo
          const fileName = imageFile.name.split('.')[0] + '_compressed.' + (format === 'image/jpeg' ? 'jpg' : 'png');
          const compressedFile = new File([blob], fileName, {
            type: format,
            lastModified: new Date().getTime()
          });
          
          resolve(compressedFile);
        }, format, quality);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error al cargar la imagen para compresión'));
      };
      img.src = objectUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Verifica si un archivo excede el tamaño máximo permitido
 * @param {File} file - El archivo a verificar
 * @returns {boolean} - True si el archivo excede el límite
 */
export function isFileTooLarge(file) {
  return file && file.size > MAX_FILE_SIZE;
}

/**
 * Procesa un PDF dividiéndolo en páginas individuales y las procesa una por una
 * @param {File} pdfFile - El archivo PDF a procesar
 * @param {Function} progressCallback - Función para reportar progreso
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Objeto con el texto extraído y metadatos combinados
 */
export async function processPdfByPages(pdfFile, progressCallback, options = {}) {
  try {
    progressCallback('Dividiendo PDF en páginas individuales...');
    
    // Cargar PDF.js
    const pdfjsLib = await loadPdfJs();
    
    // Leer el archivo como arrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el documento PDF usando nuestro worker compatible
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      disableFontFace: true,
      nativeImageDecoderSupport: 'none',
      ignoreErrors: true
    }).promise;
    const numPages = pdf.numPages;
    progressCallback(`PDF cargado. Procesando ${numPages} páginas individualmente...`);
    
    let allText = '';
    let allPageTexts = [];
    let combinedBankType = 'Desconocido';
    
    // Procesar cada página individualmente
    for (let i = 1; i <= numPages; i++) {
      progressCallback(`Procesando página ${i} de ${numPages}...`);
      
      try {
        // Obtener la página del PDF
        const page = await pdf.getPage(i);
        
        // Configurar el viewport con una escala adecuada para OCR
        const viewport = page.getViewport({scale: 1.5}); // Escala mayor para mejor calidad
        
        // Crear canvas para renderizar la página
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar página en canvas
        await page.render({canvasContext: context, viewport: viewport}).promise;
        
        // Convertir canvas a imagen JPEG con calidad reducida
        const imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.7); // Calidad 70%
        });
        
        const imageFile = new File([imageBlob], `page_${i}.jpg`, { type: 'image/jpeg' });
        const fileSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
        
        progressCallback(`Página ${i} convertida a imagen (${fileSizeMB}MB)`);
        
        // Si la imagen es demasiado grande, comprimir más
        let finalImageFile = imageFile;
        if (imageFile.size > MAX_FILE_SIZE) {
          progressCallback(`La imagen de la página ${i} excede 1MB. Comprimiendo...`);
          finalImageFile = await compressImage(imageFile, progressCallback, {
            quality: 0.5,
            maxWidth: 1800,
            maxHeight: 2500
          });
          
          const compressedSizeKB = (finalImageFile.size / 1024).toFixed(2);
          progressCallback(`Página ${i} comprimida a ${compressedSizeKB}KB`);
        }
        
        // Procesar esta página con OCR
        progressCallback(`Enviando página ${i} a OCR.space...`);
        const pageResult = await processIndividualFile(finalImageFile, progressCallback, {
          ...options,
          language: 'spa',
          isOverlayRequired: true
        });
        
        // Agregar el texto de esta página al resultado combinado
        const pageText = pageResult.raw || '';
        allText += `\n--- Página ${i} ---\n${pageText}`;
        
        // Guardar información de página
        allPageTexts.push({
          pageNumber: i,
          text: pageText,
          ...(pageResult.pages && pageResult.pages[0] ? { overlay: pageResult.pages[0].overlay } : {})
        });
        
        // Detectar tipo de banco si aún no se ha detectado
        if (combinedBankType === 'Desconocido' && pageResult.bankType !== 'Desconocido') {
          combinedBankType = pageResult.bankType;
        }
        
        progressCallback(`Página ${i} procesada (${pageText.length} caracteres)`);
        
      } catch (pageError) {
        progressCallback(`Error en página ${i}: ${pageError.message}. Continuando...`);
      }
    }
    
    // Si no se encontró texto, notificar al usuario
    if (!allText.trim()) {
      progressCallback('Advertencia: No se detectó texto en ninguna página del PDF');
    } else {
      progressCallback(`Procesamiento completado: ${allText.length} caracteres en total`);
    }
    
    return {
      raw: allText,
      ocr: allText,
      bankType: combinedBankType,
      pages: allPageTexts,
      processedByPages: true
    };
    
  } catch (error) {
    progressCallback(`Error al procesar PDF por páginas: ${error.message}`);
    throw error;
  }
}

/**
 * Procesa un conjunto de imágenes extraídas de un PDF
 * @param {Array<File>} imageFiles - Array de archivos de imagen (una por página)
 * @param {Function} progressCallback - Función para reportar progreso
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Objeto con el texto extraído y metadatos combinados
 */
async function processImagePages(imageFiles, progressCallback, options = {}) {
  try {
    progressCallback(`Procesando ${imageFiles.length} imágenes extraídas del PDF...`);
    
    let allText = '';
    let allPageTexts = [];
    let combinedBankType = 'Desconocido';
    
    // Procesar cada imagen (página) individualmente
    for (let i = 0; i < imageFiles.length; i++) {
      const pageNumber = i + 1;
      progressCallback(`Procesando imagen ${pageNumber} de ${imageFiles.length}...`);
      
      try {
        // Comprimir la imagen si es necesario para cumplir con el límite de tamaño
        let imageToProcess = imageFiles[i];
        const imageSizeMB = imageToProcess.size / (1024 * 1024);
        
        if (imageSizeMB > 0.95) { // Si está cerca del límite, comprimir
          progressCallback(`Comprimiendo imagen ${pageNumber} (${imageSizeMB.toFixed(2)}MB) para OCR...`);
          try {
            imageToProcess = await compressImageInBrowser(imageToProcess, progressCallback, {
              quality: 0.65,
              maxWidth: 1500
            });
          } catch (compressionError) {
            progressCallback(`Advertencia: No se pudo comprimir la imagen. Intentando con original.`);
          }
        }
        
        // Procesar esta página con OCR
        progressCallback(`Enviando imagen ${pageNumber} a OCR.space...`);
        const pageResult = await processIndividualFile(imageToProcess, progressCallback, {
          ...options,
          language: 'spa',
          isOverlayRequired: true
        });
        
        // Agregar el texto de esta página al resultado combinado
        const pageText = pageResult.raw || '';
        if (pageText.trim()) {
          allText += `\n--- Página ${pageNumber} ---\n${pageText}`;
          
          // Guardar información de página
          allPageTexts.push({
            pageNumber: pageNumber,
            text: pageText,
            ...(pageResult.pages && pageResult.pages[0] ? { overlay: pageResult.pages[0].overlay } : {})
          });
          
          progressCallback(`Imagen ${pageNumber} procesada (${pageText.length} caracteres)`);
          
          // Detectar tipo de banco si aún no se ha detectado
          if (combinedBankType === 'Desconocido' && pageResult.bankType !== 'Desconocido') {
            combinedBankType = pageResult.bankType;
          }
        } else {
          progressCallback(`No se detectó texto en la imagen ${pageNumber}`);
          allPageTexts.push({
            pageNumber: pageNumber,
            text: ''
          });
        }
      } catch (pageError) {
        progressCallback(`Error en imagen ${pageNumber}: ${pageError.message}. Continuando...`);
        allPageTexts.push({
          pageNumber: pageNumber,
          text: ''
        });
      }
    }
    
    // Si no se encontró texto, notificar al usuario
    if (!allText.trim()) {
      progressCallback('Advertencia: No se detectó texto en ninguna página del PDF');
    } else {
      progressCallback(`Procesamiento completado: ${allText.length} caracteres en total`);
    }
    
    return {
      raw: allText,
      ocr: allText,
      bankType: combinedBankType,
      pages: allPageTexts,
      processedByPages: true
    };
  } catch (error) {
    progressCallback(`Error al procesar imágenes: ${error.message}`);
    throw error;
  }
}

/**
 * Procesa un archivo individual (imagen) con la API OCR
 * @param {File} file - El archivo a procesar
 * @param {Function} progressCallback - Función para reportar progreso 
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} - Resultado OCR
 */
async function processIndividualFile(file, progressCallback, options = {}) {
  // Verificar si el archivo excede incluso el límite para cuentas premium
  if (file.size > MAX_PREMIUM_FILE_SIZE) {
    progressCallback(`Advertencia: Archivo extremadamente grande (${(file.size / (1024 * 1024)).toFixed(2)}MB), intentando comprimir.`);
    
    // Para archivos muy grandes, intentar comprimirlos primero
    if (file.type.startsWith('image/')) {
      try {
        const compressedFile = await compressImageInBrowser(file, progressCallback, {
          quality: 0.6,  // Compresión más agresiva
          maxWidth: 1000,
          maxHeight: 1400
        });
        
        if (compressedFile.size <= MAX_FILE_SIZE) {
          progressCallback(`Imagen comprimida con éxito para OCR.`);
          return processIndividualFile(compressedFile, progressCallback, options);
        } else {
          progressCallback(`La imagen sigue siendo demasiado grande después de comprimir (${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB).`);
          throw new Error('Archivo demasiado grande incluso después de comprimir');
        }
      } catch (compressionError) {
        progressCallback(`Error al comprimir imagen: ${compressionError.message}`);
        throw new Error(`No se pudo comprimir para procesar: ${compressionError.message}`);
      }
    } else {
      throw new Error(`Archivo demasiado grande para procesamiento (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
    }
  }
  
  // Crear FormData para enviar el archivo
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', options.language || 'spa');
  formData.append('isOverlayRequired', 'true');
  formData.append('isTable', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  
  // Tipo de archivo
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    formData.append('filetype', 'PDF');
  } else if (file.type.includes('image/')) {
    const extension = file.name.split('.').pop().toUpperCase();
    formData.append('filetype', extension);
  }
  
  progressCallback('Enviando archivo al servicio OCR...');
  
  // Realizar la petición a la API
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'apikey': API_KEY
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Error en la API OCR: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.IsErroredOnProcessing) {
    throw new Error(`Error en procesamiento OCR: ${data.ErrorMessage || 'Error desconocido'}`);
  }
  
  progressCallback('Procesamiento OCR completado. Analizando resultados...');
  
  // Procesar resultados
  let fullText = '';
  let pageTexts = [];
  
  if (data.ParsedResults && data.ParsedResults.length > 0) {
    data.ParsedResults.forEach((result, index) => {
      const pageText = result.ParsedText;
      fullText += pageText + '\n';
      pageTexts.push({
        pageNumber: index + 1,
        text: pageText,
        overlay: result.TextOverlay
      });
    });
  } else {
    progressCallback('Advertencia: No se encontró texto en el documento');
  }
  
  // Detectar banco del resultado
  const bankType = detectBankFromContent(fullText);
  
  return {
    raw: fullText,
    ocr: fullText,
    bankType,
    pages: pageTexts,
    parsed: data
  };
}
