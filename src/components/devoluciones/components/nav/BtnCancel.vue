<template>
	<b-button
	v-if="items.length"
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
		items() {
			return this.$store.state.devoluciones.items
		},
	},
}
</script>