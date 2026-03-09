<template>
	<div>
		<p 
		v-if="!production_batch_movement.id"
		class="text-with-icon">
			<i class="icon-check"></i>
			Cree el movimiento para poder editar los insumos utilizados
		</p>
		<div
		v-else>
			<p 
			v-if="!tiene_items"
			class="text-with-icon">
				<i class="icon-check"></i>
				No se utilizaron insumos en este movimiento
			</p>

			<div
			v-else>
				
				<b-table
				head-variant="dark"
				:fields="fields"
				:items="items">

					<template #cell(actual_amount)="data">
						<b-form-input
						v-model="items[data.index].actual_amount"></b-form-input>
					</template>
				</b-table>

				<b-button
				@click="update"
				variant="outline-primary">
					Actualizar insumos
				</b-button>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		production_batch_movement() {
			return this.$store.state.production_batch_movement.model 
		},
		fields() {
			return [
				{
					label: 'Articulo',
					key: 'article',
				},
				{
					label: 'Cantidad Planificada',
					key: 'planned_amount',
				},
				{
					label: 'Cantidad Real',
					key: 'actual_amount',
				},
				{
					label: 'Deposito',
					key: 'address',
				},
			]
		},
		items() {
			let items = []

			if (this.tiene_items) {

				this.production_batch_movement.inputs.forEach(input => {
					items.push({
						id: input.id,
						address_id: input.address_id,
						article: input.article.name,
						planned_amount: input.planned_amount,
						actual_amount: input.actual_amount,
						address: input.address.street,
					})
				})
			}

			return items
		},
		tiene_items(){
			return this.production_batch_movement && this.production_batch_movement.inputs && this.production_batch_movement.inputs.length
		}
	},
	methods: {
		update() {
			this.$store.commit('auth/setMessage', 'Actualizando')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('production-batch-movement/inputs/'+this.production_batch_movement.id, {
				inputs: this.items
			})
			.then(res => {
				this.setModel(res.data.production_batch, 'production_batch')
				this.$bvModal.hide('production_batch_movement')
				this.$bvModal.hide('production_batch')
				
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Actualizado')


			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al actualizar')
				console.log(err)
			})
		}
	}
}
</script>