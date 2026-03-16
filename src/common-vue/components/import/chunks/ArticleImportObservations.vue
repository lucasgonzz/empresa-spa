<template>
	<b-modal
	hide-footer
	size="lg"
	title="Procesamiento de importacion"
	id="article-import-observations">
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
		article_import_observations: String,
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
		article_import_observations_parseados() {
			if (!this.article_import_observations) {
				return null
			}

			try {
				return JSON.parse(this.article_import_observations)
			} catch (e) {
				console.error('Error parseando article_import_observations', this.article_import_observations)
				return null
			}
		},
		items() {
			let items = []

			if (
				this.article_import_observations_parseados
				&& this.article_import_observations_parseados.procesos
			) {

				this.article_import_observations_parseados.procesos.forEach(proceso => {
					items.push({
						name: proceso.name,
						duration: proceso.duration,
					})
				})
			}
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