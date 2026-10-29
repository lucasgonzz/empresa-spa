<template>
<b-modal
:title="'Proveedores de '+article.name"
hide-footer
size="lg"
id="article-providers">
	<div
	v-if="!loading">
		<p class="text-muted">Cada proveedor conserva su código y su costo de referencia para este artículo.</p>
		<b-table
		v-if="items.length"
		stacked="sm"
		head-variant="dark"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		:fields="fields"
		:items="items"></b-table>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay referencias de proveedores para este artículo
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
					key: 'provider_code',
					label: 'Código del proveedor'
				},
				{
					key: 'amount',
					label: 'Última cantidad comprada'
				},
				{
					key: 'cost',
					label: 'Costo de referencia'
				},
				{
					key: 'price',
					label: 'Precio Final'
				},
				{
					key: 'updated_at',
					label: 'Fecha'
				},
			]
		},
		items() {
			let items = []
			if (this.article && this.article.providers) {
				this.article.providers.forEach(provider => {
					items.push({
						provider: provider.name,
						provider_code: provider.pivot.provider_code,
						amount: provider.pivot.amount,
						cost: this.price(provider.pivot.cost),
						price: this.price(provider.pivot.price),
						updated_at: this.date(provider.pivot.updated_at, true),
					})
				})
			}
			return items 
		}
	},
	// created() {
	// 	this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
	// 		if (modal_id == 'providers-history') {
	// 			this.getProvidersHistory() 
	// 		}
	// 	})
	// },
	methods: {
		// getProvidersHistory() {
		// 	this.loading = true 
		// 	this.$api.get('article/providers-history/'+this.article.id)
		// 	.then(res => {
		// 		this.loading = false 
		// 		this.model = res.data.model 
		// 	})
		// 	.catch(err => {
		// 		this.loading = false 
		// 	})
		// }
	}
}
</script>
<style lang="sass">
#article-providers
	.table > tbody > tr,
	.table th,
	.table td
		white-space: normal
		overflow-wrap: anywhere

@media (max-width: 575.98px)
	#article-providers .table.b-table.b-table-stacked-sm > tbody > tr > [data-label]
		// El reparto 40/60 de Bootstrap hereda el nowrap global y superpone etiquetas largas.
		// En teléfono cada etiqueta ocupa su propia línea y el valor usa el ancho completo.
		&::before
			display: block
			float: none
			width: 100%
			padding: 0
			margin-bottom: 4px
			text-align: left
			white-space: normal
			overflow-wrap: anywhere
			color: var(--color-text-secondary)
			font-size: 0.75rem

		> div
			display: block
			width: 100%
			padding: 0
			white-space: normal
			overflow-wrap: anywhere
</style>
