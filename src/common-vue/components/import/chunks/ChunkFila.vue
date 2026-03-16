<template>
	<div>
		<fila-procesos
		:fila_procesos="fila_procesos"></fila-procesos>

		<b-modal
		hide-footer
		size="lg"
		title="Filas"
		id="chunk-filas">
			<b-table
			head-variant="dark"
			:fields="fields"
			:items="items">
				
				<template #cell(procesos)="data">
					<b-button
					@click="show_procesos(chunk_for_filas[data.index])">
					 	Procesos
					</b-button>
				</template>
			</b-table>
		</b-modal>
	</div>
</template>
<script>
export default {
	props: {
		chunk_for_filas: []
	},
	components: {
		FilaProcesos: () => import('@/common-vue/components/import/chunks/FilaProcesos'),
	},
	data() {
		return {
			fila_procesos: [],
		}
	},
	computed: {
		fields() {
			return [
				{
					label: 'Fila',
					key: 'fila',
				},
				{
					label: 'Duracion',
					key: 'duration',
				},
				{
					label: 'procesos',
					key: 'procesos',
				},
			]
		},
		items() {
			let items = []
			if (this.chunk_for_filas) {
				this.chunk_for_filas.forEach(chunk_fila => {
					items.push({
						fila: chunk_fila.fila,
						duration: chunk_fila.duration,
					})
				})
			}
			return items
		},
	},
	methods: {
		show_procesos(chunk) {
			this.fila_procesos = chunk.procesos
			this.$bvModal.show('chunk-fila-procesos')
		},
	}
}
</script>