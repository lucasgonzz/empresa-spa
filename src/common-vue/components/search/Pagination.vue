<template>
	<div>
		<b-pagination
		class="m-0"
		v-if="mostrar_paginador"
		pills 
		v-model="currentPage"
		:total-rows="total_results"
		:per-page="per_page"
		:disabled="loading"
		></b-pagination>
	</div>
</template>
<script>
import { debe_mostrar_paginador, pagina_inicial_del_paginador } from '@/common-vue/components/search/paginado_del_modal'
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
			// Pagina que marca la pildora. Este componente nace de nuevo en cada apertura del modal
			// (el b-modal destruye su contenido al cerrar), asi que arranca en la pagina que el modal
			// conservo y no siempre en 1.
			currentPage: pagina_inicial_del_paginador(this.current_page),
			se_inicio_nueva_busqueda: false,
		}
	},
	computed: {
		// Hay mas de una pagina de resultados: recien ahi se dibuja el paginador.
		mostrar_paginador() {
			return debe_mostrar_paginador(this.total_results, this.per_page)
		},
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