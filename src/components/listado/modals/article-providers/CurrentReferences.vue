<template>
<div>
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
</div>
</template>
<script>
/**
 * Pestaña "Proveedores" del modal de proveedores del artículo: la tabla de hoy, con el código y el
 * costo de referencia que conserva cada proveedor (estado actual, no historia). Lee el artículo del
 * store; el orquestador (Index.vue) sólo la monta.
 */
export default {
	data() {
		return {
			// Estado de carga de la tabla (hoy siempre apagado: el artículo ya trae sus proveedores).
			loading: false,
		}
	},
	computed: {
		// Artículo abierto en el modal.
		article() {
			return this.$store.state.article.model 
		},
		// Columnas de la tabla.
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
		// Una fila por proveedor del artículo, con el pivot formateado.
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
}
</script>
