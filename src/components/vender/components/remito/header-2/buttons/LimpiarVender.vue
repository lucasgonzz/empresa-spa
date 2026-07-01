<template>
	<div>
		<b-button
		class="m-l-10"
		:class="{ 'vender-actions-bar__btn': in_actions_bar }"
		v-if="items.length && can('vender.limpiar_venta')"
		:variant="in_actions_bar ? 'outline-secondary' : 'outline-danger'"
		@click="call_limpiar_vender">
			<i class="icon-undo"></i>
			Limpiar
		</b-button>
	</div>
</template>

<script>
import vender from '@/mixins/vender/limpiar_vender'
export default {
	mixins: [vender],
	props: {
		/**
		 * Indica si el botón se renderiza en la barra inferior fija de Vender.
		 * Ajusta variante visual para el diseño moderno del footer.
		 */
		in_actions_bar: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Pide confirmación y reinicia la venta en curso.
		 *
		 * @returns {void}
		 */
		call_limpiar_vender() {
			if (confirm('¿Seguro que quiere reiniciar esta venta?')) {
				this.limpiar_vender()
			}
		},
	},
	computed: {
		/**
		 * Artículos del remito actual.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.$store.state.vender.items
		},
	},
}
</script>
