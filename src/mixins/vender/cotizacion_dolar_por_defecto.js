/**
 * La cotizacion del dolar que Vender usa POR DEFECTO: la del sistema (`owner.dollar`).
 *
 * Decision de Lucas (30/9/2026): una venta en dolares necesita la cotizacion (la API la rechaza con
 * 422 sin ella), asi que Vender tiene que arrancar siempre con el dolar que el comercio tiene cargado
 * en el sistema, y no dejarla vacia ni en cero. Este mixin es la unica fuente de ese valor para los
 * lugares que lo necesitan: `Moneda.vue` (al montarse y al salir del campo vacio) y el chequeo de
 * `guardar_venta` (`check_valor_dolar_de_la_venta`). `limpiar_vender.js` restaura la cotizacion al
 * terminar cada comprobante con la misma cuenta (`owner.dollar`, o null si no tiene) por su lado.
 *
 * `owner` es el dueño de la cuenta (o su configuracion, para un empleado): `owner.dollar` llega como
 * string ("1570.00") y vale null o 0 cuando el comercio nunca lo cargo.
 */
export default {
	computed: {
		/**
		 * El dolar del sistema como numero, o null si el comercio no lo tiene cargado.
		 *
		 * @returns {Number|null}
		 */
		valor_dolar_por_defecto() {
			let dolar = Number(this.owner && this.owner.dollar)

			return dolar > 0 ? dolar : null
		},
	},
	methods: {
		/**
		 * Carga el dolar del sistema como cotizacion de la venta en curso (`vender/valor_dolar`).
		 *
		 * @returns {boolean} true si lo cargo; false si el comercio no tiene dolar configurado (no se
		 *                    toca nada: inventar un numero seria peor que dejarlo vacio).
		 */
		cargar_dolar_por_defecto() {
			if (this.valor_dolar_por_defecto === null) {
				return false
			}

			this.$store.commit('vender/set_valor_dolar', this.valor_dolar_por_defecto)

			return true
		},
	},
}
