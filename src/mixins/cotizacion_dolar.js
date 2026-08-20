export default {
	methods: {
		/**
		 * Chequeo de la cotización del dólar al iniciar sesión.
		 *
		 * Silencioso por diseño: si algo falla, NO molesta al usuario y NO traba el arranque.
		 * Pero el fallo queda en el store con estado 'proveedor_caido' y en la consola, para
		 * que el botón de Configuración pueda mostrarlo cuando el usuario sí esté esperando
		 * una respuesta. Recién ahí un cartel de error es información y no ruido.
		 *
		 * 🔴 El modal se abre en UN SOLO caso: hay medición, supera el umbral del usuario, y
		 * el aviso está prendido. Nunca en el primer login de una cuenta que jamás eligió
		 * cotización, y nunca cuando la API no respondió. Que se abriera con el proveedor
		 * caído sería lo peor de los dos mundos: un modal que interrumpe para no decir nada.
		 *
		 * Va último en `startMethods()` a propósito: es el chequeo que menos urge y el que
		 * más chances tiene de tardar, porque por detrás del backend sale a una API de
		 * terceros.
		 *
		 * @returns {void}
		 */
		check_cotizacion_dolar() {
			// La extensión es de la EMPRESA y el rol es de la PERSONA: son dos preguntas
			// distintas y las dos tienen que dar que sí. El endpoint las vuelve a hacer.
			if (!this.is_admin) return
			if (!this.hasExtencion('costo_en_dolares')) return

			let self = this
			this.$store.dispatch('dolar_cotizacion/consultar', { silencioso: true })
			.then(() => {
				if (self.$store.getters['dolar_cotizacion/hubo_error_de_proveedor']) {
					// Ni toast ni modal: el usuario recién entra y esto no es su problema.
					console.warn('[cotizacion-dolar] no se pudo consultar: '
						+ (self.$store.state.dolar_cotizacion.error || {}).motivo)
					return
				}
				if (self.$store.getters['dolar_cotizacion/debe_avisar']) {
					/*
					 * Queda escrito que el modal lo abrió el sistema y no el usuario: es el
					 * campo `disparo` que viaja en el POST y termina en la fila de historial.
					 * `$bvModal.show(id)` no lleva datos, así que el store es el único lugar
					 * donde el modal puede enterarse.
					 */
					self.$store.commit('dolar_cotizacion/set_abierto_desde', 'login')
					self.$bvModal.show('cotizacion-dolar')
				}
			})
		},
	},
}
