<template>
	<b-alert
	:show="loading">
		Espere a que terminen de descargarse los articulos para el correcto funcionamiento de esta seccion.
		<b-progress 
		class="m-t-15 progress-vender"
		:value="value" 
		variant="success" 
		show-progress
		striped 
		animated></b-progress>
	</b-alert>
</template>
<script>
export default {
	computed: {
		loading() {
			return this.$store.state.article.loading
		},
		total_pages() {
			return this.$store.state.article.total_pages
		},
		page() {
			return this.$store.state.article.page
		},
		value() {
			return this.page * 100 / this.total_pages 
		}
	},
}
</script>
<style lang="sass">
.progress-vender
	max-width: 700px
	margin: auto
</style>