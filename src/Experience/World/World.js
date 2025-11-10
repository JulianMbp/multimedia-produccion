
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import MobileControls from '../../controls/MobileControls.js'
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import AmbientSound from './AmbientSound.js'
import Cheese from './Cheese.js'
import CheeseParticles from './CheeseParticles.js'
import Enemy from './Enemy.js'
import Environment from './Environment.js'
import Floor from './Floor.js'
import Fox from './Fox.js'
import Portal from './Portal.js'
import Road from './Road.js'
import Robot from './Robot.js'
import Sound from './Sound.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'


export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Sonidos
        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')

        this.allowPrizePickup = false
        this.hasMoved = false

        // Sistema de quesos
        this.cheeses = []
        this.maxCheeses = 10 // 10 quesos por nivel
        this.cheesesCollected = 0
        this.cheeseModel = null
        this.cheeseParticles = null
        this.portal = null
        this.spawnPosition = new THREE.Vector3(0, 0, 0) // Posición inicial del spawn
        
        // Sistema de niveles
        this.currentLevel = 1
        this.level2Buildings = [] // Array para guardar los edificios del nivel 2
        this.level3Buildings = [] // Array para guardar los edificios del nivel 3
        
        // Sistema de enemigos
        this.enemies = [] // Array para guardar los enemigos
        this.enemyModels = [] // Array con los recursos de modelos de enemigos disponibles
        this.gameOver = false // Flag para controlar si el juego ha terminado

        // Permitimos recoger premios tras 2s
        setTimeout(() => {
            this.allowPrizePickup = true
            console.log('✅ Ahora se pueden recoger premios')
        }, 2000)

        // Cuando todo esté cargado...
        this.resources.on('ready', async () => {
            // 1️⃣ Mundo base
            this.floor = new Floor(this.experience)
            this.environment = new Environment(this.experience)

            this.loader = new ToyCarLoader(this.experience)
            await this.loader.loadFromAPI()
            
            // 🛣️ Crear vía después de cargar los edificios (solo en nivel 1)
            if (this.currentLevel === 1) {
                const buildingPositions = this.loader.getBuildingPositions?.() || []
                console.log(`🛣️ Creando vía con ${buildingPositions.length} posiciones de edificios`)
                if (buildingPositions.length > 0) {
                    this.road = new Road(this.experience, buildingPositions)
                } else {
                    console.warn('⚠️ No se encontraron posiciones de edificios para crear la vía')
                }
            }

            // 2️⃣ Personajes
            this.fox = new Fox(this.experience)
            this.robot = new Robot(this.experience)

            // Guardar posición inicial del spawn (donde aparece el robot)
            if (this.robot && this.robot.body) {
                this.spawnPosition.set(
                    this.robot.body.position.x,
                    this.robot.body.position.y,
                    this.robot.body.position.z
                )
            }
            
            // 🧀 Inicializar sistema de quesos
            this.cheeseModel = this.resources.items.cheeseModel
            if (this.cheeseModel) {
                // Generar el primer queso después de un pequeño delay
                setTimeout(() => {
                    this.generateCheese()
                }, 1000)
            } else {
                console.warn('⚠️ Modelo de queso no encontrado')
            }
            
            // Crear contador de quesos en el HUD
            this.createCheeseCounter()
            
            // 👾 Inicializar sistema de enemigos
            this.initializeEnemies()

            this.experience.tracker.showCancelButton()
            //Registrando experiencia VR con el robot
            this.experience.vr.bindCharacter(this.robot)
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            // 3️⃣ Cámara
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            // 4️⃣ Controles móviles (tras crear robot)
            this.mobileControls = new MobileControls({
                onUp: (pressed) => { this.experience.keyboard.keys.up = pressed },
                onDown: (pressed) => { this.experience.keyboard.keys.down = pressed },
                onLeft: (pressed) => { this.experience.keyboard.keys.left = pressed },
                onRight: (pressed) => { this.experience.keyboard.keys.right = pressed }
            })


        })

    }

    toggleAudio() {
        this.ambientSound.toggle()
    }

    update(delta) {
        // Si el juego ha terminado, no actualizar nada
        if (this.gameOver) {
            return
        }
        
        // Actualiza personajes y cámara
        this.fox?.update()
        this.robot?.update()

        if (this.thirdPersonCamera && this.experience.isThirdPerson && !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        // Gira premios
        this.loader?.prizes?.forEach(p => p.update(delta))
        
        // Actualiza quesos
        this.cheeses?.forEach(c => c.update(delta))
        
        // Actualizar enemigos
        if (this.enemies && this.enemies.length > 0 && this.robot) {
            this.enemies.forEach(enemy => {
                if (enemy) {
                    enemy.setTarget(this.robot)
                    enemy.update()
                    
                    // Verificar colisión con el jugador
                    if (enemy.checkCollisionWithTarget()) {
                        this.onEnemyCollision()
                    }
                }
            })
        }
        
        // Actualizar partículas del queso
        if (this.cheeseParticles && this.robot && this.cheeses.length > 0) {
            const robotPos = this.robot.body.position
            this.cheeseParticles.update(robotPos)
        }
        
        // Actualizar portal
        if (this.portal) {
            this.portal.update(delta)
        }


        // Lógica de recogida
        if (!this.allowPrizePickup || !this.loader || !this.robot) return

        const pos = this.robot.body.position
        const speed = this.robot.body.velocity.length()
        const moved = speed > 0.5

        this.loader.prizes.forEach((prize, idx) => {
            if (prize.collected || !prize.pivot) return

            const dist = prize.pivot.position.distanceTo(pos)
            if (dist < 1.2 && moved) {
                prize.collect()
                this.loader.prizes.splice(idx, 1)

                // ✅ Incrementar puntos
                this.points = (this.points || 0) + 1
                this.robot.points = this.points

                // 🧹 Limpiar obstáculos
                if (this.experience.raycaster?.removeRandomObstacles) {
                    const reduction = 0.2 + Math.random() * 0.1
                    this.experience.raycaster.removeRandomObstacles(reduction)
                }

                this.coinSound.play()
                this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`)
                console.log(`🟡 Premio recogido. Total: ${this.points}`)
            }
        })

        // 🧀 Lógica de recogida de quesos
        if (this.allowPrizePickup && this.robot && this.cheeses) {
            const robotPos = this.robot.body.position
            const speed = this.robot.body.velocity.length()
            const moved = speed > 0.5

            this.cheeses.forEach((cheese, idx) => {
                if (cheese.collected || !cheese.pivot) return

                const dist = cheese.pivot.position.distanceTo(robotPos)
                if (dist < 1.2 && moved) {
                    cheese.collect()
                    this.cheeses.splice(idx, 1)
                    this.cheesesCollected++
                    
                    // Actualizar contador
                    this.updateCheeseCounter()
                    
                    // Remover partículas del queso recogido
                    if (this.cheeseParticles) {
                        this.cheeseParticles.remove()
                        this.cheeseParticles = null
                    }
                    
                    // Mostrar notificación temporal
                    this.showCheeseNotification()
                    
                    console.log(`🧀 Queso recogido. Total: ${this.cheesesCollected}/${this.maxCheeses}`)
                    
                    // Verificar si se completaron todos los quesos
                    if (this.cheesesCollected >= this.maxCheeses) {
                        if (this.currentLevel === 1) {
                            // Nivel 1 completado - teletransportar al nivel 2
                            this.startLevel2()
                        } else if (this.currentLevel === 2) {
                            // Nivel 2 completado - teletransportar al nivel 3
                            this.startLevel3()
                        } else if (this.currentLevel === 3) {
                            // Nivel 3 completado - mostrar portal
                            this.onAllCheesesCollected()
                        }
                    } else {
                        // Generar un nuevo queso si no hemos alcanzado el máximo
                        setTimeout(() => {
                            this.generateCheese()
                        }, 500)
                    }
                }
            })
        }

        // ✅ Evaluar fuera del bucle de premios
        if (this.points === 14 && !this.experience.tracker.finished) {
            const elapsed = this.experience.tracker.stop()
            this.experience.tracker.saveTime(elapsed)
            this.experience.tracker.showEndGameModal(elapsed)

            this.experience.obstacleWavesDisabled = true
            clearTimeout(this.experience.obstacleWaveTimeout)
            this.experience.raycaster?.removeAllObstacles()
            this.winner.play()
        }

    }

    generateCheese() {
        if (!this.cheeseModel || !this.robot || this.cheeses.length >= this.maxCheeses) {
            return
        }
        
        // Obtener posición del robot
        const robotPos = this.robot.body.position
        
        // Intentar generar un queso en una posición válida
        let attempts = 0
        const maxAttempts = 50
        
        while (attempts < maxAttempts) {
            // Generar posición aleatoria alrededor del robot (radio de 100 metros)
            const angle = Math.random() * Math.PI * 2
            const distance = 80 + Math.random() * 20 // Entre 80 y 100 metros del robot
            const x = robotPos.x + Math.cos(angle) * distance
            const z = robotPos.z + Math.sin(angle) * distance
            const y = 0.3 // Ligeramente sobre el suelo
            
            // Verificar que no esté encima de un edificio
            // Usar raycaster desde arriba hacia abajo para detectar edificios
            const raycaster = new THREE.Raycaster()
            const fromAbove = new THREE.Vector3(x, 50, z) // Desde arriba
            const direction = new THREE.Vector3(0, -1, 0) // Hacia abajo
            raycaster.set(fromAbove, direction)
            
            // Obtener todos los meshes de edificios de la escena
            const buildingMeshes = []
            const excludedParents = new Set()
            
            // Agregar padres a excluir
            if (this.robot?.group) excludedParents.add(this.robot.group)
            if (this.robot?.model) excludedParents.add(this.robot.model)
            if (this.fox?.model) excludedParents.add(this.fox.model)
            if (this.portal?.group) excludedParents.add(this.portal.group)
            
            // Agregar quesos a excluir
            this.cheeses.forEach(cheese => {
                if (cheese.pivot) excludedParents.add(cheese.pivot)
            })
            
            // Seleccionar edificios según el nivel actual
            if (this.currentLevel === 2) {
                // Solo considerar edificios del nivel 2
                if (this.level2Buildings && this.level2Buildings.length > 0) {
                    this.level2Buildings.forEach(building => {
                        building.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                buildingMeshes.push(child)
                            }
                        })
                    })
                }
            } else if (this.currentLevel === 3) {
                // Solo considerar edificios del nivel 3
                if (this.level3Buildings && this.level3Buildings.length > 0) {
                    this.level3Buildings.forEach(building => {
                        building.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                buildingMeshes.push(child)
                            }
                        })
                    })
                }
            } else if (this.currentLevel === 1) {
                // En el nivel 1, usar los edificios del ToyCarLoader
                // Crear un Set de edificios de otros niveles para verificación rápida
                const otherLevelBuildingSet = new Set()
                
                // Agregar edificios del nivel 2
                if (this.level2Buildings && this.level2Buildings.length > 0) {
                    this.level2Buildings.forEach(building => {
                        otherLevelBuildingSet.add(building)
                        building.traverse((child) => {
                            otherLevelBuildingSet.add(child)
                            if (child.parent) otherLevelBuildingSet.add(child.parent)
                        })
                    })
                }
                
                // Agregar edificios del nivel 3
                if (this.level3Buildings && this.level3Buildings.length > 0) {
                    this.level3Buildings.forEach(building => {
                        otherLevelBuildingSet.add(building)
                        building.traverse((child) => {
                            otherLevelBuildingSet.add(child)
                            if (child.parent) otherLevelBuildingSet.add(child.parent)
                        })
                    })
                }
                
                // Recorrer la escena buscando edificios del nivel 1
                this.scene.traverse((child) => {
                    // Buscar meshes que sean edificios (excluir suelo, vía, robot, zorro, portal, quesos, otros niveles)
                    if (child instanceof THREE.Mesh && 
                        child !== this.floor?.mesh && 
                        child !== this.road?.mesh &&
                        !excludedParents.has(child.parent) &&
                        !excludedParents.has(child.parent?.parent) &&
                        !otherLevelBuildingSet.has(child) &&
                        !otherLevelBuildingSet.has(child.parent)) {
                        buildingMeshes.push(child)
                    }
                })
            }
            
            // Verificar intersecciones con edificios
            const intersects = raycaster.intersectObjects(buildingMeshes, true)
            
            // Si hay intersección con un edificio a una altura mayor a 0.5, no es válido
            let isOnBuilding = false
            if (intersects.length > 0) {
                for (const intersect of intersects) {
                    if (intersect.point.y > 0.5) {
                        isOnBuilding = true
                        break
                    }
                }
            }
            
            if (isOnBuilding) {
                attempts++
                continue
            }
            
            // Verificar que no esté muy cerca de otros quesos
            let tooClose = false
            for (const existingCheese of this.cheeses) {
                if (existingCheese.pivot) {
                    const dist = new THREE.Vector3(x, y, z).distanceTo(existingCheese.pivot.position)
                    if (dist < 1.5) {
                        tooClose = true
                        break
                    }
                }
            }
            
            if (tooClose) {
                attempts++
                continue
            }
            
            // Posición válida, crear el queso
            const cheesePosition = new THREE.Vector3(x, y, z)
            const cheese = new Cheese({
                model: this.cheeseModel.scene,
                position: cheesePosition,
                scene: this.scene
            })
            this.cheeses.push(cheese)
            
            // Crear partículas que guíen al queso
            if (this.cheeseParticles) {
                this.cheeseParticles.remove()
            }
            this.cheeseParticles = new CheeseParticles(this.scene, cheesePosition)
            
            console.log(`🧀 Queso generado en: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`)
            return
        }
        
        console.warn('⚠️ No se pudo generar queso después de múltiples intentos')
    }
    
    createCheeseCounter() {
        this.cheeseCounter = document.createElement('div')
        this.cheeseCounter.id = 'hud-cheese'
        this.updateCheeseCounter()
        Object.assign(this.cheeseCounter.style, {
            position: 'fixed',
            top: '16px',
            left: '20px',
            fontSize: '16px',
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '8px',
            zIndex: 9999,
            fontFamily: 'monospace',
            pointerEvents: 'none'
        })
        document.body.appendChild(this.cheeseCounter)
        
        // Crear botón para saltar al nivel 2 (solo visible en nivel 1)
        this.skipToLevel2Button = document.createElement('button')
        this.skipToLevel2Button.id = 'skip-level2-button'
        this.skipToLevel2Button.innerText = '⏩ Saltar al Nivel 2'
        Object.assign(this.skipToLevel2Button.style, {
            position: 'fixed',
            top: '60px',
            left: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            background: 'rgba(255, 165, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10000,
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.3s ease'
        })
        
        // Efecto hover
        this.skipToLevel2Button.addEventListener('mouseenter', () => {
            this.skipToLevel2Button.style.background = 'rgba(255, 165, 0, 1)'
            this.skipToLevel2Button.style.transform = 'scale(1.05)'
        })
        this.skipToLevel2Button.addEventListener('mouseleave', () => {
            this.skipToLevel2Button.style.background = 'rgba(255, 165, 0, 0.8)'
            this.skipToLevel2Button.style.transform = 'scale(1)'
        })
        
        // Evento click - saltar al siguiente nivel
        this.skipToLevel2Button.addEventListener('click', () => {
            if (this.currentLevel === 1) {
                console.log('⏩ Saltando al nivel 2 desde el botón...')
                this.startLevel2()
            } else if (this.currentLevel === 2) {
                console.log('⏩ Saltando al nivel 3 desde el botón...')
                this.startLevel3()
            }
        })
        
        document.body.appendChild(this.skipToLevel2Button)
        this.updateSkipButtonVisibility()
    }
    
    updateSkipButtonVisibility() {
        // Mostrar el botón en el nivel 1 y 2 (para testing)
        if (this.skipToLevel2Button) {
            if (this.currentLevel === 1) {
                this.skipToLevel2Button.innerText = '⏩ Saltar al Nivel 2'
                this.skipToLevel2Button.style.display = 'block'
            } else if (this.currentLevel === 2) {
                this.skipToLevel2Button.innerText = '⏩ Saltar al Nivel 3'
                this.skipToLevel2Button.style.display = 'block'
            } else {
                this.skipToLevel2Button.style.display = 'none'
            }
        }
    }
    
    updateCheeseCounter() {
        if (this.cheeseCounter) {
            this.cheeseCounter.innerText = `🧀 Nivel ${this.currentLevel} - Quesos: ${this.cheesesCollected}/${this.maxCheeses}`
        }
        // Actualizar visibilidad del botón de saltar
        this.updateSkipButtonVisibility()
    }
    
    showCheeseNotification() {
        // Crear notificación temporal
        const notification = document.createElement('div')
        notification.innerText = '🧀 ¡Queso recogido!'
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 200, 0, 0.9);
            color: #000;
            padding: 20px 40px;
            font-size: 24px;
            font-weight: bold;
            font-family: sans-serif;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            animation: fadeInOut 2s ease-in-out;
        `
        
        // Agregar animación CSS
        if (!document.getElementById('cheese-notification-style')) {
            const style = document.createElement('style')
            style.id = 'cheese-notification-style'
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `
            document.head.appendChild(style)
        }
        
        document.body.appendChild(notification)
        
        // Remover después de 2 segundos
        setTimeout(() => {
            notification.remove()
        }, 2000)
    }
    
    startLevel2() {
        console.log('🚀 Iniciando nivel 2...')
        this.currentLevel = 2
        
        // Ocultar el botón de saltar al nivel 2
        this.updateSkipButtonVisibility()
        
        // Mostrar notificación de teletransporte
        const notification = document.createElement('div')
        notification.innerText = '🌟 ¡Nivel 1 completado!\n🌀 Teletransportando al Nivel 2...'
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 215, 0, 0.9);
            color: #000;
            padding: 30px 50px;
            font-size: 28px;
            font-weight: bold;
            font-family: sans-serif;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            text-align: center;
            white-space: pre-line;
            animation: fadeInOut 3s ease-in-out;
        `
        document.body.appendChild(notification)
        setTimeout(() => {
            notification.remove()
        }, 3000)
        
        // Remover la vía del nivel 1
        if (this.road && this.road.mesh) {
            this.scene.remove(this.road.mesh)
            this.road.mesh.geometry.dispose()
            this.road.mesh.material.dispose()
            if (this.road.texture) {
                this.road.texture.dispose()
            }
            this.road = null
            console.log('🗑️ Vía del nivel 1 removida')
        }
        
        // Remover TODOS los edificios del nivel 1 (toycar)
        if (this.loader && this.loader.clearLevel1Buildings) {
            this.loader.clearLevel1Buildings()
            console.log('🗑️ Todos los edificios del nivel 1 removidos')
        }
        
        // Remover partículas del queso actual
        if (this.cheeseParticles) {
            this.cheeseParticles.remove()
            this.cheeseParticles = null
        }
        
        // Remover quesos del nivel 1
        this.cheeses.forEach(cheese => {
            if (cheese.pivot) {
                cheese.collect()
            }
        })
        this.cheeses = []
        this.cheesesCollected = 0
        this.updateCheeseCounter()
        
        // Limpiar enemigos del nivel 1
        this.clearEnemies()
        
        // Teletransportar al jugador a una posición central del nivel 2
        if (this.robot && this.robot.body) {
            this.robot.body.position.set(0, 1, 0)
            this.robot.body.velocity.set(0, 0, 0)
            this.spawnPosition.set(0, 0, 0)
        }
        
        // Generar edificios del nivel 2
        this.generateLevel2Buildings()
        
        // Regenerar enemigos para el nivel 2
        setTimeout(() => {
            this.generateEnemies()
        }, 1500)
        
        // Generar el primer queso del nivel 2
        setTimeout(() => {
            this.generateCheese()
        }, 2000)
        
        console.log('✅ Nivel 2 iniciado')
    }
    
    generateLevel2Buildings() {
        console.log('🏗️ Iniciando generación de edificios del nivel 2...')
        console.log('🔍 Recursos disponibles:', Object.keys(this.resources.items))
        
        // Lista de modelos del mundo 2 (5 veces cada uno = 40 edificios totales)
        const world2Models = [
            'ancient_building',
            'desert_stone_house',
            'fantasy_house',
            'old_castle',
            'old_castle_1',
            'old_house',
            'old_house_1',
            'stone_building'
        ]
        
        // Verificar qué modelos están disponibles
        const availableModels = []
        const missingModels = []
        world2Models.forEach(modelName => {
            if (this.resources.items[modelName]) {
                availableModels.push(modelName)
                console.log(`✅ Modelo ${modelName} encontrado`)
            } else {
                missingModels.push(modelName)
                console.warn(`❌ Modelo ${modelName} NO encontrado en resources.items`)
            }
        })
        
        if (availableModels.length === 0) {
            console.error('❌ No se encontraron modelos del mundo 2. Verifica que estén cargados en sources.js')
            return
        }
        
        console.log(`📦 Modelos disponibles: ${availableModels.length}/${world2Models.length}`)
        if (missingModels.length > 0) {
            console.warn(`⚠️ Modelos faltantes: ${missingModels.join(', ')}`)
        }
        
        // Crear 15 instancias de cada modelo disponible
        const modelsToGenerate = []
        availableModels.forEach(modelName => {
            for (let i = 0; i < 15; i++) {
                modelsToGenerate.push(modelName)
            }
        })
        
        // Mezclar aleatoriamente
        for (let i = modelsToGenerate.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [modelsToGenerate[i], modelsToGenerate[j]] = [modelsToGenerate[j], modelsToGenerate[i]]
        }
        
        console.log(`🏗️ Generando ${modelsToGenerate.length} edificios del nivel 2 (15 por cada modelo)...`)
        
        // Generar cada edificio en posiciones aleatorias alrededor del personaje
        const robotPos = this.robot?.body?.position || new THREE.Vector3(0, 0, 0)
        const maxRadius = 500 // Radio máximo de 500 metros
        const minRadius = 15 // Radio mínimo de 15 metros (más cerca del personaje)
        const minSeparation = 0.5 // Separación mínima entre edificios en metros
        
        // Array para almacenar las posiciones y tamaños de los edificios ya generados
        // Cada entrada contiene: { x, z, radius }
        const existingBuildings = []
        
        let buildingsCreated = 0
        let totalAttempts = 0
        const maxAttemptsPerBuilding = 150 // Máximo de intentos por edificio (aumentado para 120 edificios)
        
        modelsToGenerate.forEach((modelName, index) => {
            const model = this.resources.items[modelName]
            if (!model || !model.scene) {
                console.warn(`⚠️ Modelo ${modelName} no válido (index ${index})`)
                return
            }
            
            try {
                // Primero calcular el tamaño original y la escala para determinar la separación necesaria
                const originalBbox = new THREE.Box3().setFromObject(model.scene)
                let modelScale = 1.0 // Escala por defecto
                let estimatedRadius = 2.0 // Radio estimado por defecto
                
                // Calcular la escala del modelo
                if (!originalBbox.isEmpty()) {
                    const originalSize = new THREE.Vector3()
                    originalBbox.getSize(originalSize)
                    const maxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z)
                    
                    // Aumentar MUCHO MÁS la escala para que los edificios sean MUY grandes
                    // Objetivo: altura de edificios entre 30-60 unidades (muy grandes para el juego)
                    if (maxDimension > 1000) {
                        modelScale = 2.0 // Modelos gigantes - escala muy grande
                    } else if (maxDimension > 500) {
                        modelScale = 3.0 // Modelos muy grandes - escala enorme
                    } else if (maxDimension > 200) {
                        modelScale = 5.0 // Modelos grandes - escala masiva
                    } else if (maxDimension > 100) {
                        modelScale = 8.0 // Modelos medianos-grandes - escala gigante
                    } else if (maxDimension > 50) {
                        modelScale = 12.0 // Modelos medianos - escala enorme
                    } else if (maxDimension > 20) {
                        modelScale = 20.0 // Modelos pequeños - escala masiva
                    } else {
                        modelScale = 40.0 // Modelos muy pequeños - escala gigante
                    }
                    
                    // Calcular el radio estimado DESPUÉS de aplicar la escala
                    // El radio es la mitad de la dimensión más grande (X o Z) después del escalado
                    estimatedRadius = Math.max(originalSize.x, originalSize.z) * modelScale / 2
                    // Agregar un buffer de seguridad mínimo
                    estimatedRadius = Math.max(estimatedRadius, 1.0)
                } else {
                    console.warn(`⚠️ No se pudo calcular bbox para ${modelName}, usando escala por defecto 5.0`)
                    modelScale = 5.0 // Escala muy grande por defecto
                    estimatedRadius = 5.0 // Radio estimado por defecto
                }
                
                // Intentar encontrar una posición válida (que no esté demasiado cerca de otros edificios)
                let positionFound = false
                let x = 0
                let z = 0
                let attempts = 0
                
                while (!positionFound && attempts < maxAttemptsPerBuilding) {
                    attempts++
                    totalAttempts++
                    
                    // Generar posición aleatoria
                    const angle = Math.random() * Math.PI * 2
                    // Distribuir más edificios cerca, pero también algunos lejos
                    // Usar distribución más uniforme para aprovechar mejor el espacio
                    const distance = minRadius + Math.random() * (maxRadius - minRadius)
                    
                    x = robotPos.x + Math.cos(angle) * distance
                    z = robotPos.z + Math.sin(angle) * distance
                    
                    // Verificar que no esté demasiado cerca de otros edificios
                    // Considerar el tamaño del edificio actual y los edificios existentes
                    let tooClose = false
                    for (const existing of existingBuildings) {
                        const dx = x - existing.x
                        const dz = z - existing.z
                        const distanceToExisting = Math.sqrt(dx * dx + dz * dz)
                        
                        // La separación requerida es la suma de los radios + separación mínima
                        const combinedRadius = estimatedRadius + existing.radius + minSeparation
                        
                        if (distanceToExisting < combinedRadius) {
                            tooClose = true
                            break
                        }
                    }
                    
                    // Si no está demasiado cerca, la posición es válida
                    if (!tooClose) {
                        positionFound = true
                        // Guardar la posición y el radio (después del escalado) para futuras verificaciones
                        existingBuildings.push({ x, z, radius: estimatedRadius })
                    }
                }
                
                // Si no se encontró una posición válida después de muchos intentos, intentar con separación reducida
                if (!positionFound) {
                    console.warn(`⚠️ No se pudo encontrar posición válida para ${modelName} (${index + 1}/${modelsToGenerate.length}) después de ${maxAttemptsPerBuilding} intentos. Intentando con separación reducida...`)
                    
                    // Intentar con separación reducida (solo separación mínima, sin considerar radios completos)
                    let relaxedAttempts = 0
                    const relaxedSeparation = minSeparation * 2 // Separación mínima más pequeña
                    
                    while (!positionFound && relaxedAttempts < 50) {
                        relaxedAttempts++
                        totalAttempts++
                        
                        const angle = Math.random() * Math.PI * 2
                        const distance = minRadius + Math.random() * (maxRadius - minRadius)
                        x = robotPos.x + Math.cos(angle) * distance
                        z = robotPos.z + Math.sin(angle) * distance
                        
                        let tooClose = false
                        for (const existing of existingBuildings) {
                            const dx = x - existing.x
                            const dz = z - existing.z
                            const distanceToExisting = Math.sqrt(dx * dx + dz * dz)
                            
                            // Solo verificar separación mínima básica
                            if (distanceToExisting < relaxedSeparation) {
                                tooClose = true
                                break
                            }
                        }
                        
                        if (!tooClose) {
                            positionFound = true
                            existingBuildings.push({ x, z, radius: estimatedRadius })
                        }
                    }
                }
                
                // Si aún no se encontró, usar la última posición generada (último recurso)
                if (!positionFound) {
                    console.warn(`⚠️ Usando posición sin validación para ${modelName} (${index + 1}/${modelsToGenerate.length})`)
                    existingBuildings.push({ x, z, radius: estimatedRadius })
                }
                
                // Clonar el modelo - usar clone() simple y luego copiar materiales manualmente si es necesario
                const buildingModel = model.scene.clone()
                buildingModel.scale.set(modelScale, modelScale, modelScale)
                
                // Actualizar matriz del mundo después del escalado
                buildingModel.updateMatrixWorld(true)
                
                // Calcular bbox DESPUÉS del escalado para posicionar en el suelo
                const bbox = new THREE.Box3().setFromObject(buildingModel)
                
                let y = 0
                let localCenter = new THREE.Vector3()
                
                if (bbox.isEmpty()) {
                    console.warn(`⚠️ Bbox vacío para ${modelName}, usando posición por defecto`)
                    // Intentar obtener bbox del modelo original sin escalar primero
                    const originalBbox = new THREE.Box3().setFromObject(model.scene)
                    if (!originalBbox.isEmpty()) {
                        const originalSize = new THREE.Vector3()
                        originalBbox.getSize(originalSize)
                        y = (originalSize.y * modelScale) / 2
                        console.log(`📏 Usando altura estimada: ${y.toFixed(2)} para ${modelName}`)
                    }
                } else {
                    bbox.getCenter(localCenter)
                    const size = new THREE.Vector3()
                    bbox.getSize(size)
                    
                    // Posicionar en el suelo - ajustar Y para que la base esté en Y = 0
                    y = -bbox.min.y
                    
                    // Crear física para el edificio
                    if (size.x > 0 && size.y > 0 && size.z > 0) {
                        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2 * 0.9, size.y / 2 * 0.9, size.z / 2 * 0.9))
                        const body = new CANNON.Body({
                            mass: 0,
                            shape: shape,
                            position: new CANNON.Vec3(x + localCenter.x, y + localCenter.y, z + localCenter.z),
                            material: this.experience.physics.obstacleMaterial
                        })
                        this.experience.physics.world.addBody(body)
                    }
                }
                
                // Posicionar el modelo
                buildingModel.position.set(x, y, z)
                
                // Asegurar que el modelo completo sea visible
                buildingModel.visible = true
                
                // Asegurar que los materiales se copien correctamente y sean visibles
                buildingModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        // Asegurar que el mesh sea visible
                        child.visible = true
                        child.castShadow = true
                        child.receiveShadow = true
                        
                        // Asegurar que tenga material y sea visible
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => {
                                if (mat) {
                                    mat.visible = true
                                    if (mat.opacity !== undefined && mat.opacity === 0) {
                                        mat.opacity = 1.0
                                        mat.transparent = false
                                    }
                                }
                            })
                        } else if (child.material) {
                            child.material.visible = true
                            if (child.material.opacity !== undefined && child.material.opacity === 0) {
                                child.material.opacity = 1.0
                                child.material.transparent = false
                            }
                        }
                    }
                })
                
                // Agregar a la escena
                this.scene.add(buildingModel)
                this.level2Buildings.push(buildingModel)
                buildingsCreated++
                
                // Log solo cada 10 edificios para no saturar la consola
                if (buildingsCreated % 10 === 0 || buildingsCreated === 1) {
                    console.log(`✅ Edificio ${buildingsCreated}/${modelsToGenerate.length}: ${modelName} en (${x.toFixed(1)}, ${z.toFixed(1)})`)
                }
                
            } catch (error) {
                console.error(`❌ Error al crear edificio ${modelName}:`, error)
            }
        })
        
        console.log(`✅ ${buildingsCreated} edificios del nivel 2 generados exitosamente`)
        console.log(`📍 Edificios en la escena: ${this.level2Buildings.length}`)
        console.log(`📊 Intentos totales: ${totalAttempts}, Promedio: ${(totalAttempts / buildingsCreated).toFixed(2)} intentos por edificio`)
        
        // Resumen final de los edificios creados
        if (this.level2Buildings.length > 0) {
            // Verificar separación mínima entre edificios usando los datos guardados
            let violations = 0
            let minDistanceFound = Infinity
            
            for (let i = 0; i < existingBuildings.length; i++) {
                for (let j = i + 1; j < existingBuildings.length; j++) {
                    const building1 = existingBuildings[i]
                    const building2 = existingBuildings[j]
                    const dx = building1.x - building2.x
                    const dz = building1.z - building2.z
                    const distance = Math.sqrt(dx * dx + dz * dz)
                    const requiredSeparation = building1.radius + building2.radius + minSeparation
                    
                    if (distance < requiredSeparation) {
                        violations++
                    }
                    
                    if (distance < minDistanceFound) {
                        minDistanceFound = distance
                    }
                }
            }
            
            if (violations > 0) {
                console.warn(`⚠️ Advertencia: ${violations} pares de edificios están más cerca de lo requerido`)
                console.warn(`⚠️ Distancia mínima encontrada: ${minDistanceFound.toFixed(2)}m`)
            } else {
                console.log(`✅ Todos los edificios respetan la separación mínima de ${minSeparation}m`)
                console.log(`✅ Distancia mínima entre edificios: ${minDistanceFound.toFixed(2)}m`)
            }
            
            // Verificar que los edificios estén realmente en la escena
            const buildingsInScene = this.scene.children.filter(child => 
                this.level2Buildings.includes(child)
            )
            console.log(`🔍 Edificios verificados en la escena: ${buildingsInScene.length}/${this.level2Buildings.length}`)
        }
    }
    
    startLevel3() {
        console.log('🚀 Iniciando nivel 3...')
        this.currentLevel = 3
        
        // Ocultar el botón de saltar al nivel 2 (si existe)
        this.updateSkipButtonVisibility()
        
        // Mostrar notificación de teletransporte
        const notification = document.createElement('div')
        notification.innerText = '🌟 ¡Nivel 2 completado!\n🌀 Teletransportando al Nivel 3...'
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 165, 0, 0.9);
            color: #000;
            padding: 30px 50px;
            font-size: 28px;
            font-weight: bold;
            font-family: sans-serif;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            text-align: center;
            white-space: pre-line;
            animation: fadeInOut 3s ease-in-out;
        `
        document.body.appendChild(notification)
        setTimeout(() => {
            notification.remove()
        }, 3000)
        
        // Remover TODOS los edificios del nivel 2 y sus cuerpos físicos
        if (this.level2Buildings && this.level2Buildings.length > 0) {
            this.level2Buildings.forEach(building => {
                if (building && building.parent) {
                    this.scene.remove(building)
                    // Limpiar geometrías y materiales
                    building.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            if (child.geometry) child.geometry.dispose()
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => {
                                        if (mat.map) mat.map.dispose()
                                        mat.dispose()
                                    })
                                } else {
                                    if (child.material.map) child.material.map.dispose()
                                    child.material.dispose()
                                }
                            }
                        }
                    })
                }
            })
            this.level2Buildings = []
            console.log('🗑️ Edificios del nivel 2 removidos')
        }
        
        // Remover partículas del queso actual
        if (this.cheeseParticles) {
            this.cheeseParticles.remove()
            this.cheeseParticles = null
        }
        
        // Remover quesos del nivel 2
        this.cheeses.forEach(cheese => {
            if (cheese.pivot) {
                cheese.collect()
            }
        })
        this.cheeses = []
        this.cheesesCollected = 0
        this.updateCheeseCounter()
        
        // Limpiar enemigos del nivel 2
        this.clearEnemies()
        
        // Teletransportar al jugador a una posición central del nivel 3
        if (this.robot && this.robot.body) {
            this.robot.body.position.set(0, 1, 0)
            this.robot.body.velocity.set(0, 0, 0)
            this.spawnPosition.set(0, 0, 0)
        }
        
        // Generar edificios del nivel 3
        this.generateLevel3Buildings()
        
        // Regenerar enemigos para el nivel 3
        setTimeout(() => {
            this.generateEnemies()
        }, 1500)
        
        // Generar el primer queso del nivel 3
        setTimeout(() => {
            this.generateCheese()
        }, 2000)
        
        console.log('✅ Nivel 3 iniciado')
    }
    
    generateLevel3Buildings() {
        console.log('🏗️ Iniciando generación de edificios del nivel 3...')
        
        // Lista de modelos del mundo 3 (15 veces cada uno)
        const world3Models = [
            'pokemon_treecko_house',
            'pokemon_psyduck_house',
            'pokemon_pikachu_house',
            'mudkip_house',
            'meowth_house',
            'machop_house',
            'cyndaquil_house',
            'cubone_house',
            'chikorita_house',
            'charmander_house',
            'bulbasaur_house'
        ]
        
        // Verificar qué modelos están disponibles
        const availableModels = []
        const missingModels = []
        world3Models.forEach(modelName => {
            if (this.resources.items[modelName]) {
                availableModels.push(modelName)
                console.log(`✅ Modelo ${modelName} encontrado`)
            } else {
                missingModels.push(modelName)
                console.warn(`❌ Modelo ${modelName} NO encontrado en resources.items`)
            }
        })
        
        if (availableModels.length === 0) {
            console.error('❌ No se encontraron modelos del mundo 3. Verifica que estén cargados en sources.js')
            return
        }
        
        console.log(`📦 Modelos disponibles: ${availableModels.length}/${world3Models.length}`)
        if (missingModels.length > 0) {
            console.warn(`⚠️ Modelos faltantes: ${missingModels.join(', ')}`)
        }
        
        // Crear 15 instancias de cada modelo disponible
        const modelsToGenerate = []
        availableModels.forEach(modelName => {
            for (let i = 0; i < 15; i++) {
                modelsToGenerate.push(modelName)
            }
        })
        
        // Mezclar aleatoriamente
        for (let i = modelsToGenerate.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [modelsToGenerate[i], modelsToGenerate[j]] = [modelsToGenerate[j], modelsToGenerate[i]]
        }
        
        console.log(`🏗️ Generando ${modelsToGenerate.length} edificios del nivel 3 (15 por cada modelo)...`)
        
        // Generar cada edificio en posiciones aleatorias alrededor del personaje
        const robotPos = this.robot?.body?.position || new THREE.Vector3(0, 0, 0)
        const maxRadius = 500 // Radio máximo de 500 metros
        const minRadius = 15 // Radio mínimo de 15 metros (más cerca del personaje)
        const minSeparation = 5.0 // Separación mínima entre edificios en metros (aumentada para evitar solapamientos)
        
        // Array para almacenar las posiciones y tamaños de los edificios ya generados
        // Cada entrada contiene: { x, z, radius }
        const existingBuildings = []
        
        let buildingsCreated = 0
        let totalAttempts = 0
        const maxAttemptsPerBuilding = 150 // Máximo de intentos por edificio
        
        modelsToGenerate.forEach((modelName, index) => {
            const model = this.resources.items[modelName]
            if (!model || !model.scene) {
                console.warn(`⚠️ Modelo ${modelName} no válido (index ${index})`)
                return
            }
            
            try {
                // Primero calcular el tamaño original y la escala para determinar la separación necesaria
                const originalBbox = new THREE.Box3().setFromObject(model.scene)
                let modelScale = 1.0 // Escala por defecto
                let estimatedRadius = 2.0 // Radio estimado por defecto
                
                // Calcular la escala del modelo (muy reducida para casas más pequeñas)
                if (!originalBbox.isEmpty()) {
                    const originalSize = new THREE.Vector3()
                    originalBbox.getSize(originalSize)
                    const maxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z)
                    
                    // Escalas MUY reducidas para el nivel 3 (aproximadamente 1/4 del tamaño original del nivel 2)
                    // Objetivo: casas pequeñas y bien separadas
                    if (maxDimension > 1000) {
                        modelScale = 0.5 // Modelos gigantes - escala muy pequeña
                    } else if (maxDimension > 500) {
                        modelScale = 0.75 // Modelos muy grandes - escala muy pequeña
                    } else if (maxDimension > 200) {
                        modelScale = 1.25 // Modelos grandes - escala pequeña
                    } else if (maxDimension > 100) {
                        modelScale = 2.0 // Modelos medianos-grandes - escala pequeña
                    } else if (maxDimension > 50) {
                        modelScale = 3.0 // Modelos medianos - escala pequeña
                    } else if (maxDimension > 20) {
                        modelScale = 5.0 // Modelos pequeños - escala pequeña
                    } else {
                        modelScale = 10.0 // Modelos muy pequeños - escala pequeña
                    }
                    
                    // Calcular el radio estimado DESPUÉS de aplicar la escala
                    // El radio es la mitad de la dimensión más grande (X o Z) después del escalado
                    estimatedRadius = Math.max(originalSize.x, originalSize.z) * modelScale / 2
                    // Agregar un buffer de seguridad mínimo
                    estimatedRadius = Math.max(estimatedRadius, 0.5)
                } else {
                    console.warn(`⚠️ No se pudo calcular bbox para ${modelName}, usando escala por defecto 1.5`)
                    modelScale = 1.5 // Escala pequeña por defecto
                    estimatedRadius = 1.5 // Radio estimado por defecto
                }
                
                // Intentar encontrar una posición válida (que no esté demasiado cerca de otros edificios)
                let positionFound = false
                let x = 0
                let z = 0
                let attempts = 0
                
                while (!positionFound && attempts < maxAttemptsPerBuilding) {
                    attempts++
                    totalAttempts++
                    
                    // Generar posición aleatoria
                    const angle = Math.random() * Math.PI * 2
                    // Distribuir más edificios cerca, pero también algunos lejos
                    // Usar distribución más uniforme para aprovechar mejor el espacio
                    const distance = minRadius + Math.random() * (maxRadius - minRadius)
                    
                    x = robotPos.x + Math.cos(angle) * distance
                    z = robotPos.z + Math.sin(angle) * distance
                    
                    // Verificar que no esté demasiado cerca de otros edificios
                    // Considerar el tamaño del edificio actual y los edificios existentes
                    let tooClose = false
                    for (const existing of existingBuildings) {
                        const dx = x - existing.x
                        const dz = z - existing.z
                        const distanceToExisting = Math.sqrt(dx * dx + dz * dz)
                        
                        // La separación requerida es la suma de los radios + separación mínima
                        const combinedRadius = estimatedRadius + existing.radius + minSeparation
                        
                        if (distanceToExisting < combinedRadius) {
                            tooClose = true
                            break
                        }
                    }
                    
                    // Si no está demasiado cerca, la posición es válida
                    if (!tooClose) {
                        positionFound = true
                        // Guardar la posición y el radio (después del escalado) para futuras verificaciones
                        existingBuildings.push({ x, z, radius: estimatedRadius })
                    }
                }
                
                // Si no se encontró una posición válida después de muchos intentos, intentar con separación reducida
                if (!positionFound) {
                    console.warn(`⚠️ No se pudo encontrar posición válida para ${modelName} (${index + 1}/${modelsToGenerate.length}) después de ${maxAttemptsPerBuilding} intentos. Intentando con separación reducida...`)
                    
                    // Intentar con separación reducida pero aún respetando un mínimo de espacio (3.0m mínimo)
                    let relaxedAttempts = 0
                    const relaxedSeparation = minSeparation * 0.6 // Separación mínima reducida (3.0m) pero aún significativa
                    
                    while (!positionFound && relaxedAttempts < 50) {
                        relaxedAttempts++
                        totalAttempts++
                        
                        const angle = Math.random() * Math.PI * 2
                        const distance = minRadius + Math.random() * (maxRadius - minRadius)
                        x = robotPos.x + Math.cos(angle) * distance
                        z = robotPos.z + Math.sin(angle) * distance
                        
                        let tooClose = false
                        for (const existing of existingBuildings) {
                            const dx = x - existing.x
                            const dz = z - existing.z
                            const distanceToExisting = Math.sqrt(dx * dx + dz * dz)
                            
                            // Verificar separación considerando los radios + separación reducida
                            const relaxedCombinedRadius = estimatedRadius + existing.radius + relaxedSeparation
                            if (distanceToExisting < relaxedCombinedRadius) {
                                tooClose = true
                                break
                            }
                        }
                        
                        if (!tooClose) {
                            positionFound = true
                            existingBuildings.push({ x, z, radius: estimatedRadius })
                        }
                    }
                }
                
                // Si aún no se encontró, usar la última posición generada (último recurso)
                // Pero solo si realmente no hay más opciones
                if (!positionFound) {
                    console.warn(`⚠️ Usando posición sin validación para ${modelName} (${index + 1}/${modelsToGenerate.length}) - puede haber solapamiento`)
                    existingBuildings.push({ x, z, radius: estimatedRadius })
                }
                
                // Clonar el modelo - usar clone() simple y luego copiar materiales manualmente si es necesario
                const buildingModel = model.scene.clone()
                buildingModel.scale.set(modelScale, modelScale, modelScale)
                
                // Actualizar matriz del mundo después del escalado
                buildingModel.updateMatrixWorld(true)
                
                // Calcular bbox DESPUÉS del escalado para posicionar en el suelo
                const bbox = new THREE.Box3().setFromObject(buildingModel)
                
                let y = 0
                let localCenter = new THREE.Vector3()
                
                if (bbox.isEmpty()) {
                    console.warn(`⚠️ Bbox vacío para ${modelName}, usando posición por defecto`)
                    // Intentar obtener bbox del modelo original sin escalar primero
                    const originalBbox = new THREE.Box3().setFromObject(model.scene)
                    if (!originalBbox.isEmpty()) {
                        const originalSize = new THREE.Vector3()
                        originalBbox.getSize(originalSize)
                        y = (originalSize.y * modelScale) / 2
                        console.log(`📏 Usando altura estimada: ${y.toFixed(2)} para ${modelName}`)
                    }
                } else {
                    bbox.getCenter(localCenter)
                    const size = new THREE.Vector3()
                    bbox.getSize(size)
                    
                    // Posicionar en el suelo - ajustar Y para que la base esté en Y = 0
                    y = -bbox.min.y
                    
                    // Crear física para el edificio
                    if (size.x > 0 && size.y > 0 && size.z > 0) {
                        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2 * 0.9, size.y / 2 * 0.9, size.z / 2 * 0.9))
                        const body = new CANNON.Body({
                            mass: 0,
                            shape: shape,
                            position: new CANNON.Vec3(x + localCenter.x, y + localCenter.y, z + localCenter.z),
                            material: this.experience.physics.obstacleMaterial
                        })
                        this.experience.physics.world.addBody(body)
                    }
                }
                
                // Posicionar el modelo
                buildingModel.position.set(x, y, z)
                
                // Rotación aleatoria alrededor del eje Y (rotación horizontal) para que miren hacia diferentes direcciones
                const randomRotationY = Math.random() * Math.PI * 2 // Rotación aleatoria de 0 a 360 grados (0 a 2π)
                buildingModel.rotation.y = randomRotationY
                
                // Asegurar que el modelo completo sea visible
                buildingModel.visible = true
                
                // Asegurar que los materiales se copien correctamente y sean visibles
                buildingModel.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        // Asegurar que el mesh sea visible
                        child.visible = true
                        child.castShadow = true
                        child.receiveShadow = true
                        
                        // Asegurar que tenga material y sea visible
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat) => {
                                if (mat) {
                                    mat.visible = true
                                    if (mat.opacity !== undefined && mat.opacity === 0) {
                                        mat.opacity = 1.0
                                        mat.transparent = false
                                    }
                                }
                            })
                        } else if (child.material) {
                            child.material.visible = true
                            if (child.material.opacity !== undefined && child.material.opacity === 0) {
                                child.material.opacity = 1.0
                                child.material.transparent = false
                            }
                        }
                    }
                })
                
                // Agregar a la escena
                this.scene.add(buildingModel)
                this.level3Buildings.push(buildingModel)
                buildingsCreated++
                
                // Log solo cada 10 edificios para no saturar la consola
                if (buildingsCreated % 10 === 0 || buildingsCreated === 1) {
                    console.log(`✅ Edificio ${buildingsCreated}/${modelsToGenerate.length}: ${modelName} en (${x.toFixed(1)}, ${z.toFixed(1)}) rotación: ${(randomRotationY * 180 / Math.PI).toFixed(1)}°`)
                }
                
            } catch (error) {
                console.error(`❌ Error al crear edificio ${modelName}:`, error)
            }
        })
        
        console.log(`✅ ${buildingsCreated} edificios del nivel 3 generados exitosamente`)
        console.log(`📍 Edificios en la escena: ${this.level3Buildings.length}`)
        console.log(`📊 Intentos totales: ${totalAttempts}, Promedio: ${buildingsCreated > 0 ? (totalAttempts / buildingsCreated).toFixed(2) : 0} intentos por edificio`)
        
        // Resumen final de los edificios creados
        if (this.level3Buildings.length > 0) {
            // Verificar separación mínima entre edificios usando los datos guardados
            let violations = 0
            let minDistanceFound = Infinity
            
            for (let i = 0; i < existingBuildings.length; i++) {
                for (let j = i + 1; j < existingBuildings.length; j++) {
                    const building1 = existingBuildings[i]
                    const building2 = existingBuildings[j]
                    const dx = building1.x - building2.x
                    const dz = building1.z - building2.z
                    const distance = Math.sqrt(dx * dx + dz * dz)
                    const requiredSeparation = building1.radius + building2.radius + minSeparation
                    
                    if (distance < requiredSeparation) {
                        violations++
                    }
                    
                    if (distance < minDistanceFound) {
                        minDistanceFound = distance
                    }
                }
            }
            
            if (violations > 0) {
                console.warn(`⚠️ Advertencia: ${violations} pares de edificios están más cerca de lo requerido`)
                console.warn(`⚠️ Distancia mínima encontrada: ${minDistanceFound.toFixed(2)}m`)
            } else {
                console.log(`✅ Todos los edificios respetan la separación mínima de ${minSeparation}m`)
                console.log(`✅ Distancia mínima entre edificios: ${minDistanceFound.toFixed(2)}m`)
            }
            
            // Verificar que los edificios estén realmente en la escena
            const buildingsInScene = this.scene.children.filter(child => 
                this.level3Buildings.includes(child)
            )
            console.log(`🔍 Edificios verificados en la escena: ${buildingsInScene.length}/${this.level3Buildings.length}`)
        }
    }
    
    onAllCheesesCollected() {
        console.log('🎉 ¡Todos los quesos recogidos!')
        
        // Mostrar notificación de completado
        const notification = document.createElement('div')
        notification.innerText = '🎉 ¡Todos los quesos recogidos!\n🌀 El portal ha aparecido!'
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 255, 0.9);
            color: #000;
            padding: 30px 50px;
            font-size: 28px;
            font-weight: bold;
            font-family: sans-serif;
            border-radius: 12px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            pointer-events: none;
            text-align: center;
            white-space: pre-line;
            animation: fadeInOut 4s ease-in-out;
        `
        document.body.appendChild(notification)
        setTimeout(() => {
            notification.remove()
        }, 4000)
        
        // Crear el portal en la posición inicial del spawn (en el suelo)
        // El portal se genera completamente con Three.js, sin necesidad de modelo GLB
        const portalPosition = new THREE.Vector3(
            this.spawnPosition.x,
            0, // Forzar Y = 0 para que esté en el suelo
            this.spawnPosition.z
        )
        this.portal = new Portal({
            position: portalPosition,
            scene: this.scene
        })
        this.portal.activate()
        console.log('🌀 Portal creado en:', portalPosition)
    }
    
    initializeEnemies() {
        // Obtener modelos de enemigos disponibles
        const enemyModelNames = [
            'enemyFastRun',
            'enemyMutantWalking',
            'enemyWalk',
            'enemyWalking',
            'enemyWheelbarrowWalk'
        ]
        
        this.enemyModels = []
        enemyModelNames.forEach(modelName => {
            if (this.resources.items[modelName]) {
                this.enemyModels.push(this.resources.items[modelName])
                console.log(`✅ Modelo de enemigo ${modelName} cargado`)
            } else {
                console.warn(`⚠️ Modelo de enemigo ${modelName} no encontrado`)
            }
        })
        
        if (this.enemyModels.length === 0) {
            console.warn('⚠️ No se encontraron modelos de enemigos')
            return
        }
        
        console.log(`👾 ${this.enemyModels.length} modelos de enemigos disponibles`)
        
        // Generar enemigos después de un pequeño delay
        setTimeout(() => {
            this.generateEnemies()
        }, 2000)
    }
    
    generateEnemies() {
        if (!this.robot || !this.robot.body || this.enemyModels.length === 0) {
            console.warn('⚠️ No se pueden generar enemigos: robot o modelos no disponibles')
            return
        }
        
        // Limpiar enemigos existentes
        this.clearEnemies()
        
        // Número de enemigos según el nivel
        let numberOfEnemies = 1 // Nivel 1 por defecto
        if (this.currentLevel === 1) {
            numberOfEnemies = 1
        } else if (this.currentLevel === 2) {
            numberOfEnemies = 3
        } else if (this.currentLevel === 3) {
            numberOfEnemies = 5
        }
        
        const robotPos = this.robot.body.position
        const spawnDistance = 100 // Distancia de 100 metros
        
        console.log(`👾 Generando ${numberOfEnemies} enemigos para el nivel ${this.currentLevel} a ${spawnDistance} metros del jugador...`)
        
        for (let i = 0; i < numberOfEnemies; i++) {
            // Generar posición aleatoria alrededor del jugador a 100 metros
            const angle = Math.random() * Math.PI * 2
            const x = robotPos.x + Math.cos(angle) * spawnDistance
            const z = robotPos.z + Math.sin(angle) * spawnDistance
            const y = 1 // Altura del suelo
            
            // Seleccionar modelo aleatorio
            const randomModel = this.enemyModels[Math.floor(Math.random() * this.enemyModels.length)]
            
            try {
                // Crear nuevo enemigo
                const enemy = new Enemy(this.experience, randomModel, { x, y, z })
                enemy.setTarget(this.robot)
                this.enemies.push(enemy)
                
                console.log(`👾 Enemigo ${i + 1} creado en (${x.toFixed(1)}, ${z.toFixed(1)})`)
            } catch (error) {
                console.error(`❌ Error al crear enemigo ${i + 1}:`, error)
            }
        }
        
        console.log(`✅ ${this.enemies.length} enemigos generados exitosamente`)
    }
    
    clearEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy) {
                enemy.remove()
            }
        })
        this.enemies = []
    }
    
    onEnemyCollision() {
        if (this.gameOver) return // Evitar múltiples llamadas
        
        console.log('💀 ¡Colisión con enemigo! El juego ha terminado')
        this.gameOver = true
        
        // Detener movimiento del robot
        if (this.robot && this.robot.body) {
            this.robot.body.velocity.set(0, 0, 0)
            this.robot.body.angularVelocity.set(0, 0, 0)
        }
        
        // Mostrar mensaje de game over
        const gameOverModal = document.createElement('div')
        gameOverModal.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.95);
                padding: 40px;
                border-radius: 12px;
                color: #fff;
                z-index: 10001;
                text-align: center;
                font-family: sans-serif;
                box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
                border: 2px solid #ff0000;
            ">
                <h2 style="font-size: 32px; margin-bottom: 20px; color: #ff0000;">💀 ¡GAME OVER!</h2>
                <p style="font-size: 18px; margin-bottom: 30px;">Un enemigo te ha atrapado</p>
                <button id="restart-game-btn" style="
                    padding: 12px 24px;
                    font-size: 16px;
                    background: #ff0000;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                ">🔄 Reiniciar Juego</button>
            </div>
        `
        document.body.appendChild(gameOverModal)
        
        // Botón de reinicio
        const restartBtn = document.getElementById('restart-game-btn')
        restartBtn.addEventListener('click', () => {
            gameOverModal.remove()
            this.restartGame()
        })
    }
    
    restartGame() {
        console.log('🔄 Reiniciando juego...')
        
        // Limpiar enemigos
        this.clearEnemies()
        
        // Limpiar quesos
        this.cheeses.forEach(cheese => {
            if (cheese.pivot) {
                cheese.collect()
            }
        })
        this.cheeses = []
        
        // Remover partículas
        if (this.cheeseParticles) {
            this.cheeseParticles.remove()
            this.cheeseParticles = null
        }
        
        // Remover portal si existe
        if (this.portal && this.portal.group) {
            this.scene.remove(this.portal.group)
            this.portal = null
        }
        
        // Resetear estado del juego
        this.gameOver = false
        this.currentLevel = 1
        this.cheesesCollected = 0
        this.updateCheeseCounter()
        
        // Remover edificios de niveles superiores
        if (this.level2Buildings && this.level2Buildings.length > 0) {
            this.level2Buildings.forEach(building => {
                if (building && building.parent) {
                    this.scene.remove(building)
                }
            })
            this.level2Buildings = []
        }
        
        if (this.level3Buildings && this.level3Buildings.length > 0) {
            this.level3Buildings.forEach(building => {
                if (building && building.parent) {
                    this.scene.remove(building)
                }
            })
            this.level3Buildings = []
        }
        
        // Si no hay vía (porque estábamos en nivel 2 o 3), recrearla
        if (!this.road) {
            const buildingPositions = this.loader?.getBuildingPositions?.() || []
            if (buildingPositions.length > 0) {
                this.road = new Road(this.experience, buildingPositions)
                console.log('🛣️ Vía del nivel 1 recreada')
            }
        }
        
        // Resetear posición del robot
        if (this.robot && this.robot.body) {
            this.robot.body.position.set(0, 1, 0)
            this.robot.body.velocity.set(0, 0, 0)
            this.robot.body.angularVelocity.set(0, 0, 0)
            this.spawnPosition.set(0, 0, 0)
        }
        
        // Regenerar enemigos después de un delay
        setTimeout(() => {
            this.generateEnemies()
        }, 1000)
        
        // Regenerar primer queso después de un delay
        setTimeout(() => {
            this.generateCheese()
        }, 1500)
        
        console.log('✅ Juego reiniciado')
    }

}

