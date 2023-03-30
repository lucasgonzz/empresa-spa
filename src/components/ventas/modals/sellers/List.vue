<template>
	<div>
		<b-table
		v-if="sellers.length"
		head-variant="dark" 
		:items="items"
		:fields="fields"></b-table>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-not"></i>
			No hay vendedores registrados
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{ key: 'name', label: 'Nombre', class: 'text-center' },
				{ key: 'surname', label: 'Apellido', class: 'text-center' },
				{ key: 'commission', label: 'Comision', class: 'text-center' },
			]
		},
		items() {
			let items = []
			this.sellers.forEach(seller => {
				items.push({
					name: seller.name,
					surname: seller.surname,
					commission: seller.commission,
				})
			})
			return items
		},
		sellers() {
			return this.$store.state.sellers.models
		}
	}
}
</script>