# 🎮 Juego 3D Multinivel con Persecución de Enemigos

<div align="center">

![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Cannon.js](https://img.shields.io/badge/Cannon.js-FF6B6B?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**Un videojuego 3D inmersivo desarrollado con Three.js y React**

*Proyecto Final - Programación Orientada a Entornos Multimediales*

**Noviembre 2025**

</div>

---

## 📋 Descripción del Proyecto

Este proyecto es un **videojuego 3D multinivel** desarrollado como trabajo final para la materia de **Programación Orientada a Entornos Multimediales**. El juego combina gráficos 3D interactivos, física realista, sistemas de juego complejos y una experiencia de usuario inmersiva.

El jugador controla un personaje en tercera persona que debe recolectar quesos mientras evita a los enemigos que lo persiguen. El juego cuenta con **3 niveles progresivos**, cada uno con desafíos únicos, edificios diferentes y mayor dificultad.

### 🎯 Características Principales

- **Mundo 3D inmersivo** con gráficos renderizados en tiempo real
- **Sistema de física realista** utilizando Cannon.js para colisiones y movimientos
- **3 niveles progresivos** con entornos y edificios únicos
- **Sistema de recolección** de quesos (10 por nivel)
- **Enemigos inteligentes** que persiguen al jugador
- **Sistema de portal** para avanzar entre niveles
- **Partículas visuales** que guían al jugador hacia los objetivos
- **Sistema de autenticación** de usuarios
- **Controles responsive** para teclado y dispositivos móviles
- **Sonidos ambientales** y efectos de audio
- **Interfaz de usuario** intuitiva con HUD informativo

---

## 🎮 Funcionalidades

### Sistema de Niveles

El juego cuenta con **3 niveles progresivos**, cada uno con características únicas:

#### 🏙️ Nivel 1: Ciudad Toy Car
- Entorno urbano con edificios de juguete
- 1 enemigo persiguiendo al jugador
- Vía/calle que conecta los edificios
- 10 quesos para recolectar

#### 🏛️ Nivel 2: Mundo Antiguo
- Edificios de estilo antiguo y desértico
- 3 enemigos persiguiendo al jugador
- Generación procedural de edificios
- 10 quesos para recolectar

#### 🏘️ Nivel 3: Casas Pokémon
- Casas temáticas de Pokémon
- 5 enemigos persiguiendo al jugador
- Edificios con rotación aleatoria
- 10 quesos para recolectar

### Mecánicas de Juego

#### 🧀 Sistema de Recolección
- El jugador debe recolectar **10 quesos** en cada nivel
- Partículas visuales guían al jugador hacia los quesos
- Contador en tiempo real muestra el progreso
- Los quesos se generan dinámicamente en posiciones válidas

#### 👾 Sistema de Enemigos
- Los enemigos persiguen al jugador desde **100 metros de distancia**
- Velocidad más lenta que el jugador (permitiendo escape)
- Detección de colisiones en tiempo real
- Si un enemigo toca al jugador, el juego termina

#### 🌀 Sistema de Portal
- Al recolectar todos los quesos, aparece un portal en el punto de spawn
- El portal tiene efectos visuales místicos y partículas
- Permite avanzar al siguiente nivel
- Teletransportación automática al completar un nivel

#### 🎨 Efectos Visuales
- Partículas que guían al jugador hacia los quesos
- Efectos de portal con partículas y luces
- Sombras dinámicas en objetos y personajes
- Iluminación ambiental realista

#### 🔊 Sistema de Audio
- Música ambiental que se reproduce durante el juego
- Efectos de sonido para acciones (recolectar quesos, game over)
- Control de audio desde el menú circular

#### 🎮 Controles
- **Teclado**: Flechas o WASD para movimiento
- **Mouse**: Control de cámara con movimiento del mouse
- **Móvil**: Controles táctiles adaptativos
- **Menú circular**: Acceso a configuraciones y opciones

---

## 🚀 Instalación y Despliegue

### Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **npm** (viene con Node.js) o **yarn**
- **Git** (para clonar el repositorio)

### Pasos de Instalación

#### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/game-project.git
cd game-project
```

#### 2. Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las dependencias necesarias, incluyendo:
- React y React DOM
- Three.js (para gráficos 3D)
- Cannon.js (para física)
- Vite (para el desarrollo y build)
- Otras dependencias necesarias

#### 3. Ejecutar el Proyecto en Modo Desarrollo

```bash
npm run dev
```

El proyecto se ejecutará en `http://localhost:5173` (o el puerto que Vite asigne).

#### 4. Compilar para Producción

```bash
npm run build
```

Este comando generará una carpeta `dist` con los archivos optimizados para producción.

#### 5. Preview de Producción

```bash
npm run preview
```

Este comando permite previsualizar la versión de producción localmente.

### 🐳 Despliegue

#### Opción 1: Despliegue en Vercel

1. Instala Vercel CLI:
```bash
npm i -g vercel
```

2. Despliega el proyecto:
```bash
vercel
```

#### Opción 2: Despliegue en Netlify

1. Conecta tu repositorio a Netlify
2. Configura el build command: `npm run build`
3. Configura el publish directory: `dist`
4. Despliega

#### Opción 3: Despliegue Manual

1. Compila el proyecto:
```bash
npm run build
```

2. Sube la carpeta `dist` a tu servidor web
3. Configura el servidor para servir archivos estáticos

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 19** - Biblioteca de JavaScript para construir interfaces de usuario
- **Three.js 0.175** - Biblioteca de JavaScript para gráficos 3D
- **Cannon.js (cannon-es)** - Motor de física para simulaciones realistas
- **Vite 6** - Herramienta de construcción rápida y moderna

### Librerías Adicionales
- **GSAP** - Animaciones fluidas y profesionales
- **Howler.js** - Gestión de audio y sonidos
- **Socket.io Client** - Comunicación en tiempo real (preparado para multijugador)
- **fflate** - Compresión y descompresión de archivos

### Herramientas de Desarrollo
- **ESLint** - Linter para mantener código limpio
- **lil-gui** - Herramientas de debug y configuración

---

## 📂 Estructura del Proyecto

```
game-project/
├── public/
│   ├── models/              # Modelos 3D (GLB, FBX)
│   │   ├── toycar/         # Edificios del nivel 1
│   │   ├── world 2/        # Edificios del nivel 2
│   │   ├── world 3/        # Edificios del nivel 3
│   │   ├── enemigos/       # Modelos de enemigos
│   │   ├── mouse/          # Personaje principal
│   │   └── cheese/         # Modelos de quesos
│   ├── sounds/             # Archivos de audio
│   └── textures/           # Texturas y mapas de ambiente
├── src/
│   ├── components/         # Componentes React
│   │   ├── Login.jsx      # Sistema de autenticación
│   │   └── LogoutButton.jsx
│   ├── context/           # Context API de React
│   │   └── AuthContext.jsx
│   ├── Experience/        # Núcleo del juego 3D
│   │   ├── Experience.js  # Clase principal (Singleton)
│   │   ├── World/         # Lógica del mundo del juego
│   │   │   ├── World.js   # Gestión principal del mundo
│   │   │   ├── Robot.js   # Personaje principal
│   │   │   ├── Enemy.js   # Sistema de enemigos
│   │   │   ├── Cheese.js  # Sistema de quesos
│   │   │   ├── Portal.js  # Sistema de portal
│   │   │   ├── Floor.js   # Suelo del juego
│   │   │   └── ...
│   │   ├── Camera/        # Sistema de cámaras
│   │   ├── Renderer/      # Renderizado 3D
│   │   ├── Resources/     # Carga de recursos
│   │   └── sources.js     # Definición de recursos
│   ├── loaders/           # Cargadores personalizados
│   │   └── ToyCarLoader.js
│   ├── controls/          # Sistemas de control
│   │   ├── KeyboardControls.js
│   │   └── MobileControls.js
│   ├── network/           # Red y multijugador
│   │   └── SocketManager.js
│   └── App.jsx            # Componente principal
├── package.json
├── vite.config.js
└── README.md
```

---

## 🎓 Conceptos de Programación Aplicados

### Programación Orientada a Objetos (POO)
- **Clases y Herencia**: Estructura modular basada en clases
- **Encapsulación**: Datos y métodos agrupados lógicamente
- **Polimorfismo**: Diferentes tipos de objetos con interfaces comunes
- **Singleton Pattern**: Clase `Experience` como instancia única

### Arquitectura del Proyecto
- **Separación de Responsabilidades**: Cada clase tiene una función específica
- **Modularidad**: Componentes reutilizables y desacoplados
- **Manejo de Estado**: Gestión centralizada del estado del juego
- **Gestión de Recursos**: Carga asíncrona de modelos y texturas

### Optimizaciones
- **Lazy Loading**: Carga de recursos bajo demanda
- **Object Pooling**: Reutilización de objetos (partículas, enemigos)
- **Culling**: Eliminación de objetos fuera de vista
- **Physics Optimization**: Optimización de colisiones y físicas

---

## 🎯 Objetivos del Proyecto

Este proyecto demuestra la aplicación de los siguientes conceptos:

✅ **Gráficos 3D Interactivos**: Uso avanzado de Three.js para crear entornos 3D inmersivos

✅ **Física Realista**: Implementación de física con Cannon.js para colisiones y movimientos

✅ **Sistemas de Juego Complejos**: Mecánicas de juego, niveles, enemigos, recolección

✅ **Programación Orientada a Objetos**: Arquitectura limpia y modular basada en clases

✅ **Gestión de Recursos**: Carga y optimización de modelos 3D, texturas y sonidos

✅ **Interfaz de Usuario**: HUD, menús, autenticación y controles intuitivos

✅ **Optimización de Rendimiento**: Técnicas para mantener altos FPS en entornos 3D

---

## 📸 Características Visuales

- ✨ **Gráficos 3D de alta calidad** con sombras y iluminación realista
- 🎨 **Partículas visuales** que mejoran la experiencia inmersiva
- 🌈 **Efectos de portal** con partículas y luces dinámicas
- 🏗️ **Edificios únicos** por nivel con estilos diferentes
- 🌍 **Mundo abierto** con generación procedural de contenido
- 🎭 **Animaciones fluidas** para personajes y objetos

---

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia el servidor de desarrollo

# Producción
npm run build        # Compila el proyecto para producción
npm run preview      # Previsualiza la versión de producción

# Calidad de Código
npm run lint         # Ejecuta ESLint para verificar el código
```

---

## 📝 Notas de Desarrollo

### Sistema de Niveles
- Cada nivel tiene su propio conjunto de edificios y enemigos
- Los niveles se cargan dinámicamente al completar el anterior
- El sistema de niveles es extensible para agregar más niveles

### Sistema de Enemigos
- Los enemigos persiguen al jugador usando física realista
- La velocidad de los enemigos es menor que la del jugador
- Detección de colisiones precisa usando esferas de colisión

### Sistema de Quesos
- Los quesos se generan dinámicamente en posiciones válidas
- Sistema de raycasting para evitar spawn en edificios
- Partículas guían al jugador hacia los quesos

---

## 👤 Autor

**Julian Bastidas**

- 📧 Email: julian.bastidas@campusucc.edu.co
- 🏫 Universidad: Universidad Cooperativa de Colombia
- 📚 Materia: Programación Orientada a Entornos Multimediales
- 📅 Fecha: Noviembre 2025

---

## 📄 Licencia

Este proyecto es de uso académico y educativo, desarrollado como trabajo final para la materia de **Programación Orientada a Entornos Multimediales**.

---

## 🙏 Agradecimientos

- **Three.js** por la excelente biblioteca de gráficos 3D
- **Cannon.js** por el motor de física
- **React** por el framework de UI
- **Comunidad de desarrollo** por los recursos y tutoriales

---

<div align="center">

**Desarrollado con ❤️ por Julian Bastidas**

*Proyecto Final - Programación Orientada a Entornos Multimediales*

**Noviembre 2025**

</div>
