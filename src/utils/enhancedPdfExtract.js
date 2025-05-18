/**
 * Extracción mejorada de texto de PDFs bancarios
 * Optimizado para estados de cuenta HSBC
 */

// Importar el cargador de PDF worker local
import { getDocumentInstance } from './pdfWorkerLoader';

/**
 * Extrae texto de un PDF de forma mejorada con opciones para preservar formato
 * @param {File} pdfFile - Archivo PDF
 * @param {Function} progressCallback - Función para reportar progreso
 * @returns {Promise<string>} - Texto extraído
 */
export async function enhancedExtractTextFromPDF(pdfFile, progressCallback = () => {}) {
  try {
    progressCallback('Preparando para extraer texto del PDF...');
    
    // Leer el archivo PDF como ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Cargar el documento usando nuestro loader local (sin depender de CDN)
    progressCallback('Cargando documento PDF...');
    const pdf = await getDocumentInstance(arrayBuffer);
    progressCallback(`Documento cargado. Procesando ${pdf.numPages} páginas...`);
    
    // Configuración para extracción mejorada de texto
    const EXTRACTION_MODE = 0; // TextItem por TextItem (mejor preservación de formato)
    
    let fullText = '';
    
    // Procesar todas las páginas
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      progressCallback(`Extrayendo texto de la página ${pageNum} de ${pdf.numPages}...`);
      
      try {
        // Obtener la página
        const page = await pdf.getPage(pageNum);
        
        // Obtener contenido de texto con opciones avanzadas
        const textContent = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
          includeMarkedContent: true
        });
        
        // Procesar y formatear texto preservando estructuras importantes
        let pageText = processTextContent(textContent, page.view);
        
        // Añadir separador de página
        if (pageNum > 1) {
          fullText += '\\n--- Página ' + pageNum + ' ---\\n';
        }
        
        fullText += pageText + '\\n';
      } catch (pageError) {
        console.error(`Error procesando página ${pageNum}:`, pageError);
        progressCallback(`Advertencia: Problemas al procesar la página ${pageNum}`);
        // Continuar con la siguiente página
      }
    }
    
    progressCallback('Extracción de texto completada. Aplicando mejoras adicionales...');
    
    // Aplicar mejoras adicionales al texto
    return enhanceExtractedText(fullText);
  } catch (error) {
    console.error('Error en extracción de PDF:', error);
    progressCallback(`Error en extracción de texto: ${error.message}`);
    throw error;
  }
}

/**
 * Procesa el contenido de texto extraído preservando formato importante
 * @param {Object} textContent - Contenido de texto de PDF.js
 * @param {Array} pageView - Dimensiones de la página
 * @returns {string} - Texto formateado
 */
function processTextContent(textContent, pageView) {
  if (!textContent.items || textContent.items.length === 0) {
    return '';
  }
  
  // Organizar elementos por filas basado en posiciones verticales
  const rows = organizeIntoRows(textContent.items, pageView);
  
  // Convertir filas a texto preservando formato
  return rows.map(row => {
    // Ordenar elementos en la fila de izquierda a derecha
    row.sort((a, b) => a.transform[4] - b.transform[4]);
    
    // Unir texto con espacios proporcionales basados en posición real
    let rowText = '';
    let lastEndX = 0;
    
    row.forEach(item => {
      const itemStartX = item.transform[4];
      
      // Añadir espacios basados en la distancia horizontal
      if (lastEndX > 0) {
        const spacesNeeded = Math.round((itemStartX - lastEndX) / 4);
        if (spacesNeeded > 0) {
          rowText += ' '.repeat(Math.min(spacesNeeded, 10)); // Limitar a 10 espacios max
        }
      }
      
      rowText += item.str;
      lastEndX = itemStartX + (item.width || 0);
    });
    
    return rowText;
  }).join('\\n');
}

/**
 * Organiza elementos de texto en filas basado en posiciones verticales
 * Importante para preservar formato tabular en estados bancarios
 */
function organizeIntoRows(textItems, pageView) {
  const pageHeight = pageView[3]; // Altura de la página
  const rows = [];
  const rowTolerance = 3; // Tolerancia para agrupar elementos en la misma fila (en puntos)
  
  // Ordenar elementos por posición vertical (de arriba a abajo)
  const sortedItems = [...textItems].sort((a, b) => {
    return (pageHeight - b.transform[5]) - (pageHeight - a.transform[5]);
  });
  
  // Agrupar elementos en filas basado en posición Y
  sortedItems.forEach(item => {
    const y = pageHeight - item.transform[5]; // Convertir a coordenada Y creciente
    
    // Buscar una fila existente donde este elemento encaje
    let rowFound = false;
    for (const row of rows) {
      if (row.length > 0) {
        const rowY = pageHeight - row[0].transform[5];
        if (Math.abs(rowY - y) <= rowTolerance) {
          row.push(item);
          rowFound = true;
          break;
        }
      }
    }
    
    // Si no se encontró una fila adecuada, crear una nueva
    if (!rowFound) {
      rows.push([item]);
    }
  });
  
  return rows;
}

/**
 * Aplica mejoras específicas para documentos bancarios al texto extraído
 * @param {string} text - Texto extraído del PDF
 * @returns {string} - Texto mejorado
 */
function enhanceExtractedText(text) {
  if (!text) return '';
  
  // Corrección de caracteres especiales comunes en estados HSBC
  return text
    // Corregir espacios y saltos de línea
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\\n')
    
    // Normalizar separadores de miles y decimales
    .replace(/(\d)\s+(\d{3}([.,]\d{2})?)/g, '$1$2')
    .replace(/(\d),(\d{3}([.,]\d{2})?)/g, '$1$2')
    
    // Restaurar formato de montos
    .replace(/(\d)(\d{3})([.,]\d{2})/g, '$1,$2$3')
    
    // Corrección de patrones HSBC
    .replace(/N\s?[Oo0]\s?\./g, 'Número ')
    .replace(/No\s?\./g, 'Número ')
    .replace(/C\s?U\s?E\s?N\s?T\s?A/gi, 'CUENTA')
    .replace(/T\s?A\s?R\s?J\s?E\s?T\s?A/gi, 'TARJETA')
    .replace(/S\s?A\s?L\s?D\s?O/gi, 'SALDO')
    .replace(/C\s?A\s?R\s?G\s?O\s?S?/gi, 'CARGOS')
    .replace(/P\s?A\s?G\s?O\s?S?/gi, 'PAGOS')
    .replace(/H\s?S\s?B\s?C/g, 'HSBC')
    .replace(/2\s?N\s?[Oo0]\s?[Ww]/g, '2NOW')
    .replace(/R\s?I\s?G\s?O\s?B\s?E\s?R\s?T\s?O/g, 'RIGOBERTO')
    .replace(/B\s?U\s?E\s?N\s?R\s?O\s?S\s?T\s?R\s?O/g, 'BUENROSTRO')
    .replace(/B\s?A\s?M\s?B\s?U\s?E\s?S/g, 'BAMBUES')
    .replace(/P\s?A\s?S\s?E\s?O/g, 'PASEO')
    
    // Palabras específicas de estados bancarios
    .replace(/D\s?E\s?P\s?O\s?S\s?I\s?T\s?O/gi, 'DEPÓSITO')
    .replace(/R\s?E\s?T\s?I\s?R\s?O/gi, 'RETIRO')
    .replace(/F\s?E\s?C\s?H\s?A/gi, 'FECHA')
    .replace(/T\s?R\s?A\s?N\s?S\s?F\s?E\s?R\s?E\s?N\s?C\s?I\s?A/gi, 'TRANSFERENCIA')
    .replace(/I\s?N\s?T\s?E\s?R\s?E\s?S\s?E\s?S/gi, 'INTERESES')
    
    // Eliminar caracteres extraños
    .replace(/[^\w\s.,;:$%()=+\-/*"'´_[\]{}áéíóúüñÁÉÍÓÚÜÑ\n]/g, ' ')
    
    // Compactar espacios, pero preservar saltos de línea
    .replace(/ +/g, ' ')
    .replace(/\n /g, '\\n')
    .replace(/ \n/g, '\\n')
    .trim();
}

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
