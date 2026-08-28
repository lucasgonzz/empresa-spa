<template>
	<b-modal
	hide-footer
	size="lg"
	title="Proceso por fila"
	id="chunk-fila-procesos">
		<b-table
		head-variant="dark"
		:fields="fields"
		:items="items">
		</b-table>
	</b-modal>
</template>
<script>
export default {
	props: {
		fila_procesos: []
	},
	data() {
		return {
		}
	},
	computed: {
		fields() {
			return [
				{
					label: 'Nombre',
					key: 'name',
				},
				{
					label: 'Duracion',
					key: 'duration',
				},
			]
		},
		fila_procesos_parseados() {
			/*
				🔴 El guard mira el TIPO, no la veracidad, y ese es todo el arreglo.

				Los dos consumidores (ChunkFila.vue y ArticleImportObservations.vue) inicializan
				la prop en `[]` y recien despues le asignan `chunk.procesos`. Un array vacio es
				TRUTHY, asi que el `if (!this.fila_procesos)` que habia aca lo dejaba pasar, y
				JSON.parse([]) coacciona el array a la cadena vacia y tira SyntaxError. Resultado:
				"Error parseando fila_procesos []" en consola en cada montaje del modulo de
				importacion, sin que nada estuviera roto de verdad.

				Ademas `chunk.procesos` puede llegar ya como array desde el backend: en ese caso
				no hay nada que parsear y forzarlo por JSON.parse volveria a romper.
			*/
			if (Array.isArray(this.fila_procesos)) {
				return this.fila_procesos
			}

			if (typeof this.fila_procesos !== 'string' || this.fila_procesos === '') {
				return []
			}

			try {
				return JSON.parse(this.fila_procesos)
			} catch (e) {
				console.error('Error parseando fila_procesos', this.fila_procesos)
				return []
			}
		},
		items() {
			let items = []
			this.fila_procesos_parseados.forEach(proceso => {
				items.push({
					name: proceso.name,
					duration: proceso.duration,
				})
			})
			return items
		},
	},
	methods: {
		show_procesos(chunk) {
			this.fila_procesos = chunk.procesos
			this.$bvModal.show('chunk-filas-procesos')
		},
	}
}
</script>