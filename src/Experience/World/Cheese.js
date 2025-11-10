import * as THREE from 'three'

export default class Cheese {
    constructor({ model, position, scene }) {
        this.scene = scene
        this.collected = false

        // 📌 Crear el pivot (grupo contenedor)
        this.pivot = new THREE.Group()
        this.pivot.position.copy(position)

        // ✅ Clonar el modelo completo
        this.model = model.clone()

        // 🧠 Buscar el primer hijo con geometría
        const visual = this.model.children[0] || this.model

        // 🛠️ Resetear la posición del visual para que herede la del pivot
        visual.position.set(0, 0, 0)
        visual.rotation.set(0, 0, 0)
        visual.scale.set(0.8, 0.8, 0.8) // Escalar el queso para que sea más pequeño

        // Agregar el visual al pivot
        this.pivot.add(visual)

        // ➕ Agregar el pivot (no el modelo) a la escena
        this.scene.add(this.pivot)
    }

    update(delta) {
        if (this.collected) return
        // Rotar el queso lentamente
        this.pivot.rotation.y += delta * 2
        // Hacer que flote ligeramente
        this.pivot.position.y = 0.3 + Math.sin(Date.now() * 0.001 + this.pivot.position.x) * 0.1
    }

    collect() {
        this.collected = true
        this.scene.remove(this.pivot)
    }
}

