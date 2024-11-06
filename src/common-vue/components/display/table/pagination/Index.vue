<template>
	<div
	v-if="total_pages > 1"
	class="j-center align-center m-b-15 m-r-15">

		<span
		class="total-resultados">
			{{ total_results }} resultados
		</span>

		<b-pagination
		class="m-0"
		v-model="current_page"
		:total-rows="total_results"
		:per-page="per_page"
		></b-pagination>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	computed: {
		total_pages() {
			return this.$store.state[this.model_name].total_filter_pages
		},
		total_results() {
			return this.$store.state[this.model_name].total_filter_results
		},
		current_page: {
			get() {
				return this.$store.state[this.model_name].filter_page
			},
			set(value) {
				this.$store.commit(this.model_name+'/setFilterPage', value)
			}
		},
	},
	data() {
		return {
			per_page: 25,
			currentPage: 1,
			se_inicio_nueva_busqueda: false,
		}
	},
	watch: {
		current_page() {	
			this.$emit('filtrar')
			return
			// if (this.current_page == 1) {
			// 	this.se_inicio_nueva_busqueda = true
			// }
			// this.currentPage = this.current_page
			// console.log('cambio current_page prop y se seteo la del pagination en '+this.currentPage)
			// setTimeout(() => {
			// 	this.se_inicio_nueva_busqueda = false 
			// }, 1000)
		},
		currentPage() {
			console.log('watch de currentPage')
			if (!this.se_inicio_nueva_busqueda) {
				this.$emit('setCurrentPage', this.currentPage)
			} else {
				console.log('No se emitio')
			}
		}, 
		filtrar() {
			this.$store.commit(this.model_name+'/incrementFilterPage')
			this.$emit('filtrar')
		}
	}
}
</script>
<style lang="sass">
.total-resultados
	font-size: 18px
	padding-right: 15px
</style>