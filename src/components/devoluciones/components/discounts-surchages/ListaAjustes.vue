<template>
	<!--
		Lista de descuentos o de recargos con un toggle cada uno (VenderToggle en modo `array`).
		Reemplaza a Discounts.vue y Surchages.vue, que eran el mismo componente copiado.

		Conserva los dos avisos de antes:
		- "(actualmente eliminado)" si el descuento/recargo ya no existe;
		- el porcentaje de hoy cuando cambió desde la venta, y cómo usar el valor nuevo.
	-->
	<div class="dev-ajustes__lista">
		<p class="dev-ajustes__titulo">
			{{ es_descuento ? 'Descuentos' : 'Recargos' }}
		</p>

		<vender-toggle
		v-for="ajuste in ajustes"
		:key="ajuste.id"
		class="dev-ajustes__fila"
		mode="array"
		:option_value="ajuste.id"
		:input_id="(es_descuento ? 'devolucion-descuento-' : 'devolucion-recargo-')+ajuste.id"
		v-model="seleccionados">
			{{ ajuste.name }}
			<span class="dev-chip">{{ porcentaje_es(ajuste.percentage) }}%</span>

			<span
			v-if="ajuste.deleted_at"
			class="dev-toggle__ayuda">
				Actualmente eliminado.
			</span>

			<template v-else-if="ajuste.updated_percentage">
				<span class="dev-toggle__ayuda">
					Hoy está en {{ porcentaje_es(ajuste.updated_percentage) }}%.
				</span>
				<span class="dev-toggle__ayuda">
					Para usar el valor actual, actualizá la venta sacándole {{ es_descuento ? 'el descuento' : 'el recargo' }}, guardala, y volvé a generar la devolución agregándolo con el valor de hoy.
				</span>
			</template>
		</vender-toggle>
	</div>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	components: {
		VenderToggle: () => import('@/components/vender/components/VenderToggle'),
	},
	props: {
		// 'discount' o 'surchage': de qué store se leen y a qué lista del store de devoluciones
		// se escribe.
		tipo_ajuste: {
			type: String,
			required: true,
		},
	},
	computed: {
		/**
		 * @returns {Boolean} true si esta lista es la de descuentos.
		 */
		es_descuento() {
			return this.tipo_ajuste == 'discount'
		},
		/**
		 * @returns {Array} Descuentos o recargos del store del modelo.
		 */
		ajustes() {
			return this.$store.state[this.tipo_ajuste].models
		},
		/**
		 * Ids prendidos para la devolución. Al cambiar, recalcula el total.
		 */
		seleccionados: {
			get() {
				if (this.es_descuento) {
					return this.$store.state.devoluciones.discounts_id
				}
				return this.$store.state.devoluciones.surchages_id
			},
			set(value) {
				if (this.es_descuento) {
					this.$store.commit('devoluciones/set_discounts_id', value)
				} else {
					this.$store.commit('devoluciones/set_surchages_id', value)
				}
				this.set_total_devolucion()
			},
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-ajustes__lista
		display: flex
		flex-direction: column
		gap: 12px
		min-width: 0

	.dev-ajustes__titulo
		margin: 0
		font-size: 0.8125rem
		font-weight: 600
		color: var(--color-text-secondary)

	.dev-ajustes__fila .dev-chip
		margin-left: 6px
</style>
