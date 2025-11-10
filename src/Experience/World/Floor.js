import * as CANNON from 'cannon-es'
import * as THREE from 'three'

export default class Floor {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics

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

        this.textures.color = this.resources.items.grassColorTexture
        this.textures.color.colorSpace = THREE.SRGBColorSpace
        this.textures.color.repeat.set(50, 50)
        this.textures.color.wrapS = THREE.RepeatWrapping
        this.textures.color.wrapT = THREE.RepeatWrapping

        this.textures.normal = this.resources.items.grassNormalTexture
        this.textures.normal.repeat.set(50, 50)
        this.textures.normal.wrapS = THREE.RepeatWrapping
        this.textures.normal.wrapT = THREE.RepeatWrapping
    }

    setMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            color: 0x7CB342 // Verde pasto
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
