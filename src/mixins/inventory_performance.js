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

				this.$store.dispatch('inventory_performance/get_models_con_estado')
				.then(() => {
					if (typeof callback == 'function') {
						callback()
					}
				})

				this.Echo.leaveChannel(channel_name)
			})
		},
	},
}
