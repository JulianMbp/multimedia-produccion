import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export default class Floor {
    constructor(experience, initialLevel = 1) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics
        this.currentLevel = initialLevel

        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
        this.setPhysics()
    }

    setGeometry() {
        // Suelo grande y fijo que cubre todo el área
        this.size = { width: 1000, height: 3, depth: 1000 }
        this.geometry = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        )
    }

    setTextures() {
        this.textures = {}
        this.updateTextureForLevel(this.currentLevel)
    }

    updateTextureForLevel(level) {
        this.currentLevel = level
        
        // Seleccionar textura según el nivel
        let textureName
        switch(level) {
            case 1:
                textureName = 'viaTexture'
                break
            case 2:
                textureName = 'cerpedTexture'
                break
            case 3:
                textureName = 'pokemonTexture'
                break
            default:
                textureName = 'viaTexture' // Por defecto nivel 1
        }

        // Obtener la textura del recurso
        const texture = this.resources.items[textureName]
        
        if (!texture) {
            console.warn(`⚠️ Textura ${textureName} no encontrada, usando textura por defecto`)
            // Fallback a textura de pasto si no existe
            this.textures.color = this.resources.items.grassColorTexture || null
        } else {
            this.textures.color = texture
        }

        if (this.textures.color) {
            this.textures.color.colorSpace = THREE.SRGBColorSpace
            // Ajustar repetición según el nivel (puedes ajustar estos valores)
            const repeatValue = level === 1 ? 50 : (level === 2 ? 30 : 40)
            this.textures.color.repeat.set(repeatValue, repeatValue)
            this.textures.color.wrapS = THREE.RepeatWrapping
            this.textures.color.wrapT = THREE.RepeatWrapping

            // Actualizar el material si ya existe
            if (this.material) {
                this.material.map = this.textures.color
                this.material.needsUpdate = true
            }
        }

        // Mantener la textura normal (opcional, puedes cambiarla también)
        if (this.resources.items.grassNormalTexture) {
            this.textures.normal = this.resources.items.grassNormalTexture
            this.textures.normal.repeat.set(50, 50)
            this.textures.normal.wrapS = THREE.RepeatWrapping
            this.textures.normal.wrapT = THREE.RepeatWrapping
            
            if (this.material) {
                this.material.normalMap = this.textures.normal
                this.material.needsUpdate = true
            }
        }
    }

    setMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            map: this.textures.color || null,
            normalMap: this.textures.normal || null,
            color: 0xffffff // Color blanco para que la textura se vea correctamente
        })
    }

    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        // Posicionar el suelo para que su superficie superior esté en Y = 0
        this.mesh.position.set(0, -this.size.height / 2, 0) 
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    setPhysics() {
        const shape = new CANNON.Box(new CANNON.Vec3(
            this.size.width / 2,
            this.size.height / 2,
            this.size.depth / 2
        ))

        this.body = new CANNON.Body({
            mass: 0, // Estático
            shape: shape,
            // La superficie superior del suelo está en Y = 0
            position: new CANNON.Vec3(0, -this.size.height / 2, 0)
        })

        this.physics.world.addBody(this.body)
    }
}
