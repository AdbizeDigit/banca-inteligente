import React, { useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  useTheme, 
  Card, 
  CardContent,
  Divider,
  Avatar,
  Fade,
  CircularProgress,
  Chip
} from '@mui/material';
import { ShowChart, PieChart, BarChart, TrendingUp, AccountBalance } from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';

// Registrar componentes de ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const FinancialCharts = () => {
  const { categories, analyses, selectedFile } = useApp();
  const theme = useTheme();
  
  // Colores para los gráficos con transparencia para efectos visuales
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042',
    '#a4de6c'
  ];
  
  // Versiones con transparencia para efectos de hover y fondos
  const chartColorsWithAlpha = chartColors.map(color => {
    // Extraer componentes RGB del color hexadecimal
    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      // Para colores no hexadecimales (si hubiera)
      return `${color}80`; // Agregar 50% de transparencia
    }
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  });
  
  // Colores para fondos con baja opacidad
  const backgroundColors = chartColors.map(color => {
    let r, g, b;
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return `${color}20`; // Agregar 12% de transparencia
    }
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  });
  
  // Función auxiliar para obtener las categorías del target
  const getTargetCategories = () => {
    let targetCategories = {};
    
    if (selectedFile && categories[selectedFile]) {
      targetCategories = categories[selectedFile];
    } else if (Object.keys(categories).length > 0) {
      // Tomar el primer archivo
      const firstFileId = Object.keys(categories)[0];
      targetCategories = categories[firstFileId];
    }
    
    return targetCategories;
  };

  // Preparar datos para el gráfico de categorías (Pie Chart)
  const categoryChartData = useMemo(() => {
    const targetCategories = getTargetCategories();
    const labels = Object.keys(targetCategories);
    const values = Object.values(targetCategories);
    
    // Ordenar por valor para mejor visualización
    const combinedData = labels.map((label, index) => ({ label, value: values[index] }));
    combinedData.sort((a, b) => b.value - a.value);
    
    const sortedLabels = combinedData.map(item => item.label);
    const sortedValues = combinedData.map(item => item.value);
    
    return {
      labels: sortedLabels,
      datasets: [
        {
          data: sortedValues,
          backgroundColor: chartColorsWithAlpha.slice(0, sortedLabels.length),
          borderColor: chartColors.slice(0, sortedLabels.length),
          borderWidth: 2,
          hoverBackgroundColor: chartColors.slice(0, sortedLabels.length),
          hoverBorderColor: 'white',
          hoverBorderWidth: 2
        }
      ]
    };
  }, [categories, selectedFile, chartColors, chartColorsWithAlpha]);
  
  // Preparar datos para gráfico de barras de gastos por categoría
  const barChartData = useMemo(() => {
    const targetCategories = getTargetCategories();
    
    // Ordenar por valor para mejor visualización
    const combinedData = Object.keys(targetCategories).map(key => ({
      category: key,
      amount: targetCategories[key]
    }));
    combinedData.sort((a, b) => b.amount - a.amount);
    
    return {
      labels: combinedData.map(item => item.category),
      datasets: [
        {
          label: 'Gasto por Categoría',
          data: combinedData.map(item => item.amount),
          backgroundColor: chartColorsWithAlpha,
          borderColor: chartColors,
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: chartColors,
          barPercentage: 0.6,
          categoryPercentage: 0.8
        }
      ]
    };
  }, [categories, selectedFile, chartColors, chartColorsWithAlpha]);
  
  // Preparar datos para gráfico de línea de tendencia (simulados, en un caso real serían calculados)
  const trendChartData = useMemo(() => {
    // Ahora generamos datos más realistas basados en un patrón que muestra
    // fluctuaciones más interesantes
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
    
    // Datos más interesantes simulando un patrón de ingresos y gastos típicos
    const ingresos = [32500, 33200, 30800, 35100, 38500, 37200];
    const gastos = [28700, 31500, 29600, 27800, 34200, 32700];
    
    // Calcular el saldo (diferencia entre ingresos y gastos)
    const saldo = ingresos.map((ingreso, index) => ingreso - gastos[index]);
    
    return {
      labels: months,
      datasets: [
        {
          label: 'Ingresos',
          data: ingresos,
          borderColor: theme.palette.success.main,
          backgroundColor: backgroundColors[2],
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: theme.palette.success.main,
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Gastos',
          data: gastos,
          borderColor: theme.palette.error.main,
          backgroundColor: backgroundColors[3],
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: theme.palette.error.main,
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true
        },
        {
          label: 'Saldo',
          data: saldo,
          borderColor: theme.palette.info.main,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          tension: 0.4,
          fill: false
        }
      ]
    };
  }, [theme.palette, backgroundColors]);
  
  // Opciones para los gráficos
  const pieOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12,
            family: '"Roboto", "Helvetica", "Arial", sans-serif'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        },
        title: {
          display: false
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        bodyFont: {
          size: 13
        },
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            let value = context.raw || 0;
            let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            let percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  }), []);
  
  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        bodyFont: {
          size: 13
        },
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context) {
            let value = context.raw || 0;
            return `$${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1
        },
        ticks: {
          font: {
            size: 12
          },
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    animation: {
      duration: 2000
    }
  }), []);
  
  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        bodyFont: {
          size: 13
        },
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            let value = context.parsed.y || 0;
            return `${label}: $${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    elements: {
      line: {
        tension: 0.4
      }
    },
    animation: {
      duration: 2000
    }
  }), []);
  
  // Si no hay datos, mostrar mensaje
  if (Object.keys(categories).length === 0 || analyses.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Gráficos Financieros
        </Typography>
        <Typography variant="body1" color="textSecondary" align="center" sx={{ my: 4 }}>
          Sube y procesa tus estados bancarios para visualizar gráficos aquí.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <ShowChart />
        </Avatar>
        <Typography variant="h5" gutterBottom sx={{ mb: 0, fontWeight: 600 }}>
          Gráficos Financieros
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.light', mr: 2, width: 36, height: 36 }}>
                    <PieChart fontSize="small" />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Distribución de Gastos</Typography>
                </Box>
                <Chip label="Porcentaje" size="small" color="primary" variant="outlined" sx={{ borderRadius: '8px' }} />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Fade in={true} timeout={1000}>
                <Box sx={{ height: 300 }}>
                  <Pie data={categoryChartData} options={pieOptions} />
                </Box>
              </Fade>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ mb: 3, borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'secondary.light', mr: 2, width: 36, height: 36 }}>
                    <BarChart fontSize="small" />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Gastos por Categoría</Typography>
                </Box>
                <Chip label="Monto" size="small" color="secondary" variant="outlined" sx={{ borderRadius: '8px' }} />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Fade in={true} timeout={1000}>
                <Box sx={{ height: 300 }}>
                  <Bar data={barChartData} options={barOptions} />
                </Box>
              </Fade>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ borderRadius: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'info.light', mr: 2, width: 36, height: 36 }}>
                    <TrendingUp fontSize="small" />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Tendencia de Ingresos y Gastos</Typography>
                </Box>
                <Chip label="Últimos 6 meses" size="small" color="info" variant="outlined" sx={{ borderRadius: '8px' }} />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Fade in={true} timeout={1000}>
                <Box sx={{ height: 350 }}>
                  <Line data={trendChartData} options={lineOptions} />
                </Box>
              </Fade>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FinancialCharts;
