import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export default class Enemy {
    constructor(experience, modelResource, position) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.modelResource = modelResource
        this.target = null // El personaje principal (robot)
        
        // Velocidad del enemigo (más lento que el jugador)
        this.speed = 10 // Velocidad máxima (el jugador tiene maxSpeed de 25, enemigos más lentos)
        this.chaseDistance = 300 // Distancia máxima de persecución (aumentada para que siempre persigan)
        
        this.setModel()
        this.setPhysics(position)
        this.setAnimation()
    }
    
    setModel() {
        // Cargar modelo FBX del enemigo
        this.model = this.modelResource
        this.model.scale.set(0.03, 0.03, 0.03) // Misma escala que el personaje principal
        this.model.position.set(0, -0.4, 0)
        
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
    
    setPhysics(position) {
        const shape = new CANNON.Sphere(0.4)
        
        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            position: new CANNON.Vec3(position.x, position.y || 1, position.z),
            linearDamping: 0.1, // Más damping para movimientos más suaves
            angularDamping: 0.9
        })
        
        this.body.angularFactor.set(0, 1, 0)
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.sleep()
        this.body.material = this.physics.obstacleMaterial
        
        this.physics.world.addBody(this.body)
        
        setTimeout(() => {
            this.body.wakeUp()
        }, 100)
    }
    
    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}
        
        // Buscar animaciones en el modelo FBX
        let fbxAnimations = null
        
        if (this.modelResource?.animations) {
            if (Array.isArray(this.modelResource.animations)) {
                fbxAnimations = this.modelResource.animations
            }
        }
        
        // Buscar en los hijos si no hay animaciones directas
        if (!fbxAnimations || fbxAnimations.length === 0) {
            const allAnimations = []
            this.modelResource?.traverse?.((child) => {
                if (child.animations && child.animations.length > 0) {
                    allAnimations.push(...child.animations)
                }
            })
            if (allAnimations.length > 0) {
                fbxAnimations = allAnimations
            }
        }
        
        if (!fbxAnimations || fbxAnimations.length === 0) {
            console.warn('⚠️ No se encontraron animaciones en el modelo de enemigo')
            return
        }
        
        // Buscar animación de caminar/correr
        let walkingAnimation = null
        for (let i = 0; i < fbxAnimations.length; i++) {
            const anim = fbxAnimations[i]
            const animName = anim.name ? anim.name.toLowerCase() : `animation_${i}`
            
            if (animName.includes('walk') || animName.includes('walking') || 
                animName.includes('run') || animName.includes('running') ||
                animName.includes('move')) {
                walkingAnimation = anim
                break
            }
        }
        
        // Si no se encuentra, usar la primera animación disponible
        if (!walkingAnimation && fbxAnimations.length > 0) {
            for (let i = 0; i < fbxAnimations.length; i++) {
                if (fbxAnimations[i].tracks && fbxAnimations[i].tracks.length > 0) {
                    walkingAnimation = fbxAnimations[i]
                    break
                }
            }
        }
        
        // Crear acción de animación
        if (walkingAnimation && walkingAnimation.tracks && walkingAnimation.tracks.length > 0) {
            this.animation.actions.walking = this.animation.mixer.clipAction(walkingAnimation)
            this.animation.actions.walking.setLoop(THREE.LoopRepeat)
            this.animation.actions.walking.setEffectiveWeight(1.0)
            this.animation.actions.walking.setEffectiveTimeScale(1.0)
            this.animation.actions.walking.play()
        }
    }
    
    setTarget(target) {
        this.target = target
    }
    
    update() {
        // Actualizar animación
        if (this.animation && this.animation.mixer && this.time) {
            const delta = this.time.delta * 0.001
            this.animation.mixer.update(delta)
        }
        
        // Perseguir al objetivo si existe
        if (this.target && this.target.body) {
            const targetPos = this.target.body.position
            const enemyPos = this.body.position
            
            // Calcular distancia al objetivo
            const dx = targetPos.x - enemyPos.x
            const dz = targetPos.z - enemyPos.z
            const distance = Math.sqrt(dx * dx + dz * dz)
            
            // Perseguir siempre si el objetivo está dentro del rango de persecución
            // No detener si está muy cerca (para que pueda colisionar)
            if (distance < this.chaseDistance && distance > 0.01) {
                // Calcular dirección normalizada hacia el objetivo
                const direction = new CANNON.Vec3(dx / distance, 0, dz / distance)
                
                // Aplicar fuerza en la dirección del objetivo
                const force = this.speed * 10 // Factor de fuerza
                this.body.applyForce(
                    new CANNON.Vec3(direction.x * force, 0, direction.z * force),
                    this.body.position
                )
                
                // Limitar velocidad máxima
                const velocity = this.body.velocity
                const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
                if (currentSpeed > this.speed) {
                    const scale = this.speed / currentSpeed
                    velocity.x *= scale
                    velocity.z *= scale
                }
                
                // Rotar el modelo hacia la dirección del objetivo
                if (distance > 0.1) {
                    const angle = Math.atan2(direction.x, direction.z)
                    this.group.rotation.y = angle
                    this.body.quaternion.setFromEuler(0, angle, 0)
                }
                
                // Reproducir animación de caminar
                if (this.animation.actions.walking) {
                    if (!this.animation.actions.walking.isRunning()) {
                        this.animation.actions.walking.play()
                    }
                }
            } else if (distance >= this.chaseDistance) {
                // Si está fuera del rango, reducir velocidad gradualmente
                this.body.velocity.x *= 0.95
                this.body.velocity.z *= 0.95
                
                // Detener animación si la velocidad es muy baja
                const velocity = this.body.velocity
                const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
                if (currentSpeed < 0.5 && this.animation.actions.walking && this.animation.actions.walking.isRunning()) {
                    this.animation.actions.walking.stop()
                }
            }
        }
        
        // Sincronizar posición visual con física
        this.group.position.copy(this.body.position)
    }
    
    checkCollisionWithTarget() {
        if (!this.target || !this.target.body) return false
        
        const enemyPos = this.body.position
        const targetPos = this.target.body.position
        
        const dx = targetPos.x - enemyPos.x
        const dy = targetPos.y - enemyPos.y
        const dz = targetPos.z - enemyPos.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        // Radio de colisión (suma de los radios de las esferas)
        const collisionRadius = 0.4 + 0.4 // Ambos tienen radio 0.4
        const collisionDistance = collisionRadius * 1.5 // Con un margen para detectar colisión
        
        return distance < collisionDistance
    }
    
    remove() {
        // Remover de la escena
        if (this.group && this.group.parent) {
            this.scene.remove(this.group)
        }
        
        // Remover física
        if (this.body && this.physics.world) {
            this.physics.world.removeBody(this.body)
        }
        
        // Limpiar animaciones
        if (this.animation && this.animation.mixer) {
            this.animation.mixer.stopAllAction()
        }
        
        // Limpiar geometrías y materiales
        if (this.model) {
            this.model.traverse((child) => {
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
    }
}

