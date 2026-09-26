import { estado_de_recuperacion, reintentar_catalogo, forzar_reintento_ahora } from '@/common-vue/helpers/critical_catalog_recovery'

/*
	Envuelve critical_catalog_recovery.js para el catalogo de metodos de pago de cuenta corriente
	(current_acount_payment_method). Nace del incidente de Trama del 25/9/2026: a diferencia de
	price_type, este catalogo no tenia NINGUN mecanismo de recuperacion si su pedido individual del
	arranque fallaba (ver informe 20260925-incidente-selects-vacios-vender-trama.md).

	Lo mezcla Vender.vue (arranca la recuperacion en created()) Y PaymentMethod.vue (lee el estado
	para mostrar "Cargando..."/el boton Reintentar): el estado que publica el helper es
	module-level, asi que da lo mismo por cual de los dos componentes se lea.
*/

/** El modulo Vuex (store/current_acount_payment_method.js) y la base de su ruta de API. */
const MODEL_NAME = 'current_acount_payment_method'

export default {
	computed: {
		/**
		 * Estado reactivo de la recuperacion de este catalogo: { reintentando, agotado,
		 * confirmado_vacio }. PaymentMethod.vue lo usa para decidir que mostrar al lado del select.
		 *
		 * @returns {{reintentando: boolean, agotado: boolean, confirmado_vacio: boolean}}
		 */
		payment_method_recovery_state() {
			return estado_de_recuperacion(MODEL_NAME)
		},
	},
	methods: {
		/**
		 * Arranca (o continua) la recuperacion del catalogo de metodos de pago, si hizo falta.
		 * Se llama UNA vez desde created() de Vender.vue, al lado de donde ya se dispara la logica
		 * equivalente de price_type. No hace nada si el catalogo ya tiene datos, si ya se confirmo
		 * vacio, o si ya se agotaron los reintentos en esta sesion.
		 *
		 * @returns {void}
		 */
		iniciar_recuperacion_de_metodos_de_pago() {
			reintentar_catalogo(MODEL_NAME, this.routeString(MODEL_NAME), this.$store)
		},

		/**
		 * El boton "Reintentar" manual de PaymentMethod.vue, visible solo cuando la recuperacion
		 * automatica ya se agoto.
		 *
		 * @returns {void}
		 */
		reintentar_metodos_de_pago_ahora() {
			forzar_reintento_ahora(MODEL_NAME, this.routeString(MODEL_NAME), this.$store)
		},
	},
}
