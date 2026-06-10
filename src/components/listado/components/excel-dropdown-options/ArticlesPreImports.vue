<template>
	<div
	v-if="show">
		<b-dropdown-divider></b-dropdown-divider>
		<excel-dropdown-option-item
		icon="icon-eye"
		@click="getPreImports">
			Pre Importaciones
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
			return this.hasExtencion('articles_pre_import')
		},
	},
	methods: {
		getPreImports() {
			this.$store.dispatch('articles_pre_import/getModels')
			this.$bvModal.show('articles-pre-import-modal')	
		}
	},
}
</script>
