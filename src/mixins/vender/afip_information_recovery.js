import { estado_de_recuperacion, reintentar_catalogo, forzar_reintento_ahora } from '@/common-vue/helpers/critical_catalog_recovery'

/*
	Envuelve critical_catalog_recovery.js para el catalogo de puntos de venta AFIP
	(afip_information). Mismo motivo y mismo patron que payment_methods_recovery.js: nace del
	incidente de Trama del 25/9/2026, donde este catalogo tampoco tenia ningun mecanismo de
	recuperacion si su pedido individual del arranque fallaba.

	Lo mezcla Vender.vue (arranca la recuperacion en created()) Y SelectAfipInformation.vue (lee el
	estado para mostrar "Cargando..."/el boton Reintentar): el estado que publica el helper es
	module-level, asi que da lo mismo por cual de los dos componentes se lea.
*/

/** El modulo Vuex (store/afip_information.js) y la base de su ruta de API. */
const MODEL_NAME = 'afip_information'

export default {
	computed: {
		/**
		 * Estado reactivo de la recuperacion de este catalogo: { reintentando, agotado,
		 * confirmado_vacio }. SelectAfipInformation.vue lo usa para decidir que mostrar al lado
		 * del select.
		 *
		 * @returns {{reintentando: boolean, agotado: boolean, confirmado_vacio: boolean}}
		 */
		afip_information_recovery_state() {
			return estado_de_recuperacion(MODEL_NAME)
		},
	},
	methods: {
		/**
		 * Arranca (o continua) la recuperacion del catalogo de puntos de venta AFIP, si hizo falta.
		 * Se llama UNA vez desde created() de Vender.vue, al lado de donde ya se dispara la logica
		 * equivalente de price_type. No hace nada si el catalogo ya tiene datos, si ya se confirmo
		 * vacio, o si ya se agotaron los reintentos en esta sesion.
		 *
		 * @returns {void}
		 */
		iniciar_recuperacion_de_puntos_de_venta_afip() {
			reintentar_catalogo(MODEL_NAME, this.routeString(MODEL_NAME), this.$store)
		},

		/**
		 * El boton "Reintentar" manual de SelectAfipInformation.vue, visible solo cuando la
		 * recuperacion automatica ya se agoto.
		 *
		 * @returns {void}
		 */
		reintentar_puntos_de_venta_afip_ahora() {
			forzar_reintento_ahora(MODEL_NAME, this.routeString(MODEL_NAME), this.$store)
		},
	},
}
