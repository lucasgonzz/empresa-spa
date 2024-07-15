<template>
	<div>
		<b-pagination
		class="m-0"
		v-if="total_pages > 1"
		pills 
		v-model="currentPage"
		:total-rows="total_results"
		:per-page="per_page"
		:disabled="loading"
		></b-pagination>
	</div>
</template>
<script>
export default {
	props: {
		per_page: Number,
		total_pages: Number,
		total_results: Number,
		current_page: {
			type: Number,
			default: null
		},
		loading: Boolean,
	},
	data() {
		return {
			currentPage: 1,
			se_inicio_nueva_busqueda: false,
		}
	},
	watch: {
		current_page() {
			if (this.current_page == 1) {
				this.se_inicio_nueva_busqueda = true
			}
			this.currentPage = this.current_page
			console.log('cambio current_page prop y se seteo la del pagination en '+this.currentPage)
			setTimeout(() => {
				this.se_inicio_nueva_busqueda = false 
			}, 1000)
		},
		currentPage() {
			console.log('watch de currentPage')
			if (!this.se_inicio_nueva_busqueda) {
				this.$emit('setCurrentPage', this.currentPage)
			} else {
				console.log('No se emitio')
			}
		}
	}
}
</script>