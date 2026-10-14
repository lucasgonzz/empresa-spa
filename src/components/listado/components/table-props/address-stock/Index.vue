<template>
	<div>
		<edit-address-stock
		v-if="se_quiere_editar_stock && puede_editar_stock"
		:article="article"
		:address="address"></edit-address-stock>

		<span
		v-else>
			{{ get_address_stock(article, address) }}
		</span>
	</div>
</template>
<script>
import payment_method_discounts_addresses_columns from '@/mixins/listado/payment_method_discounts_addresses_columns'
import permiso_stock_por_sucursal from '@/mixins/listado/permiso_stock_por_sucursal'
export default {
	components: {
		EditAddressStock: () => import('@/components/listado/components/table-props/address-stock/EditAddressStock'),
	},
	mixins: [
		payment_method_discounts_addresses_columns,
		permiso_stock_por_sucursal,
	],
	props: {
		article: Object,
		address: Object,
	},
	computed: {
		puede_editar_stock() {
			// La regla vive en el mixin: la usa también el botón de guardar para armar el payload.
			return this.puede_editar_stock_de_sucursal(this.address.id)
		},
		se_quiere_editar_stock() {
			return this.article_to_edit_address && this.article_to_edit_address.id == this.article.id
		},
		article_to_edit_address() {
			return this.$store.state.article.edit_addresses_stock.article
		},
	}
}
</script>
