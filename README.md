# Banca Inteligente - Análisis de Estados Bancarios con IA local

Banca Inteligente es una aplicación web React que permite a los usuarios subir PDFs de resúmenes bancarios para analizarlos de forma local y privada mediante inteligencia artificial. La aplicación utiliza OpenRouter y el modelo Llama 4 Scout para procesar y extraer información valiosa de los estados bancarios sin enviar datos personales a servidores externos.

## Características Principales

- **Subida y Procesamiento Local de PDFs**: Sube tus estados bancarios y procésalos directamente en tu navegador
- **Análisis IA**: Utiliza OpenRouter con Llama 4 Scout para analizar el contenido de tus estados bancarios
- **Privacidad de Datos**: Redacción automática de información sensible antes de procesar con IA
- **Categorización de Gastos**: Visualiza tus gastos organizados por categorías
- **Gráficos Interactivos**: Gráficos de barras, pastel y líneas para visualizar tus finanzas
- **Asistente Virtual**: Chatbot especializado en finanzas personales que puede responder preguntas sobre tus datos
- **Recomendaciones Financieras**: Recibe consejos personalizados basados en tus patrones de gasto
- **Almacenamiento Local**: Todos los datos se guardan únicamente en tu navegador

## Tecnologías Utilizadas

- **React**: Framework frontend
- **Material UI**: Componentes UI modernos
- **PDF.js**: Procesamiento de PDFs en el navegador
- **Chart.js**: Visualización de datos
- **OpenRouter API**: Acceso al modelo Llama 4 Scout para análisis de IA
- **LocalStorage**: Almacenamiento de datos en el navegador

## Comenzando

### Requisitos Previos

- Node.js (v14 o superior)
- npm o yarn

### Instalación

1. Clona este repositorio o descárgalo
2. Instala las dependencias:

```bash
npm install
```

3. Inicia la aplicación en modo desarrollo:

```bash
npm start
```

4. Abre [http://localhost:3000](http://localhost:3000) para verla en tu navegador

## Configuración para Producción

Para construir la aplicación para producción:

```bash
npm run build
```

## Privacidad y Seguridad

Esta aplicación está diseñada con la privacidad como prioridad:

- El procesamiento de PDFs ocurre completamente en el navegador
- La información sensible (números de cuenta, tarjetas, nombres completos) es sanitizada antes de enviar el texto a la API de IA
- No se almacenan datos en servidores externos
- Todos los análisis y datos se guardan localmente en el navegador del usuario

## Notas Importantes

- Para usar la aplicación, necesitarás tu propia clave API de OpenRouter
- La aplicación está diseñada para uso personal y local

## Licencia

MIT
