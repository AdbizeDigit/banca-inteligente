/**
 * Conversor de PDF a imágenes usando la capacidad nativa del navegador
 * Esta implementación evita completamente los problemas de version mismatch
 * al no depender de PDF.js local ni de react-pdf
 */

// Configuración y constantes
const PDFJS_CDN_VERSION = '2.16.105'; // Versión específica de PDF.js a usar
const PDFJS_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_CDN_VERSION}`;
const PDF_WORKER_URL = `${PDFJS_CDN_BASE}/pdf.worker.min.js`;
const PDF_JS_URL = `${PDFJS_CDN_BASE}/pdf.min.js`;

/**
 * Carga PDF.js desde CDN para evitar problemas de compatibilidad
 * @returns {Promise<any>} - Instancia de PDF.js cargada desde CDN
 */
const loadPdfJsFromCDN = async () => {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if (window.pdfjsLib) {
      console.log('PDF.js ya está cargado en la página');
      
      // Asegurar que el worker está configurado
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      }
      
      return resolve(window.pdfjsLib);
    }
    
    // Cargar script
    console.log('Cargando PDF.js desde CDN...');
    const script = document.createElement('script');
    script.src = PDF_JS_URL;
    script.async = true;
    
    script.onload = () => {
      console.log('PDF.js cargado correctamente');
      
      // Configurar worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      resolve(window.pdfjsLib);
    };
    
    script.onerror = () => {
      reject(new Error('No se pudo cargar PDF.js desde CDN'));
    };
    
    document.body.appendChild(script);
  });
};

/**
 * Convierte un archivo PDF a un array de imágenes
 * @param {File} pdfFile - Archivo PDF a convertir
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<Array<File>>} - Array de archivos de imagen
 */
export const convertPdfToImagesInBrowser = async (pdfFile, progressCallback = () => {}) => {
  try {
    progressCallback('Iniciando conversión de PDF a imágenes con método de navegador...');
    
    // 1. Cargar PDF.js desde CDN para evitar problemas de versión
    const pdfjsLib = await loadPdfJsFromCDN();
    progressCallback('PDF.js cargado desde CDN correctamente');
    
    // 2. Leer el PDF como ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    progressCallback('Archivo PDF leído correctamente');
    
    // 3. Cargar el documento PDF
    const pdfDoc = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const numPages = pdfDoc.numPages;
    progressCallback(`PDF cargado: ${numPages} páginas detectadas`);
    
    // 4. Array para almacenar las imágenes resultantes
    const imageFiles = [];
    
    // 5. Procesar cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      progressCallback(`Procesando página ${pageNum} de ${numPages}...`);
      
      try {
        // Obtener la página
        const page = await pdfDoc.getPage(pageNum);
        
        // Configurar escala para mejor calidad
        const scale = 1.5;
        const viewport = page.getViewport({scale});
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar página en canvas
        await page.render({
          canvasContext: context,
          viewport
        }).promise;
        
        // Convertir canvas a blob de imagen JPEG
        const imageBlob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/jpeg', 0.8);
        });
        
        // Crear archivo a partir del blob
        const imageFile = new File(
          [imageBlob], 
          `pagina_${pageNum}.jpg`, 
          {type: 'image/jpeg'}
        );
        
        // Reportar tamaño
        const fileSizeMB = (imageFile.size / (1024 * 1024)).toFixed(2);
        progressCallback(`Página ${pageNum} convertida a imagen (${fileSizeMB}MB)`);
        
        // Añadir al array
        imageFiles.push(imageFile);
        
      } catch (pageError) {
        progressCallback(`Error al convertir página ${pageNum}: ${pageError.message}`);
      }
    }
    
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
 * @returns {Promise<File>} Archivo comprimido 
 */
export const compressImageInBrowser = async (imageFile, progressCallback = () => {}, options = {}) => {
  const defaultOptions = {
    quality: 0.7,
    maxWidth: 1200,
    maxHeight: 1800,
    ...options
  };
  
  progressCallback(`Comprimiendo imagen ${imageFile.name}...`);
  
  return new Promise((resolve, reject) => {
    // Crear una imagen para cargar el archivo
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);
    
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
            URL.revokeObjectURL(objectUrl);
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
        URL.revokeObjectURL(objectUrl);
        reject(e);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Error al cargar imagen para compresión'));
    };
    
    img.src = objectUrl;
  });
};
