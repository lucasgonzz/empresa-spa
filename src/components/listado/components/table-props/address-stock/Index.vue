<template>
	<div>
		<edit-address-stock
		v-if="se_quiere_editar_stock"
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
export default {
	components: {
		EditAddressStock: () => import('@/components/listado/components/table-props/address-stock/EditAddressStock'),
	},
	mixins: [
		payment_method_discounts_addresses_columns,
	],
	props: {
		article: Object,
		address: Object,
	},
	computed: {
		se_quiere_editar_stock() {
			return this.article_to_edit_address && this.article_to_edit_address.id == this.article.id
		},
		article_to_edit_address() {
			return this.$store.state.article.edit_addresses_stock.article 
		},
	}
}
</script>