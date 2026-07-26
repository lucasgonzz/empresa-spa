<template>
	<!--
		Grupo 223 · Prompt 03: modal de overrides de liquidación/comisión por método de pago
		dentro de una caja. Lista TODOS los métodos de pago de cuenta corriente del negocio (el
		override no está restringido a los métodos "por defecto" de esta caja en
		default_payment_method_caja: cualquier método puede cobrarse en cualquier caja) y, por
		cada uno, delega en `Row` el formulario puntual con los valores heredados de la caja.
	-->
	<b-modal
	size="lg"
	:title="title"
	hide-footer
	id="liquidacion-config-caja">

		<p class="text-muted m-b-15">
			Dejá un campo vacío para que este método de pago use el valor configurado en la caja.
			Completalo solo si necesitás un valor distinto (por ejemplo, Mercado Pago liquida distinto
			según sea QR, débito o cuotas).
		</p>

		<row
		v-for="payment_method in payment_methods"
		:key="'liquidacion-config-'+payment_method.id"
		:caja="caja"
		:payment_method="payment_method"
		:config="configFor(payment_method)"></row>

		<p
		v-if="!payment_methods.length"
		class="text-muted">
			Todavía no hay métodos de pago cargados.
		</p>
	</b-modal>
</template>
<script>
export default {
	components: {
		Row: () => import('@/components/caja/modals/liquidacion-config/Row'),
	},
	computed: {
		/**
		 * Caja sobre la que se está configurando el override (seteada en `caja/setModel`
		 * por el botón que abre este modal).
		 *
		 * @returns {Object}
		 */
		caja() {
			return this.$store.state.caja.model
		},

		/**
		 * Título del modal, con el nombre de la caja.
		 *
		 * @returns {String}
		 */
		title() {
			if (this.caja) {
				return 'Liquidación y comisiones de '+this.caja.name
			}
		},

		/**
		 * Todos los métodos de pago de cuenta corriente del negocio (ya precargados
		 * globalmente al iniciar la app, ver mixins/call_methods.js).
		 *
		 * @returns {Array}
		 */
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},

		/**
		 * Overrides ya cargados para esta caja (filtrados por el backend vía route_prefix).
		 *
		 * @returns {Array}
		 */
		configs() {
			return this.$store.state.caja_liquidacion_config.models
		},
	},
	methods: {
		/**
		 * Busca el override existente (si lo hay) para un método de pago puntual.
		 *
		 * @param {Object} payment_method
		 * @returns {Object|null}
		 */
		configFor(payment_method) {
			let config = this.configs.find(config => {
				return config.current_acount_payment_method_id == payment_method.id
			})
			return config || null
		},
	},
}
</script>
