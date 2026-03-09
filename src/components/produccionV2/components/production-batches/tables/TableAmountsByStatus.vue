<template>
	<div>
		<p 
		v-if="!production_batch.id"
		class="text-with-icon">
			<i class="icon-check"></i>
			Cree el lote de produccion para poder ver las cantidades en cada estado
		</p>
		<div
		v-else>
			<p 
			v-if="!tiene_items"
			class="text-with-icon">
				<i class="icon-check"></i>
				Aun no se han creado movimientos de produccion
			</p>

			<div
			v-else>
				
				<b-table
				head-variant="dark"
				:fields="fields"
				:items="items">
				</b-table>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		production_batch() {
			return this.$store.state.production_batch.model 
		},
		fields() {
			return [
				{
					label: 'Estado',
					key: 'status',
				},
				{
					label: 'Cantidad actual',
					key: 'current_amount',
				},
				{
					label: 'Total Entrantes',
					key: 'total_in',
				},
				{
					label: 'Total salientes',
					key: 'total_out',
				},
			]
		},
		items() {
			let items = []

			if (this.tiene_items) {

				this.production_batch.amounts_by_status.forEach(input => {
					let status = this.$store.state.order_production_status.models.find(s => s.id == input.order_production_status_id)
					items.push({
						status: typeof status != 'undefined' ? status.name : '',
						current_amount: input.current_amount,
						total_in: input.total_in,
						total_out: input.total_out,
					})
				})
			}

			return items
		},
		tiene_items(){
			return this.production_batch && this.production_batch.amounts_by_status && this.production_batch.amounts_by_status.length
		}
	},
}
</script>