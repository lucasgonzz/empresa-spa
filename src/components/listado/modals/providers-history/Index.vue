<template>
<b-modal
:title="'Historial de Proveedores y Stock de '+article.name"
hide-footer
size="lg"
id="providers-history">
	<div
	v-if="!loading">
		<b-table
		v-if="items.length"
		head-variant="dark"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		:fields="fields"
		:items="items"></b-table>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay historial de proveedores para este articulo
		</p>
	</div>
	<b-skeleton-table
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	v-else
	:rows="5" 
	:columns="4"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	data() {
		return {
			loading: false,
			model: null,
		}
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		fields() {
			return [
				{
					key: 'provider',
					label: 'Proveedor'
				},
				{
					key: 'amount',
					label: 'Cantidad'
				},
				{
					key: 'cost',
					label: 'Costo'
				},
				{
					key: 'price',
					label: 'Precio Final'
				},
				{
					key: 'created_at',
					label: 'Fecha'
				},
			]
		},
		items() {
			let items = []
			if (this.model) {
				this.model.providers.forEach(provider => {
					items.push({
						provider: provider.name,
						amount: provider.pivot.amount,
						cost: this.price(provider.pivot.cost),
						price: this.price(provider.pivot.price),
						created_at: this.date(provider.pivot.created_at),
					})
				})
			}
			return items 
		}
	},
	created() {
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			if (modal_id == 'providers-history') {
				this.getProvidersHistory() 
			}
		})
	},
	methods: {
		getProvidersHistory() {
			this.loading = true 
			this.$api.get('article/providers-history/'+this.article.id)
			.then(res => {
				this.loading = false 
				this.model = res.data.model 
			})
			.catch(err => {
				this.loading = false 
			})
		}
	}
}
</script>