# 📸 Texturas para Carteles

Este directorio contiene las texturas utilizadas para los carteles del juego.

## 📋 Estructura de Texturas

El sistema de carteles está configurado para usar **12 texturas diferentes** (4 por nivel × 3 niveles):

### Nivel 1:
- `ima1.jpg` - Cartel 1 del nivel 1
- `ima2.jpg` - Cartel 2 del nivel 1
- `ima3.jpg` - Cartel 3 del nivel 1
- `ima4.jpg` - Cartel 4 del nivel 1

### Nivel 2:
- `ima5.jpg` - Cartel 1 del nivel 2
- `ima6.jpg` - Cartel 2 del nivel 2
- `ima7.jpg` - Cartel 3 del nivel 2
- `ima8.jpg` - Cartel 4 del nivel 2

### Nivel 3:
- `ima9.jpg` - Cartel 1 del nivel 3
- `ima10.jpg` - Cartel 2 del nivel 3
- `ima11.jpg` - Cartel 3 del nivel 3
- `ima12.jpg` - Cartel 4 del nivel 3

## 🔄 Sistema de Fallback

Si una textura no existe, el sistema automáticamente usará `ima1.jpg` como fallback.

## 📝 Notas

- Las texturas deben ser imágenes JPG
- Se recomienda un tamaño de 1024x1024 o 2048x2048 píxeles
- Las imágenes deben estar relacionadas con el juego o temática del nivel
- El sistema distribuye automáticamente las texturas entre los carteles de cada nivel

## ✅ Estado Actual

- ✅ `ima1.jpg` - Disponible
- ⚠️ `ima2.jpg` hasta `ima12.jpg` - Pendientes (se usará `ima1.jpg` como fallback)

