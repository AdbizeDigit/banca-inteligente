/**
 * Biblioteca de normalización de caracteres especiales para estados bancarios
 * Especialmente optimizada para estados HSBC
 */

/**
 * Normaliza caracteres especiales comunes en documentos bancarios de HSBC
 * @param {string} text - Texto extraído del PDF
 * @returns {string} - Texto normalizado
 */
export const normalizeHsbcText = (text) => {
  if (!text) return "";
  
  // Patrones comunes de reemplazo en estados HSBC
  const replacements = [
    // Caracteres específicos de HSBC
    { pattern: /CdENcA/g, replacement: 'CUENTA' },
    { pattern: /CLUz/g, replacement: 'PLUS' },
    { pattern: /BAMBdEb/g, replacement: 'BAMBUES' },
    { pattern: /COMxRAb/g, replacement: 'COMPRAS' },
    { pattern: /ÑARDENEb/g, replacement: 'JARDINES' },
    { pattern: /cABACHENEb/g, replacement: 'TABACHINES' },
    { pattern: /RECdÓAREb/g, replacement: 'REALIZADAS' },
    { pattern: /BdENRObcRO/g, replacement: 'BUENROSTRO' },
    { pattern: /REØdEREDO/g, replacement: 'RESUMEN' },
    { pattern: /2N¦/g, replacement: '2NOW' },
    { pattern: /NþMERO/g, replacement: 'NUMERO' },
    { pattern: /xz/g, replacement: 'PERIODO' },
    { pattern: /Moo/g, replacement: 'Mar' },
    { pattern: /miircoles/g, replacement: 'Miércoles' },
    { pattern: /xEREODO/g, replacement: 'PERIODO' },
    { pattern: /CONiAÓEi/g, replacement: 'GONZALEZ' },
    { pattern: /RECOBERcO/g, replacement: 'RIGOBERTO' },
    { pattern: /HbBC/g, replacement: 'HSBC' },
    { pattern: /iAxOxAN/g, replacement: 'ZAPOPAN' },
    { pattern: /ÑAÓ/g, replacement: 'JAL' },
    { pattern: /ENc/g, replacement: 'INT' },
    { pattern: /EbcE/g, replacement: 'ESTE' },
    { pattern: /ÓOb/g, replacement: 'LOS' },
    { pattern: /bAÓDO/g, replacement: 'SALDO' },
    { pattern: /AbEO@DE/g, replacement: 'PASEO DE' },
    { pattern: /xAbEO/g, replacement: 'PASEO' },
    { pattern: /þÓcEMO/g, replacement: 'ULTIMO' },
    { pattern: /þÓcEMO/g, replacement: 'ULTIMO' },
    { pattern: /DEbCÓObE/g, replacement: 'DESGLOSE' },
    { pattern: /MOeEMEENcOb/g, replacement: 'MOVIMIENTOS' },
    { pattern: /MEbEb/g, replacement: 'MESES' },
    { pattern: /CARCOb/g, replacement: 'CARGOS' },
    { pattern: /ENcEREbEb/g, replacement: 'INTERESES' },
    { pattern: /DEFEREDOb/g, replacement: 'DIFERIDOS' },
    { pattern: /xACARuAb/g, replacement: 'PAGARIAS' },
    { pattern: /cdb/g, replacement: 'TUS' },
    { pattern: /MNO/g, replacement: 'MXN' },
    { pattern: /xADRE/g, replacement: 'PADRE' },
    { pattern: /DEbcREBdCEnN/g, replacement: 'DISTRIBUCION' },

    // Símbolos y formatos monetarios
    { pattern: /xACO/g, replacement: 'PAGO' },
    { pattern: /\]\s*\[/g, replacement: ' ' },
    { pattern: /\]/g, replacement: '' },
    { pattern: /\[/g, replacement: '' },
    { pattern: /`/g, replacement: "'" },
    { pattern: /EoL@/g, replacement: 'TOTAL' },
    { pattern: /@/g, replacement: ' ' },
    { pattern: /¤/g, replacement: '-' },
    { pattern: /©/g, replacement: '(' },
    { pattern: /Î/g, replacement: ')' },
    { pattern: /¨/g, replacement: '$' },
    { pattern: /q/g, replacement: '9' },
    { pattern: /Ø/g, replacement: 'O' },
    { pattern: /k/g, replacement: '.' },
    { pattern: /E¤/g, replacement: 'Edo' },
    { pattern: /Uo/g, replacement: 'No' },
    { pattern: /xA/g, replacement: 'PA' },
    { pattern: /cx/g, replacement: 'TP' },
    { pattern: /MENbAÑEb/g, replacement: 'MENSAJES' },
    { pattern: /EMxORcANcEb/g, replacement: 'IMPORTANTES' },
    { pattern: /xRO/g, replacement: 'PRO' },

    // Formatos y abreviaturas comunes
    { pattern: /No\./gi, replacement: 'Número' },
    { pattern: /Num\./gi, replacement: 'Número' },
    { pattern: /Ref\./gi, replacement: 'Referencia' },
    { pattern: /BENEFECEOb/g, replacement: 'BENEFICIOS' },
    { pattern: /ENDECADOREb/g, replacement: 'INDICADORES' },
    { pattern: /CObcO/g, replacement: 'COSTO' },
    { pattern: /cARÑEcA/g, replacement: 'TARJETA' },

    // Corrección de formatos numéricos
    { pattern: /(\d) (\d)/g, replacement: '$1$2' },
    { pattern: /(\d),(\d{3})/g, replacement: '$1$2' },
    { pattern: /\[([-\d.,]+)\]/g, replacement: '-$1' },
  ];
  
  // Aplicar todas las sustituciones
  let normalized = text;
  for (const { pattern, replacement } of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
};

/**
 * Detecta el banco emisor basado en patrones de texto
 * @param {string} text - Texto del estado de cuenta
 * @returns {string} - Nombre del banco o "Desconocido"
 */
export const detectBankType = (text) => {
  const textUpper = text.toUpperCase();
  
  if (textUpper.includes('HSBC') || textUpper.includes('2NOW')) {
    return 'HSBC';
  } 
  else if (textUpper.includes('BBVA') || textUpper.includes('BANCOMER')) {
    return 'BBVA';
  }
  else if (textUpper.includes('SANTANDER')) {
    return 'SANTANDER';
  }
  else if (textUpper.includes('BANORTE')) {
    return 'BANORTE';
  }
  else if (textUpper.includes('BANAMEX') || textUpper.includes('CITIBANAMEX')) {
    return 'CITIBANAMEX';
  }
  
  return 'Desconocido';
};

/**
 * Normaliza el texto basado en el banco detectado
 * @param {string} text - Texto extraído
 * @returns {string} - Texto normalizado específico para el banco
 */
export const smartBankNormalization = (text) => {
  const bankType = detectBankType(text);
  
  switch (bankType) {
    case 'HSBC':
      return normalizeHsbcText(text);
    // Se pueden añadir más bancos en el futuro
    default:
      // Normalización genérica para otros bancos
      return text
        .replace(/No\./gi, 'Número')
        .replace(/Num\./gi, 'Número')
        .replace(/Ref\./gi, 'Referencia')
        .replace(/(\d) (\d)/g, '$1$2')
        .replace(/(\d),(\d{3})/g, '$1$2');
  }
};
