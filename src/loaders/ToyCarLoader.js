import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { createBoxShapeFromModel, createTrimeshShapeFromModel } from '../Experience/Utils/PhysicsShapeFactory.js'
import Prize from '../Experience/World/Prize.js'

export default class ToyCarLoader {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics
        this.prizes = []
        this.buildingPositions = [] // Almacenar posiciones de edificios para la vía
        this.level1Buildings = [] // Almacenar referencias a los modelos del nivel 1
        this.level1PhysicsBodies = [] // Almacenar referencias a los cuerpos físicos del nivel 1
    }
    
    getBuildingPositions() {
        return this.buildingPositions
    }
    
    // Método para limpiar todos los edificios del nivel 1
    clearLevel1Buildings() {
        console.log('🗑️ Removiendo edificios del nivel 1...')
        
        // Remover modelos de la escena
        this.level1Buildings.forEach(building => {
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
        
        // Remover cuerpos físicos
        this.level1PhysicsBodies.forEach(body => {
            if (body && this.physics.world) {
                this.physics.world.removeBody(body)
            }
        })
        
        // Limpiar arrays
        this.level1Buildings = []
        this.level1PhysicsBodies = []
        this.buildingPositions = []
        
        console.log('✅ Edificios del nivel 1 removidos')
    }

    async loadFromAPI() {
        try {
            // Cargar lista de modelos con física precisa (Trimesh)
            let precisePhysicsModels = []
            try {
                const listRes = await fetch('/config/precisePhysicsModels.json')
                if (listRes.ok) {
                    precisePhysicsModels = await listRes.json()
                    console.log(`📋 Modelos con física precisa: ${precisePhysicsModels.length}`)
                } else {
                    console.warn('⚠️ No se encontró precisePhysicsModels.json, usando física de caja por defecto')
                }
            } catch (err) {
                console.warn('⚠️ Error al cargar precisePhysicsModels.json, usando física de caja por defecto:', err.message)
            }

            let blocks = []

            // Intentar cargar desde la API primero
            try {
                const apiUrl = import.meta.env.VITE_API_URL + '/api/blocks'
                const res = await fetch(apiUrl)

                if (res.ok) {
                    blocks = await res.json()
                    console.log('✅ Datos cargados desde la API:', blocks.length)
                    
                    // Si la API devuelve 0 bloques, intentar cargar desde archivo local
                    if (blocks.length === 0) {
                        console.warn('⚠️ La API devolvió 0 bloques. Cargando desde archivo local...')
                        throw new Error('API vacía')
                    }
                } else {
                    throw new Error('API no disponible')
                }
            } catch {
                // Si falla la API o devuelve 0 bloques, cargar desde archivo local
                console.warn('⚠️ No se pudo cargar desde la API. Cargando desde archivo local...')
                try {
                    const localRes = await fetch('/data/toy_car_blocks.json')
                    if (!localRes.ok) {
                        throw new Error(`Archivo local no encontrado: ${localRes.status}`)
                    }
                    blocks = await localRes.json()
                    if (!Array.isArray(blocks)) {
                        throw new Error('Formato de archivo local inválido')
                    }
                    console.log('📦 Datos cargados desde archivo local:', blocks.length)
                } catch (localError) {
                    console.error('❌ Error al cargar desde archivo local:', localError.message)
                    blocks = [] // Asegurar que blocks sea un array vacío
                }
            }

            // Verificar si hay bloques para procesar
            if (!blocks || blocks.length === 0) {
                console.error('❌ No se encontraron bloques para cargar. Verifica que el archivo /data/toy_car_blocks.json existe y tiene datos.')
                return
            }

            console.log(`🔄 Procesando ${blocks.length} bloques...`)

            // 📐 Calcular el centro de masa de todos los edificios para normalizar posiciones
            let sumX = 0, sumY = 0, sumZ = 0
            let validBlocks = 0
            
            blocks.forEach(block => {
                if (block.name && block.x !== undefined && block.y !== undefined && block.z !== undefined) {
                    sumX += block.x
                    sumY += block.y
                    sumZ += block.z
                    validBlocks++
                }
            })
            
            // Calcular offset para centrar los edificios alrededor del origen (donde está el robot)
            const offsetX = validBlocks > 0 ? sumX / validBlocks : 0
            const offsetY = validBlocks > 0 ? sumY / validBlocks : 0
            const offsetZ = validBlocks > 0 ? sumZ / validBlocks : 0
            
            // Detectar si las coordenadas ya están normalizadas (centro cerca de 0)
            const centerDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ)
            const isAlreadyNormalized = centerDistance < 10 // Si el centro está a menos de 10 unidades del origen
            
            if (isAlreadyNormalized) {
                console.log(`📍 Coordenadas ya normalizadas (centro cerca de origen: ${centerDistance.toFixed(2)} unidades)`)
                console.log(`✅ Usando coordenadas directamente sin normalización adicional`)
            } else {
                console.log(`📍 Centro de masa de edificios: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}, ${offsetZ.toFixed(2)})`)
                console.log(`🔄 Normalizando posiciones: restando offset (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}, ${offsetZ.toFixed(2)})`)
            }

            let buildingCount = 0
            let missingModels = []
            let blocksWithoutName = []
            
            blocks.forEach((block) => {
                if (!block.name) {
                    blocksWithoutName.push(block)
                    return
                }

                const resourceKey = block.name
                const glb = this.resources.items[resourceKey]

                if (!glb) {
                    missingModels.push(resourceKey)
                    return
                }

                const model = glb.scene.clone()
                
                // 📏 Escalar el modelo para que sea proporcional al mundo
                // Reducir la escala para hacer los edificios más pequeños
                const modelScale = 0.05 // Escala de 5% - edificios más pequeños
                model.scale.set(modelScale, modelScale, modelScale)

                // 🎯 Manejo de Carteles
                const cube = model.getObjectByName('Cube')
                if (cube) {
                    // 1) Carga la textura
                    const textureLoader = new THREE.TextureLoader()
                    const texture = textureLoader.load('/textures/ima1.jpg', () => {
                        // 1) Ajustes de color y filtrado
                        texture.encoding = THREE.sRGBEncoding
                        texture.wrapS = THREE.ClampToEdgeWrapping
                        texture.wrapT = THREE.ClampToEdgeWrapping
                        texture.anisotropy = this.experience.renderer.instance.capabilities.getMaxAnisotropy()

                        // 2) Centrar el pivote de rotación y girar 90°
                        texture.center.set(0.5, 0.5)        // mueve el pivote al centro de la imagen
                        texture.rotation = -Math.PI / 2     // gira -90°, cámbialo a +Math.PI/2 si lo necesitas

                        // 3) Crea un material y aplícalo
                        cube.material = new THREE.MeshBasicMaterial({
                            map: texture,
                            side: THREE.DoubleSide
                        })
                        cube.material.needsUpdate = true
                        
                    })

                }

                // Si es un premio (coin, reward, etc.)
                if (block.name.startsWith('coin')) {
                    console.log(`Premio detectado: ${block.name}`)
                    // Normalizar posición del premio también (solo si no está ya normalizada)
                    const normalizedX = isAlreadyNormalized ? block.x : block.x - offsetX
                    const normalizedY = isAlreadyNormalized ? block.y : block.y - offsetY
                    const normalizedZ = isAlreadyNormalized ? block.z : block.z - offsetZ
                    const prize = new Prize({
                        model,
                        position: new THREE.Vector3(normalizedX, normalizedY, normalizedZ),
                        scene: this.scene
                    })
                    this.prizes.push(prize)
                    this.scene.add(prize.model)
                    return
                }

                // 📐 Calcular bbox DESPUÉS del escalado (el modelo está en 0,0,0 pero escalado)
                // Esto nos da el centro local del modelo escalado relativo a su origen
                const bbox = new THREE.Box3()
                bbox.setFromObject(model)
                
                // Verificar que el bbox sea válido
                if (bbox.isEmpty()) {
                    console.warn(`⚠️ Bbox vacío para ${block.name}, usando posición del JSON sin ajuste`)
                    const normalizedX = isAlreadyNormalized ? block.x : block.x - offsetX
                    const normalizedY = isAlreadyNormalized ? block.y : block.y - offsetY
                    const normalizedZ = isAlreadyNormalized ? block.z : block.z - offsetZ
                    model.position.set(normalizedX, normalizedY, normalizedZ)
                    this.scene.add(model)
                    this.buildingPositions.push({ x: normalizedX, y: normalizedY, z: normalizedZ })
                    this.level1Buildings.push(model) // Guardar referencia
                    buildingCount++
                    return
                }
                
                const localCenter = new THREE.Vector3()
                const size = new THREE.Vector3()
                bbox.getCenter(localCenter)
                bbox.getSize(size)

                // 🎯 Establecer la posición del modelo desde el JSON
                // Normalizar posición solo si no está ya normalizada
                const normalizedX = isAlreadyNormalized ? block.x : block.x - offsetX
                const normalizedY = isAlreadyNormalized ? block.y : block.y - offsetY
                const normalizedZ = isAlreadyNormalized ? block.z : block.z - offsetZ
                
                // 🏗️ Ajustar Y para que la base del edificio esté en el suelo (Y = 0)
                // bbox.min.y es la coordenada Y mínima local del modelo (normalmente negativo)
                // Si posicionamos el modelo en normalizedY, la base estará en normalizedY + bbox.min.y
                // Queremos que la base esté en Y = 0, así que: adjustedY = -bbox.min.y
                // Esto coloca todos los edificios con la base en Y=0, ignorando normalizedY para altura
                const adjustedY = -bbox.min.y // Colocar base en Y = 0 para todos los edificios
                
                model.position.set(normalizedX, adjustedY, normalizedZ)
                
                // Guardar posición para la vía
                this.buildingPositions.push({ x: normalizedX, y: adjustedY, z: normalizedZ })
                
                // Guardar referencia al modelo para poder removerlo después
                this.level1Buildings.push(model)
                
                // Agregar el modelo a la escena
                this.scene.add(model)
                buildingCount++
                
                // Log para debugging (solo los primeros 3 edificios)
                if (buildingCount <= 3) {
                    console.log(`🏗️ Edificio ${block.name} posicionado en:`, {
                        position: { x: normalizedX.toFixed(2), y: normalizedY.toFixed(2), z: normalizedZ.toFixed(2) },
                        scale: modelScale,
                        sizeAfterScale: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
                        centerLocal: { x: localCenter.x.toFixed(2), y: localCenter.y.toFixed(2), z: localCenter.z.toFixed(2) }
                    })
                }

                let shape
                let physicsPosition = new THREE.Vector3()

                if (precisePhysicsModels.includes(block.name)) {
                    // Actualizar matriz del mundo antes de crear Trimesh
                    model.updateMatrixWorld(true)
                    shape = createTrimeshShapeFromModel(model)
                    if (!shape) {
                        console.warn(`❌ No se pudo crear Trimesh para ${block.name}`)
                        return
                    }

                    // Para modelos Trimesh, el centro físico está en el centro del modelo
                    // La posición física debe usar adjustedY
                    physicsPosition.set(
                        normalizedX + localCenter.x,
                        adjustedY + localCenter.y,
                        normalizedZ + localCenter.z
                    )
                } else {
                    shape = createBoxShapeFromModel(model, 0.9) // puedes ajustar 0.9 → 0.85 si lo deseas

                    // Para cajas físicas, el centro está en el centro geométrico
                    // Usar adjustedY para que la física coincida con la posición visual
                    physicsPosition.set(
                        normalizedX + localCenter.x,
                        adjustedY + localCenter.y,
                        normalizedZ + localCenter.z
                    )
                }

                const body = new CANNON.Body({
                    mass: 0,
                    shape: shape,
                    position: new CANNON.Vec3(physicsPosition.x, physicsPosition.y, physicsPosition.z),
                    material: this.physics.obstacleMaterial
                })

                this.physics.world.addBody(body)
                
                // Guardar referencia al cuerpo físico para poder removerlo después
                this.level1PhysicsBodies.push(body)
            })

            // Resumen de carga
            console.log(`✅ ${buildingCount} edificios cargados y posicionados en la escena`)
            
            if (missingModels.length > 0) {
                console.warn(`⚠️ ${missingModels.length} modelos no encontrados:`, missingModels.slice(0, 5))
            }
            
            if (blocksWithoutName.length > 0) {
                console.warn(`⚠️ ${blocksWithoutName.length} bloques sin nombre encontrados`)
            }
            
            // Calcular rango de posiciones NORMALIZADAS
            if (blocks.length > 0) {
                const normalizedPositions = blocks.filter(b => b.name).map(b => ({ 
                    x: isAlreadyNormalized ? b.x : b.x - offsetX, 
                    y: isAlreadyNormalized ? b.y : b.y - offsetY, 
                    z: isAlreadyNormalized ? b.z : b.z - offsetZ 
                }))
                const minX = Math.min(...normalizedPositions.map(p => p.x))
                const maxX = Math.max(...normalizedPositions.map(p => p.x))
                const minZ = Math.min(...normalizedPositions.map(p => p.z))
                const maxZ = Math.max(...normalizedPositions.map(p => p.z))
                
                console.log(`📍 Rango de posiciones NORMALIZADAS de edificios:`, {
                    X: `${minX.toFixed(0)} a ${maxX.toFixed(0)}`,
                    Z: `${minZ.toFixed(0)} a ${maxZ.toFixed(0)}`,
                    Centro: `(${(minX + maxX) / 2}, ${(minZ + maxZ) / 2})`
                })
                
                // Verificar si hay edificios cerca del origen (después de normalizar)
                const nearOrigin = normalizedPositions.filter(p => {
                    const dist = Math.sqrt(p.x * p.x + p.z * p.z)
                    return dist < 100
                })
                console.log(`🏠 Edificios cerca del origen (< 100 unidades): ${nearOrigin.length}`)
            }

        } catch (err) {
            console.error('❌ Error al cargar bloques o lista Trimesh:', err)
        }
    }
}
