<template>
	<div>
		<draggable 
		v-if="local_client_positions.length"
		v-model="local_client_positions" @end="updatePositions">
			<div 
			class="card p-10 m-b-10 j-start s-1 c-p"
			v-for="(item, index) in local_client_positions" :key="item.id">
				<span>
					N° {{ item.position }}
				</span>
				<span>
					<i class="icon-user"></i>
					{{ item.client.name }}
				</span> 
			</div>
		</draggable>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay clientes
		</p>
	</div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
	components: {
		draggable
	},
	data() {
		return {
			local_client_positions: [] // copia local editable
		}
	},
	computed: {
		road_map() {
			return this.$store.state.road_map.model
		}
	},
	watch: {
		'road_map.client_positions': {
			handler(newVal) {
				if (Array.isArray(newVal)) {
					// Clonamos el array de objetos (deep clone seguro)
					this.local_client_positions = newVal.map(obj => ({ ...obj }))
				} else {
					this.local_client_positions = []
				}
				// this.local_client_positions = JSON.parse(JSON.stringify(newVal)) // deep clone
			},
			immediate: true
		}
	},
	methods: {
		updatePositions() {
			this.local_client_positions.forEach((item, index) => {
				item.position = index + 1
			})
			this.$set(this.road_map, 'client_positions', this.local_client_positions)
		},
		guardarOrden() {
			this.updatePositions()

			// Guardás la copia ordenada en Vuex (opcional)
			this.$store.commit('road_map/setModel', {
				model: {
					...this.road_map,
					client_positions: this.local_client_positions
				},
				properties: []
			})

			// Llamada al backend
			this.$http.post('/api/modelos/reordenar', {
				client_positions: this.local_client_positions
			})
			.then(() => {
				alert('Orden guardado correctamente')
			})
			.catch(error => {
				console.error(error)
				alert('Error al guardar el orden')
			})
		}
	}
}
</script>
