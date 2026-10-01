<template>
	<!--
		N° de venta o de compra según el modo. Se busca con Enter (como siempre) o con la lupa, que
		hace falta en un teléfono: muchos teclados en pantalla no tienen un Enter a mano.

		🔴 `data-testid="devolucion-num-venta"` va en el <input> mismo: el spec
		circuito-devolucion-afip.spec.js lo llena con fill() y le aprieta Enter. Y la búsqueda de
		venta sigue pegándole a devoluciones/search-sale/ (el spec espera esa respuesta).
	-->
	<div class="dev-num">
		<label
		class="dev-label"
		:for="input_id">
			{{ es_compra ? 'N° de compra' : 'N° de venta' }}
		</label>

		<div class="dev-num__campo">
			<input
			type="text"
			inputmode="numeric"
			autocomplete="off"
			class="form-control dev-num__input"
			:id="input_id"
			:data-testid="es_compra ? 'devolucion-compra-num' : 'devolucion-num-venta'"
			:disabled="deshabilitado"
			:placeholder="es_compra ? 'Ej: 340' : 'Ej: 1520'"
			@keyup.enter="buscar"
			v-model="numero">

			<b-button
			class="dev-num__buscar"
			variant="link"
			:data-testid="es_compra ? 'devolucion-compra-btn-buscar' : 'devolucion-btn-buscar-venta'"
			:disabled="deshabilitado"
			:title="es_compra ? 'Buscar la compra' : 'Buscar la venta'"
			@click="buscar">
				<i class="bi bi-search"></i>
			</b-button>
		</div>
	</div>
</template>
<script>
import set_from_sale from '@/mixins/devoluciones/set_from_sale'
import set_from_provider_order from '@/mixins/devoluciones/set_from_provider_order'
export default {
	mixins: [set_from_sale, set_from_provider_order],
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * Id del input. El de venta (`sale-num`) es el de siempre.
		 *
		 * @returns {String}
		 */
		input_id() {
			return this.es_compra ? 'provider-order-num' : 'sale-num'
		},
		/**
		 * El número del modo actual, leído y escrito en el store.
		 */
		numero: {
			get() {
				if (this.es_compra) {
					return this.$store.state.devoluciones.num_provider_order
				}
				return this.$store.state.devoluciones.num_sale
			},
			set(value) {
				if (this.es_compra) {
					this.$store.commit('devoluciones/set_num_provider_order', value)
				} else {
					this.$store.commit('devoluciones/set_num_sale', value)
				}
			},
		},
		/**
		 * Con un comprobante o una contraparte ya elegidos, el número queda fijo (igual que antes
		 * en venta): para empezar otra nota se usa Cancelar.
		 *
		 * @returns {Boolean}
		 */
		deshabilitado() {
			let state = this.$store.state.devoluciones
			if (this.es_compra) {
				return !!(state.provider_order || state.provider)
			}
			return !!(state.sale || state.client)
		},
	},
	methods: {
		/**
		 * Busca el comprobante del modo actual por su número.
		 */
		buscar() {
			if (this.deshabilitado) {
				return
			}
			if (this.es_compra) {
				this.search_provider_order()
			} else {
				this.search_sale()
			}
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-num__campo
		position: relative

	// Lugar para la lupa adentro del campo. Con dos clases más que la regla de tamaño de los inputs
	// del módulo (Index.vue), que también fija el padding: si no, esa le gana y la lupa tapa el texto.
	.dev-num .dev-num__campo .dev-num__input
		padding-right: 40px

	.dev-num__buscar.btn
		position: absolute
		top: 50%
		right: 3px
		transform: translateY(-50%)
		display: inline-flex
		align-items: center
		justify-content: center
		width: 30px
		height: 30px
		padding: 0
		border-radius: 50%
		color: var(--color-text-secondary)
		box-shadow: none
		&:hover,
		&:focus
			color: var(--color-primary)
			background-color: var(--bg-nav-hover)
			text-decoration: none
			box-shadow: none
</style>
