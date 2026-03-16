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
			if (!this.fila_procesos) {
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