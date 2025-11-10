import * as THREE from 'three'

export default class Portal {
    constructor({ position, scene }) {
        this.scene = scene
        this.position = position
        this.isActive = false
        this.time = 0

        // Crear grupo para el portal
        this.group = new THREE.Group()
        // Asegurar que el portal esté en el suelo (Y = 0)
        this.group.position.set(position.x, 0, position.z)

        // Crear el portal completo desde cero con Three.js
        this.createPortalStructure()
        
        // Agregar efectos visuales
        this.addEffects()
        
        // Crear partículas que salen del portal
        this.createPortalParticles()

        // Inicialmente oculto
        this.group.visible = false
        this.scene.add(this.group)
    }

    createPortalStructure() {
        const portalRadius = 3
        const portalHeight = 5
        
        // 1. Marco exterior del portal (anillo grande)
        const outerRingGeometry = new THREE.TorusGeometry(portalRadius, 0.4, 16, 64)
        const outerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8,
            metalness: 0.9,
            roughness: 0.1
        })
        const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial)
        outerRing.rotation.x = Math.PI / 2
        outerRing.position.y = portalHeight / 2
        this.group.add(outerRing)
        this.outerRing = outerRing

        // 2. Marco interior del portal (anillo más pequeño)
        const innerRingGeometry = new THREE.TorusGeometry(portalRadius * 0.85, 0.3, 16, 64)
        const innerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.6,
            metalness: 0.9,
            roughness: 0.1
        })
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial)
        innerRing.rotation.x = Math.PI / 2
        innerRing.position.y = portalHeight / 2
        this.group.add(innerRing)
        this.innerRing = innerRing

        // 3. Pilares verticales del portal (4 pilares)
        const pillarHeight = portalHeight
        const pillarWidth = 0.3
        const pillarDepth = 0.3
        const pillarGeometry = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth)
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.7,
            metalness: 0.8,
            roughness: 0.2
        })

        const pillarPositions = [
            { x: portalRadius, y: portalHeight / 2, z: 0 },
            { x: -portalRadius, y: portalHeight / 2, z: 0 },
            { x: 0, y: portalHeight / 2, z: portalRadius },
            { x: 0, y: portalHeight / 2, z: -portalRadius }
        ]

        this.pillars = []
        pillarPositions.forEach(pos => {
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone())
            pillar.position.set(pos.x, pos.y, pos.z)
            this.group.add(pillar)
            this.pillars.push(pillar)
        })

        // 4. Plano central del portal (vórtice)
        const portalPlaneGeometry = new THREE.CircleGeometry(portalRadius * 0.8, 64)
        const portalPlaneMaterial = new THREE.MeshStandardMaterial({
            color: 0x0080ff,
            emissive: 0x0080ff,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            metalness: 0.5,
            roughness: 0.3
        })
        const portalPlane = new THREE.Mesh(portalPlaneGeometry, portalPlaneMaterial)
        portalPlane.rotation.x = Math.PI / 2
        portalPlane.position.y = portalHeight / 2 + 0.1
        this.group.add(portalPlane)
        this.portalPlane = portalPlane

        // 5. Base del portal (anillo en el suelo)
        const baseRingGeometry = new THREE.TorusGeometry(portalRadius + 0.5, 0.2, 16, 64)
        const baseRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.6,
            metalness: 0.7,
            roughness: 0.2
        })
        const baseRing = new THREE.Mesh(baseRingGeometry, baseRingMaterial)
        baseRing.rotation.x = Math.PI / 2
        baseRing.position.y = 0.05
        this.group.add(baseRing)
        this.baseRing = baseRing

        // 6. Partículas giratorias alrededor del portal (anillo de partículas)
        this.createOrbitingParticles()
    }

    createOrbitingParticles() {
        const particleCount = 50
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)
        
        const color1 = new THREE.Color(0x00ffff)
        const color2 = new THREE.Color(0x0080ff)
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3
            const angle = (i / particleCount) * Math.PI * 2
            const radius = 3.2
            const height = 2 + Math.sin(i) * 1.5
            
            positions[i3] = Math.cos(angle) * radius
            positions[i3 + 1] = height
            positions[i3 + 2] = Math.sin(angle) * radius
            
            const color = i % 2 === 0 ? color1 : color2
            colors[i3] = color.r
            colors[i3 + 1] = color.g
            colors[i3 + 2] = color.b
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        })
        
        this.orbitingParticles = new THREE.Points(geometry, material)
        this.group.add(this.orbitingParticles)
    }

    addEffects() {
        // Luz principal del portal (más intensa)
        const mainLight = new THREE.PointLight(0x00ffff, 8, 25)
        mainLight.position.set(0, 2.5, 0)
        this.group.add(mainLight)
        this.mainLight = mainLight

        // Luz adicional para efecto de resplandor
        const glowLight = new THREE.PointLight(0x0080ff, 5, 20)
        glowLight.position.set(0, 2, 0)
        this.group.add(glowLight)
        this.glowLight = glowLight

        // Luz direccional desde arriba
        const topLight = new THREE.SpotLight(0x00ffff, 3, 15, Math.PI / 4, 0.5)
        topLight.position.set(0, 6, 0)
        topLight.target.position.set(0, 0, 0)
        this.group.add(topLight)
        this.group.add(topLight.target)
        this.topLight = topLight

        // Anillo de brillo en el suelo
        const floorGlowGeometry = new THREE.RingGeometry(2.5, 4, 64)
        const floorGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        })
        const floorGlow = new THREE.Mesh(floorGlowGeometry, floorGlowMaterial)
        floorGlow.rotation.x = -Math.PI / 2
        floorGlow.position.y = 0.01
        this.group.add(floorGlow)
        this.floorGlow = floorGlow

        // Anillo vertical giratorio adicional
        const verticalGlowGeometry = new THREE.TorusGeometry(3.2, 0.2, 16, 64)
        const verticalGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        })
        const verticalGlow = new THREE.Mesh(verticalGlowGeometry, verticalGlowMaterial)
        verticalGlow.position.y = 2.5
        this.group.add(verticalGlow)
        this.verticalGlow = verticalGlow
    }

    createPortalParticles() {
        const particleCount = 300
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)
        
        // Colores místicos (cian, azul, púrpura)
        const color1 = new THREE.Color(0x00ffff)
        const color2 = new THREE.Color(0x0080ff)
        const color3 = new THREE.Color(0x8000ff)

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3
            
            // Partículas que salen del portal en todas las direcciones
            const radius = Math.random() * 0.8
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            
            positions[i3] = Math.sin(phi) * Math.cos(theta) * radius
            positions[i3 + 1] = Math.cos(phi) * radius + 2.5 // Empezar desde el centro del portal
            positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
            
            // Colores aleatorios entre los tres colores místicos
            const colorChoice = Math.random()
            let color
            if (colorChoice < 0.33) {
                color = color1
            } else if (colorChoice < 0.66) {
                color = color2
            } else {
                color = color3
            }
            
            colors[i3] = color.r
            colors[i3 + 1] = color.g
            colors[i3 + 2] = color.b
            
            // Tamaños variados
            sizes[i] = 0.4 + Math.random() * 0.8
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
        
        const material = new THREE.PointsMaterial({
            size: 0.6,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        })
        
        this.particles = new THREE.Points(geometry, material)
        this.particles.position.y = 0
        this.group.add(this.particles)
    }

    activate() {
        this.isActive = true
        this.group.visible = true
        console.log('🌀 Portal activado en:', this.group.position)
    }

    update(delta) {
        if (!this.isActive) return
        
        this.time += delta
        
        // Rotar el portal completo lentamente
        this.group.rotation.y += delta * 0.2
        
        // Rotar anillos
        if (this.outerRing) {
            this.outerRing.rotation.z += delta * 0.3
        }
        if (this.innerRing) {
            this.innerRing.rotation.z -= delta * 0.2
        }
        if (this.verticalGlow) {
            this.verticalGlow.rotation.y += delta * 0.5
            this.verticalGlow.rotation.x = Math.sin(this.time) * 0.1
        }
        
        // Rotar partículas orbitantes
        if (this.orbitingParticles) {
            this.orbitingParticles.rotation.y += delta * 0.4
            const positions = this.orbitingParticles.geometry.attributes.position.array
            const particleCount = positions.length / 3
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3
                // Hacer que las partículas suban y bajen
                positions[i3 + 1] = 2 + Math.sin(this.time * 2 + i) * 1.5
            }
            this.orbitingParticles.geometry.attributes.position.needsUpdate = true
        }
        
        // Hacer que el brillo del suelo pulse
        if (this.floorGlow) {
            this.floorGlow.material.opacity = 0.5 + Math.sin(this.time * 2) * 0.3
            this.floorGlow.rotation.z += delta * 0.1
        }
        
        // Hacer que el plano del portal pulse y rote
        if (this.portalPlane) {
            this.portalPlane.material.opacity = 0.7 + Math.sin(this.time * 3) * 0.2
            this.portalPlane.rotation.z += delta * 0.3
        }
        
        // Hacer que las luces pulsen
        if (this.mainLight) {
            this.mainLight.intensity = 6 + Math.sin(this.time * 2) * 2
        }
        if (this.glowLight) {
            this.glowLight.intensity = 4 + Math.sin(this.time * 2.5) * 1.5
        }
        if (this.topLight) {
            this.topLight.intensity = 2 + Math.sin(this.time * 1.5) * 1
        }
        
        // Animar partículas que salen del portal
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array
            const particleCount = positions.length / 3
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3
                
                // Mover partículas hacia afuera desde el centro del portal
                const currentPos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2])
                const distance = currentPos.length()
                
                // Si la partícula está muy lejos, resetearla al centro
                if (distance > 12) {
                    const radius = Math.random() * 0.8
                    const theta = Math.random() * Math.PI * 2
                    const phi = Math.random() * Math.PI
                    
                    positions[i3] = Math.sin(phi) * Math.cos(theta) * radius
                    positions[i3 + 1] = Math.cos(phi) * radius + 2.5
                    positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
                } else {
                    // Mover partícula hacia afuera
                    const direction = currentPos.clone().normalize()
                    const speed = 0.08 + Math.random() * 0.08
                    
                    positions[i3] += direction.x * speed
                    positions[i3 + 1] += direction.y * speed + 0.03 // Ligeramente hacia arriba
                    positions[i3 + 2] += direction.z * speed
                }
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true
        }
    }
}
