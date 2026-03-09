<template>
	<div>
		<p 
		v-if="!production_batch.id"
		class="text-with-icon">
			<i class="icon-check"></i>
			Cree el lote de produccion para poder ver las cantidades en cada proveedor
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
					label: 'Proveedor',
					key: 'provider_name',
				},
				{
					label: 'Cantidad actual',
					key: 'current_amount',
				},
				{
					label: 'Total enviadas',
					key: 'total_sent',
				},
				{
					label: 'Total recibidas',
					key: 'total_received',
				},
			]
		},
		items() {
			let items = []

			if (this.tiene_items) {

				this.production_batch.amounts_by_provider.forEach(input => {
					items.push({
						provider_name: input.provider_name,
						current_amount: input.current_amount,
						total_sent: input.total_sent,
						total_received: input.total_received,
					})
				})
			}

			return items
		},
		tiene_items(){
			return this.production_batch && this.production_batch.amounts_by_provider && this.production_batch.amounts_by_provider.length
		}
	},
}
</script>