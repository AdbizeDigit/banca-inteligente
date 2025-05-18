/**
 * Configuración para cargar el PDF.js worker desde un CDN
 * Esto asegura la compatibilidad entre versiones del API y el worker
 */

// Importamos el módulo completo de PDF.js
import * as pdfjs from 'pdfjs-dist';

// Función para inicializar el worker de PDF.js
export function initPdfWorker() {
  // Obtener la versión instalada de PDF.js
  const pdfjsVersion = '2.16.105';  // Usar una versión específica que sabemos funciona
  console.log(`Configurando PDF.js worker versión: ${pdfjsVersion}`);
  
  // Configurar la ruta del worker desde un CDN
  const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  
  console.log(`Worker configurado: ${workerSrc}`);
  return true;
}

// Exportamos una función para obtener una instancia de documento PDF
export async function getDocumentInstance(arrayBuffer) {
  // Asegurarnos que el worker está inicializado
  initPdfWorker();
  
  // Crear una instancia del documento
  return pdfjs.getDocument({
    data: arrayBuffer,
    // Opciones para maximizar la calidad de extracción de texto
    disableFontFace: true,
    nativeImageDecoderSupport: 'none',
    ignoreErrors: true
  }).promise;
}
