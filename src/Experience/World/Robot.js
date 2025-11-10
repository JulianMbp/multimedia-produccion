import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import Sound from './Sound.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
    }

    setModel() {
        // Cargar modelo FBX del mouse
        this.model = this.resources.items.mouseModel
        this.model.scale.set(0.03, 0.03, 0.03) // Escalar el modelo FBX (suele ser más grande)
        this.model.position.set(0, -0.4, 0) // Ajustar posición para que esté en el suelo

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        // Habilitar sombras
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
    }

    setPhysics() {
        //const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.5, 0.3))
        const shape = new CANNON.Sphere(0.4)

        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            //position: new CANNON.Vec3(4, 1, 0), // Apenas sobre el piso real (que termina en y=0)
            position: new CANNON.Vec3(0, 1, 0),
            linearDamping: 0.05,
            angularDamping: 0.9
        })

        this.body.angularFactor.set(0, 1, 0)

        // Estabilización inicial
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.sleep()
        this.body.material = this.physics.robotMaterial
        //console.log('🚀 Robot material:', this.body.material.name)


        this.physics.world.addBody(this.body)
        //console.log('🤖 Posición inicial del robot:', this.body.position)
        // Activar cuerpo después de que el mundo haya dado al menos un paso de simulación
        setTimeout(() => {
            this.body.wakeUp()
        }, 100) // 100 ms ≈ 6 pasos de simulación si step = 1/60
    }


    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { volume: 0.8 })
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        this.animation.actions = {}
        
        // Debug: Ver la estructura completa del modelo FBX
        const mouseModel = this.resources.items.mouseModel
        console.log('🔍 Estructura del modelo FBX:', {
            type: mouseModel?.constructor?.name,
            hasAnimations: !!mouseModel?.animations,
            animationsLength: mouseModel?.animations?.length,
            keys: mouseModel ? Object.keys(mouseModel) : [],
            modelType: mouseModel?.type,
            children: mouseModel?.children?.length,
            name: mouseModel?.name
        })
        
        // Log detallado de la estructura
        if (mouseModel) {
            console.log('🔍 Todas las propiedades del modelo:', Object.keys(mouseModel))
            console.log('🔍 Tipo de objeto:', mouseModel.constructor.name)
            console.log('🔍 Animaciones directas:', mouseModel.animations)
            if (mouseModel.animations) {
                console.log('🔍 Tipo de animaciones:', mouseModel.animations.constructor.name)
                console.log('🔍 Longitud de animaciones:', mouseModel.animations.length)
                if (mouseModel.animations.length > 0) {
                    console.log('🔍 Primera animación:', mouseModel.animations[0])
                }
            }
        }
        
        // El modelo FBX tiene animaciones - pueden estar en diferentes lugares
        // En FBX, las animaciones pueden estar en:
        // 1. mouseModel.animations (array directo)
        // 2. Dentro de una Armature (común en modelos con esqueleto)
        // 3. En los hijos del modelo (Group children)
        let fbxAnimations = null
        
        // Método 1: Intentar acceder directamente a las animaciones
        if (mouseModel?.animations) {
            if (Array.isArray(mouseModel.animations)) {
                fbxAnimations = mouseModel.animations
                console.log('✅ Animaciones encontradas en mouseModel.animations (array)')
            } else if (mouseModel.animations.length !== undefined) {
                // Puede ser un objeto similar a array
                fbxAnimations = Array.from(mouseModel.animations)
                console.log('✅ Animaciones encontradas en mouseModel.animations (convertidas)')
            }
        }
        
        // Método 2: Buscar en this.model (que es el mismo objeto)
        if ((!fbxAnimations || fbxAnimations.length === 0) && this.model?.animations) {
            if (Array.isArray(this.model.animations)) {
                fbxAnimations = this.model.animations
                console.log('✅ Animaciones encontradas en this.model.animations')
            }
        }
        
        // Método 3: Buscar en los hijos del modelo (especialmente en Armatures)
        if (!fbxAnimations || fbxAnimations.length === 0) {
            const allAnimations = []
            const armatures = []
            
            mouseModel?.traverse?.((child) => {
                // Buscar Armatures (esqueletos)
                if (child.type === 'SkinnedMesh' || child.name?.toLowerCase().includes('armature')) {
                    armatures.push(child)
                    console.log('🔍 Armature encontrada:', child.name, child.type)
                }
                
                // Buscar animaciones en cualquier hijo
                if (child.animations && child.animations.length > 0) {
                    console.log('🔍 Animaciones encontradas en hijo:', child.name, child.type, child.animations.length)
                    allAnimations.push(...child.animations)
                }
            })
            
            if (allAnimations.length > 0) {
                fbxAnimations = allAnimations
                console.log('✅ Animaciones encontradas en hijos del modelo:', allAnimations.length)
            }
            
            // Si encontramos armatures pero no animaciones, las animaciones pueden estar en el modelo principal
            if (armatures.length > 0 && (!fbxAnimations || fbxAnimations.length === 0)) {
                console.log('⚠️ Armatures encontradas pero sin animaciones en hijos. Las animaciones deberían estar en el modelo principal.')
            }
        }
        
        // Método 4: Verificar si el loader FBX guarda las animaciones en una propiedad especial
        // A veces FBXLoader almacena animaciones en el objeto directamente
        if ((!fbxAnimations || fbxAnimations.length === 0) && mouseModel) {
            // Verificar todas las propiedades que puedan contener animaciones
            for (const key in mouseModel) {
                if (key.toLowerCase().includes('anim') || key.toLowerCase().includes('clip')) {
                    const prop = mouseModel[key]
                    if (Array.isArray(prop) && prop.length > 0 && prop[0]?.tracks) {
                        fbxAnimations = prop
                        console.log(`✅ Animaciones encontradas en propiedad: ${key}`)
                        break
                    }
                }
            }
        }
        
        if (!fbxAnimations || fbxAnimations.length === 0) {
            console.error('❌ No se encontraron animaciones en el modelo FBX')
            console.log('📋 Modelo completo:', mouseModel)
            return
        }
        
        console.log(`✅ Total de animaciones encontradas: ${fbxAnimations.length}`)
        
        // Buscar la animación de caminar (puede tener diferentes nombres)
        let walkingAnimation = null
        
        // Buscar animaciones por nombre común
        for (let i = 0; i < fbxAnimations.length; i++) {
            const anim = fbxAnimations[i]
            const animName = anim.name ? anim.name.toLowerCase() : `animation_${i}`
            console.log(`🔍 Animación ${i}:`, {
                name: anim.name || `animation_${i}`,
                duration: anim.duration,
                tracks: anim.tracks?.length,
                type: anim.constructor?.name
            })
            
            // Buscar animación de caminar
            if (animName.includes('walk') || animName.includes('walking') || animName.includes('move')) {
                walkingAnimation = anim
                console.log('✅ Animación de caminar encontrada:', anim.name)
            }
        }
        
        // Si no se encuentra walking, usar la primera animación disponible que tenga tracks
        if (!walkingAnimation && fbxAnimations.length > 0) {
            // Buscar la primera animación que tenga tracks (la animación válida)
            for (let i = 0; i < fbxAnimations.length; i++) {
                if (fbxAnimations[i].tracks && fbxAnimations[i].tracks.length > 0) {
                    walkingAnimation = fbxAnimations[i]
                    console.log('✅ Usando animación con tracks como walking:', walkingAnimation.name)
                    break
                }
            }
        }
        
        // Crear acción de animación de caminar
        if (walkingAnimation && walkingAnimation.tracks && walkingAnimation.tracks.length > 0) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkingAnimation)
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
            this.animation.actions.walking.setEffectiveWeight(1.0)
            this.animation.actions.walking.setEffectiveTimeScale(1.0)
            console.log('✅ Acción de walking creada:', {
                name: walkingAnimation.name,
                duration: walkingAnimation.duration,
                tracks: walkingAnimation.tracks.length,
                loop: 'repeat'
            })
        } else {
            console.error('❌ No se pudo crear la acción de walking - animación inválida')
            return
        }
        
        // No iniciar ninguna animación por defecto - solo cuando el personaje se mueva
        this.animation.actions.current = null

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            if (!newAction) {
                console.warn(`⚠️ Animación "${name}" no encontrada`)
                return
            }
            
            const oldAction = this.animation.actions.current

            // Si la acción ya está reproduciéndose, no hacer nada
            if (oldAction === newAction && oldAction.isRunning()) {
                return
            }

            // Si hay una animación anterior diferente, detenerla primero
            if (oldAction && oldAction !== newAction) {
                oldAction.fadeOut(0.2)
                oldAction.stop()
            }

            // Reproducir la nueva animación
            newAction.reset()
            newAction.play()
            newAction.setEffectiveTimeScale(1.0)
            newAction.setEffectiveWeight(1.0)
            newAction.fadeIn(0.2)
            
            this.animation.actions.current = newAction
            
            console.log(`▶️ Reproduciendo animación: ${name}`, {
                isRunning: newAction.isRunning(),
                enabled: newAction.enabled,
                timeScale: newAction.getEffectiveTimeScale(),
                weight: newAction.getEffectiveWeight()
            })

            if (name === 'walking') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }
        }
        
        this.animation.stop = () => {
            if (this.animation.actions.current) {
                this.animation.actions.current.fadeOut(0.2)
                this.animation.actions.current.stop()
                this.animation.actions.current = null
                this.walkSound.stop()
                console.log('⏸️ Animación detenida')
            }
        }
        
        console.log('✅ Animaciones del mouse cargadas:', {
            walking: walkingAnimation?.name,
            totalAnimations: fbxAnimations.length,
            allAnimations: fbxAnimations.map(a => a.name)
        })
    }

    update() {
        // IMPORTANTE: Actualizar el mixer de animaciones PRIMERO
        const delta = this.time.delta * 0.001
        if (this.animation && this.animation.mixer) {
            this.animation.mixer.update(delta)
        }

        const keys = this.keyboard.getState()
        const moveForce = 150 // Aumentado de 80 a 150 para movimiento más rápido
        const turnSpeed = 2.5
        let isMoving = false

        // Limitar velocidad si es demasiado alta
        const maxSpeed = 25 // Aumentado de 15 a 25 para permitir mayor velocidad
        this.body.velocity.x = Math.max(Math.min(this.body.velocity.x, maxSpeed), -maxSpeed)
        this.body.velocity.z = Math.max(Math.min(this.body.velocity.z, maxSpeed), -maxSpeed)


        // Salto
        // Dirección hacia adelante, independientemente del salto o movimiento
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)

        // Salto
        if (keys.space && this.body.position.y <= 0.51) {
            this.body.applyImpulse(new CANNON.Vec3(forward.x * 0.5, 3, forward.z * 0.5))
            this.animation.play('jump')
            return
        }
        //No permitir que el robot salga del escenario
        if (this.body.position.y > 10) {
            console.warn('⚠️ Robot fuera del escenario. Reubicando...')
            this.body.position.set(0, 1, 0)
            this.body.velocity.set(0, 0, 0)
        }


        // Movimiento hacia adelante
        if (keys.up) {
            const forward = new THREE.Vector3(0, 0, 1)
            forward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Movimiento hacia atrás
        if (keys.down) {
            const backward = new THREE.Vector3(0, 0, -1)
            backward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // Rotación
        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }


        // Animaciones según movimiento
        if (isMoving) {
            // Si el personaje se está moviendo, reproducir animación de caminar
            if (!this.animation.actions.current || this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }
        } else {
            // Si el personaje no se está moviendo, detener la animación
            if (this.animation.actions.current === this.animation.actions.walking) {
                this.animation.stop()
            }
        }

        // Sincronización física → visual
        this.group.position.copy(this.body.position)

    }

    // Método para mover el robot desde el exterior VR
    moveInDirection() {
        if (!window.userInteracted || !this.experience.renderer.instance.xr.isPresenting) {
            return
        }

        // Si hay controles móviles activos
        const mobile = window.experience?.mobileControls
        if (mobile?.intensity > 0) {
            const dir2D = mobile.directionVector
            const dir3D = new THREE.Vector3(dir2D.x, 0, dir2D.y).normalize()

            const adjustedSpeed = 250 * mobile.intensity // velocidad más fluida
            const force = new CANNON.Vec3(dir3D.x * adjustedSpeed, 0, dir3D.z * adjustedSpeed)

            this.body.applyForce(force, this.body.position)

            if (this.animation.actions.current !== this.animation.actions.walking) {
                this.animation.play('walking')
            }

            // Rotar suavemente en dirección de avance
            const angle = Math.atan2(dir3D.x, dir3D.z)
            this.group.rotation.y = angle
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }
    }

}
