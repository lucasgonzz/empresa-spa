<template>
	<div
	class="p-t-15">
		<b-alert
		class="s-2 m-b-15"
		:show="loading">
			<slot></slot>
			<span
			v-if="value < 100">
				Descargando {{ plural(model_name) }}, aguarde por favor
			</span>
			<span
			v-else>
				Organizando {{ plural(model_name) }}
			</span>
			<b-progress 
			class="m-t-15 progress-vender"
			:value="value" 
			variant="primary" 
			show-progress
			striped 
			animated></b-progress>
		</b-alert>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	computed: {
		use_per_page() {
			return typeof this.$store.state[this.model_name].use_per_page != 'undefined' && this.$store.state[this.model_name].use_per_page
		},
		loading() {
			return this.use_per_page && this.$store.state[this.model_name].loading
		},
		total_pages() {
			return this.$store.state[this.model_name].total_pages
		},
		page() {
			return this.$store.state[this.model_name].page
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