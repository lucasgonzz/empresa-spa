<template>
	<b-button
	class="m-r-15"
	v-if="articles.length"
	@click="marcar_todo"
	variant="success">
		<i class="icon-check"></i>
		Marcar todo como devuelto
	</b-button>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [set_total, limpiar],
	computed: {
		articles() {
			return this.$store.state.devoluciones.articles
		},
	},
	methods: {
		marcar_todo() {
			this.articles.forEach(article => {
				console.log(article.name)
				article.returned_amount = article.amount
				
				let faltantes = article.amount
				if (article.ya_devueltas) {
					faltantes -= Number(article.ya_devueltas)
				}
				console.log(faltantes)
				if (faltantes > 0) {

					article.unidades_devueltas = faltantes
				}
			})

			this.set_total_devolucion()
		}
	}
}
</script>