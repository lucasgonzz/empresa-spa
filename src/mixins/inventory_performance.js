/**
 * Mixin reutilizable para el flujo de "reporte de inventario en background".
 *
 * Centraliza en un solo lugar:
 * - El pedido del reporte (solo contadores + flag `generating`).
 * - La suscripción al canal de broadcast del owner cuando el reporte se está generando,
 *   para no triplicar la lógica entre el arranque del sistema, el módulo de Alertas
 *   y el modal de stock mínimo (este último se agrega en el prompt 399).
 *
 * Se apoya en el store `inventory_performance` (ver `@/store/inventory_performance.js`).
 */
export default {
	computed: {
		/**
		 * Reporte de inventario vigente (o `null` si todavía no se generó ninguno).
		 * El store guarda un único modelo en `models[0]` (filtrando los `null` que puede
		 * mandar el backend cuando aún no hay reporte generado para el owner).
		 */
		inventory_performance() {
			return this.$store.state.inventory_performance.models.length
				? this.$store.state.inventory_performance.models[0]
				: null
		},
		/**
		 * true mientras el job de cálculo del reporte está corriendo en background.
		 */
		inventory_performance_generating() {
			return this.$store.state.inventory_performance.generating
		},
		/**
		 * true si ya hay un reporte cargado y su contador de stock mínimo es mayor a cero.
		 * Se usa el contador (no la lista de artículos, que ya no viene en la respuesta).
		 */
		hay_articulos_stock_minimo() {
			return !!(this.inventory_performance && this.inventory_performance.stock_minimo > 0)
		},
		/**
		 * Hace cuánto se calculó el reporte vigente, en palabras ("hace 3 horas", "hace un día"),
		 * o '' si todavía no hay ninguno. Sale de `since()` del mixin global de fechas
		 * (common-vue/mixins/dates.js), que es moment `fromNow` con locale español.
		 *
		 * Es un computed, así que se recalcula cuando cambia el reporte --o sea, cuando llega uno
		 * nuevo-- y no cada minuto: para la lectura que se le da ("esto es de anoche", "esto es
		 * de recién") alcanza, y no hace falta un timer.
		 *
		 * @returns {String}
		 */
		inventory_performance_actualizado_hace() {
			if (!this.inventory_performance) {
				return ''
			}
			return this.since(this.inventory_performance.created_at)
		},
	},
	methods: {
		/**
		 * Pide el reporte de inventario (contadores + flag `generating`).
		 * Si el backend contesta que se está generando, se suscribe al canal de broadcast
		 * del owner para enterarse apenas el job termine.
		 *
		 * @returns {Promise}
		 */
		get_inventory_performance_models() {
			return this.$store.dispatch('inventory_performance/get_models_con_estado')
			.then(() => {
				if (this.inventory_performance_generating) {
					this.escuchar_inventory_performance()
				}
			})
		},
		/**
		 * Pide la regeneración del reporte ahora (botón "Actualizar", 4.0.24) y se queda
		 * escuchando el canal del owner para refrescar los datos apenas el job termine.
		 *
		 * Solo se suscribe si el backend confirmó que hay una generación en curso: si el POST
		 * falló (API vieja sin el endpoint, sin conexión), `generating` sigue en false y no tiene
		 * sentido esperar un evento que no va a llegar. Es el mismo criterio que
		 * `get_inventory_performance_models`.
		 *
		 * @param {Function} [callback] Se ejecuta luego de recargar el reporte actualizado.
		 * @returns {Promise}
		 */
		actualizar_inventory_performance(callback) {
			return this.$store.dispatch('inventory_performance/generar')
			.then(() => {
				if (this.inventory_performance_generating) {
					this.escuchar_inventory_performance(callback)
				}
			})
		},
		/**
		 * Se suscribe al canal `inventory_performance.{owner_id}` (el reporte es del owner,
		 * no del usuario logueado: un empleado admin comparte owner y ve el mismo reporte).
		 * Cuando llega el evento `InventoryPerformanceGenerated`, vuelve a pedir el reporte
		 * y ejecuta el `callback` (si vino), y abandona el canal.
		 *
		 * @param {Function} [callback] Se ejecuta luego de recargar el reporte actualizado.
		 */
		escuchar_inventory_performance(callback) {

			// Nombre del canal privado del owner donde el backend emite el evento al terminar el job.
			let channel_name = 'inventory_performance.'+this.owner.id

			this.Echo.channel(channel_name)

			.listen('.InventoryPerformanceGenerated', (payload) => {

				// Llego el aviso: el sondeo de respaldo ya no hace falta (y no debe repetir el callback).
				this.detener_sondeo_inventory_performance()

				this.$store.dispatch('inventory_performance/get_models_con_estado')
				.then(() => {
					if (typeof callback == 'function') {
						callback()
					}
				})

				this.Echo.leaveChannel(channel_name)
			})

			// Respaldo por si el aviso nunca llega (socket caido, plan de Pusher al tope): ver abajo.
			this.sondear_inventory_performance(callback)
		},
		/**
		 * Respaldo del broadcast: mientras el reporte se esta generando, pregunta cada 15 segundos
		 * si ya termino, y cuando `generating` vuelve a false deja de preguntar. Sin esto, si el
		 * evento de Pusher se pierde, el boton queda en "Actualizando..." hasta recargar la pagina.
		 *
		 * Cada pregunta es el mismo GET liviano que ya hace la pantalla al entrar (solo los
		 * contadores, sin articulos). Tiene tope de 30 minutos: pasado eso deja de insistir (el
		 * candado del backend se libera solo) y el usuario recupera el boton con recargar.
		 *
		 * Es una sola espera por componente: si ya hay una en curso, no arma otra. Se corta sola
		 * al destruirse el componente (beforeDestroy de abajo).
		 *
		 * @param {Function} [callback] Se ejecuta cuando el sondeo detecta que el reporte termino.
		 */
		sondear_inventory_performance(callback) {

			if (this.inventory_performance_sondeo) {
				return
			}

			let self = this
			let intentos_maximos = 120

			this.inventory_performance_intentos = 0

			this.inventory_performance_sondeo = setInterval(function () {

				self.inventory_performance_intentos++

				if (self.inventory_performance_intentos > intentos_maximos) {
					self.detener_sondeo_inventory_performance()
					return
				}

				self.$store.dispatch('inventory_performance/get_models_con_estado')
				.then(function () {
					if (!self.inventory_performance_generating) {
						self.detener_sondeo_inventory_performance()
						if (typeof callback == 'function') {
							callback()
						}
					}
				})

			}, 15000)
		},
		/**
		 * Corta el sondeo de respaldo, si hay uno en curso.
		 */
		detener_sondeo_inventory_performance() {
			if (this.inventory_performance_sondeo) {
				clearInterval(this.inventory_performance_sondeo)
				this.inventory_performance_sondeo = null
			}
		},
	},
	beforeDestroy() {
		this.detener_sondeo_inventory_performance()
	},
}
