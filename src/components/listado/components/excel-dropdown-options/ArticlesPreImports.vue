<template>
	<b-dropdown-item
	v-if="show"
	@click="getPreImports">
		<i class="icon-download"></i>
		Pre Importaciones
	</b-dropdown-item>
</template>
<script>
export default {
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