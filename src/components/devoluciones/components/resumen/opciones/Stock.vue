<template>
	<!--
		Stock de la nota de crédito.
		- Venta: "Regresar al stock" (la mercadería ENTRA al depósito elegido).
		- Compra: "Descontar del stock" (la mercadería SALE del depósito elegido).
		Los dos escriben el mismo `regresar_stock` del store: en la API, con `tipo = 'compra'`,
		significa sacar del stock (plan §4.1).

		🔴 Testids de venta conservados: `devolucion-regresar-stock` en el <input type=checkbox> que
		VenderToggle envuelve en su <label> (así lo prende poner_toggle()), y `devolucion-deposito`
		en el <select>. En compra: `devolucion-compra-descontar-stock` y `devolucion-compra-deposito`.
	-->
	<div>
		<vender-toggle
		:input_id="es_compra ? 'devolucion-compra-descontar-stock' : 'devolucion-regresar-stock'"
		v-model="regresar_stock">
			{{ es_compra ? 'Descontar del stock' : 'Regresar al stock' }}
			<span class="dev-toggle__ayuda">
				{{ es_compra ? 'La mercadería sale del depósito.' : 'Las unidades vuelven al inventario.' }}
			</span>
		</vender-toggle>

		<div
		v-if="regresar_stock && addresses.length"
		class="dev-opciones__sub">
			<label
			class="dev-label"
			:for="es_compra ? 'devolucion-compra-deposito' : 'devolucion-deposito'">
				{{ es_compra ? 'Depósito del que sale' : 'Depósito al que vuelve' }}
			</label>
			<b-form-select
			:id="es_compra ? 'devolucion-compra-deposito' : 'devolucion-deposito'"
			:data-testid="es_compra ? 'devolucion-compra-deposito' : 'devolucion-deposito'"
			v-model="address_id"
			:options="getOptions({text: 'Deposito', store: 'address', select_prop_name: 'street'})"></b-form-select>
		</div>
	</div>
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
		 * 1/0: mover stock con la nota de crédito.
		 */
		regresar_stock: {
			get() {
				return this.$store.state.devoluciones.regresar_stock
			},
			set(value) {
				this.$store.commit('devoluciones/set_regresar_stock', value)
			},
		},
		/**
		 * Depósito destino (venta) u origen (compra).
		 */
		address_id: {
			get() {
				return this.$store.state.devoluciones.address_id
			},
			set(value) {
				this.$store.commit('devoluciones/set_address_id', value)
			},
		},
		/**
		 * @returns {Array} Depósitos del usuario; sin depósitos no hay select.
		 */
		addresses() {
			return this.$store.state.address.models
		},
	},
}
</script>
