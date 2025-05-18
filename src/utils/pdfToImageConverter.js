/**
 * Conversor de PDF a imágenes usando react-pdf y canvas
 * Esta implementación evita problemas de compatibilidad con PDF.js
 */

// Importar paquete React PDF (diferente implementación a PDF.js)
import { pdfjs, Document, Page } from 'react-pdf';

// Configurar worker para react-pdf 
// El worker de react-pdf es diferente al de PDF.js directo
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

/**
 * Convierte un PDF a un array de imágenes (una por página)
 * @param {File} pdfFile - El archivo PDF a convertir
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<Array<File>>} Array de archivos de imagen
 */
export const convertPdfToImages = async (pdfFile, progressCallback = () => {}) => {
  try {
    progressCallback('Iniciando conversión de PDF a imágenes...');
    
    // Cargar el archivo PDF como URL
    const pdfUrl = URL.createObjectURL(pdfFile);
    
    // Crear un documento temporal para obtener metadata
    const loadingTask = pdfjs.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    progressCallback(`PDF cargado: ${numPages} páginas detectadas`);
    
    // Array para almacenar las imágenes resultantes
    const imageFiles = [];
    
    // Crear un elemento Document fuera del DOM para procesamiento
    const docElement = document.createElement('div');
    docElement.style.position = 'absolute';
    docElement.style.left = '-9999px';
    document.body.appendChild(docElement);
    
    // Procesar cada página
    for (let i = 1; i <= numPages; i++) {
      progressCallback(`Procesando página ${i} de ${numPages}...`);
      
      try {
        // Extraer la página
        const page = await pdf.getPage(i);
        
        // Obtener las dimensiones de la página
        const viewport = page.getViewport({ scale: 1.5 }); // Usar escala mayor para mejor resolución
        
        // Crear un canvas para renderizar la página
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar la página en el canvas
        const renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });
        
        await renderTask.promise;
        
        // Convertir el canvas a un blob de imagen
        const imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });
        
        // Crear un archivo de imagen a partir del blob
        const imageFile = new File(
          [imageBlob],
          `page_${i}.jpg`,
          { type: 'image/jpeg' }
        );
        
        // Reportar tamaño
        const fileSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
        progressCallback(`Página ${i} convertida a imagen (${fileSizeMB}MB)`);
        
        // Añadir al array de imágenes
        imageFiles.push(imageFile);
        
      } catch (error) {
        progressCallback(`Error al procesar página ${i}: ${error.message}`);
      }
    }
    
    // Limpiar
    document.body.removeChild(docElement);
    URL.revokeObjectURL(pdfUrl);
    
    progressCallback(`Conversión completada: ${imageFiles.length} imágenes generadas`);
    return imageFiles;
    
  } catch (error) {
    progressCallback(`Error en conversión PDF a imágenes: ${error.message}`);
    throw error;
  }
};

/**
 * Comprime una imagen para reducir su tamaño
 * @param {File} imageFile - El archivo de imagen a comprimir
 * @param {Function} progressCallback - Función para reportar progreso
 * @param {Object} options - Opciones de compresión
 * @returns {Promise<File>} - Archivo comprimido
 */
export const compressImage = async (imageFile, progressCallback = () => {}, options = {}) => {
  const defaultOptions = {
    quality: 0.7, // 70% por defecto
    maxWidth: 1200, // Reducir a 1200px máximo
    maxHeight: 1800,
    ...options
  };
  
  progressCallback(`Comprimiendo imagen ${imageFile.name}...`);
  
  return new Promise((resolve, reject) => {
    // Crear una imagen para cargar el archivo
    const img = new Image();
    img.onload = () => {
      try {
        // Calcular dimensiones para redimensionar
        let width = img.width;
        let height = img.height;
        
        // Redimensionar si excede los límites
        if (width > defaultOptions.maxWidth) {
          const ratio = defaultOptions.maxWidth / width;
          width = defaultOptions.maxWidth;
          height = height * ratio;
        }
        
        if (height > defaultOptions.maxHeight) {
          const ratio = defaultOptions.maxHeight / height;
          height = defaultOptions.maxHeight;
          width = width * ratio;
        }
        
        // Crear canvas para dibujar la imagen redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Dibujar con suavizado para mejor calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob con la calidad especificada
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }
            // Crear archivo a partir del blob
            const compressedFile = new File(
              [blob], 
              imageFile.name.replace('.', '_compressed.'),
              { type: 'image/jpeg' }
            );
            
            const originalSizeKB = Math.round(imageFile.size / 1024);
            const newSizeKB = Math.round(compressedFile.size / 1024);
            const reduction = Math.round((1 - (compressedFile.size / imageFile.size)) * 100);
            
            progressCallback(`Imagen comprimida: ${originalSizeKB}KB → ${newSizeKB}KB (${reduction}% reducción)`);
            resolve(compressedFile);
          },
          'image/jpeg',
          defaultOptions.quality
        );
      } catch (e) {
        reject(e);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Error al cargar imagen para compresión'));
    };
    
    img.src = URL.createObjectURL(imageFile);
  });
};
