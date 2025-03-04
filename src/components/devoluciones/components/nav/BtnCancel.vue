<template>
	<b-button
	v-if="articles.length"
	@click="limpiar_devolucion"
	variant="danger">
		<i class="icon-cancel"></i>
		Cancelar
	</b-button>
</template>
<script>
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	computed: {
		articles() {
			return this.$store.state.devoluciones.articles
		},
	},
}
</script>