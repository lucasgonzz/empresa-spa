<template>
	<div
	v-if="show">
		<b-dropdown-divider></b-dropdown-divider>

		<b-dropdown-text class="excel-dropdown-section-title">
			Excel para Clientes
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider>

		<excel-dropdown-option-item
		icon="icon-check"
		@click="exportModels(null)">
			Todas las listas de precio
		</excel-dropdown-option-item>

		<excel-dropdown-option-item
		v-for="price_type in price_types"
		:key="price_type.id"
		icon="icon-right"
		@click="exportModels(price_type)">
			Solo lista {{ price_type.name }}
		</excel-dropdown-option-item>
	</div>
</template>
<script>
export default {
	components: {
		ExcelDropdownOptionItem: () => import('@/common-vue/components/horizontal-nav/ExcelDropdownOptionItem'),
	},
	computed: {
		price_types() {
			return this.$store.state.price_type.models 
		},
		show() {
			return true
			return this.price_types.length
		},
	},
	methods: {
		exportModels(price_type = null) {

			let url = process.env.VUE_APP_API_URL+'/article-clients/excel/export'

			if (price_type) {
				url += '/'+price_type.id
			}
			console.log(url)
			window.open(url)		
		}
	},
}
</script>
<style lang="sass">
.excel-dropdown-section-title
	font-size: 0.85rem
	font-weight: 600
	color: #6c757d
	text-transform: uppercase
	letter-spacing: 0.02em
	padding: 0.25rem 1.5rem
</style>
