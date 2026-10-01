<template>
	<!--
		Movimiento en cuenta corriente.
		- Venta: solo con cliente (testid de siempre: `devolucion-generar-cuenta-corriente`).
		- Compra: solo con proveedor (`devolucion-compra-generar-cuenta-corriente`). Deja un haber
			en la cuenta del proveedor que baja lo que se le debe.
	-->
	<vender-toggle
	v-if="contraparte"
	:input_id="es_compra ? 'devolucion-compra-generar-cuenta-corriente' : 'devolucion-generar-cuenta-corriente'"
	v-model="generar_current_acount">
		{{ es_compra ? 'Cuenta corriente del proveedor' : 'Generar movimiento en la cuenta corriente' }}
		<span class="dev-toggle__ayuda">
			{{ es_compra ? 'Queda un saldo a tu favor que baja lo que le debés.' : 'Queda un saldo a favor del cliente.' }}
		</span>
	</vender-toggle>
</template>
<script>
export default {
	components: {
		VenderToggle: () => import('@/components/vender/components/VenderToggle'),
	},
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * Cliente (venta) o proveedor (compra): sin contraparte no hay cuenta corriente.
		 *
		 * @returns {Object|null}
		 */
		contraparte() {
			if (this.es_compra) {
				return this.$store.state.devoluciones.provider
			}
			return this.$store.state.devoluciones.client
		},
		/**
		 * 1/0: generar el movimiento.
		 */
		generar_current_acount: {
			get() {
				return this.$store.state.devoluciones.generar_current_acount
			},
			set(value) {
				this.$store.commit('devoluciones/set_generar_current_acount', value)
			},
		},
	},
}
</script>
