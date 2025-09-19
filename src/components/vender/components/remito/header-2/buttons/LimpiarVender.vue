<template>
	<div>
		<b-button
		class="m-l-10"
		v-if="items.length"
		variant="outline-danger"
		@click="call_limpiar_vender">
			<i class="icon-undo"></i>
			Limpiar
		</b-button>
	</div>
</template>

<script>
import limpiar_vender from '@/mixins/vender/limpiar_vender'
export default {
	mixins: [limpiar_vender],
	methods: {
		call_limpiar_vender() {
			if (confirm('¿Seguro que quiere reiniciar esta venta?')) {
				this.limpiar_vender()
			}
		}
	},
	computed: {
		items() {
			return this.$store.state.vender.items
		}
	}
}
</script>
