<template>
	<b-dropdown-item
	v-if="pending_selected_orders.length"
	@click="confirmar_seleccionados">
		<i class="icon-check"></i>
		Confirmar pedidos y crear ventas
	</b-dropdown-item>
</template>
<script>
/**
 * Ítem del menú desplegable de acciones sobre filas seleccionadas.
 * Confirma en lote los pedidos Tienda Nube elegidos que sigan pendientes (status id 1),
 * reutilizando el mismo contrato API que BtnConfirmar.vue (PUT con status 2).
 */
export default {
	computed: {
		/**
		 * Pedidos actualmente marcados en la tabla del listado.
		 * @returns {Array<Object>}
		 */
		selected_orders() {
			return this.$store.state.tienda_nube_order.selected
		},
		/**
		 * Subconjunto seleccionado aún pendiente de confirmación (misma regla que BtnConfirmar).
		 * @returns {Array<Object>}
		 */
		pending_selected_orders() {
			let result = []
			this.selected_orders.forEach(order => {
				if (order.tienda_nube_order_status_id == 1) {
					result.push(order)
				}
			})
			return result
		},
	},
	methods: {
		/**
		 * Confirma uno tras otro los pedidos pendientes en la selección, actualiza el store y vacía la selección.
		 * No usa async/await: encadena con .then() / recursión como el resto del proyecto.
		 */
		confirmar_seleccionados() {
			let pending = this.pending_selected_orders
			if (!pending.length) {
				this.$toast.warning('No hay pedidos pendientes de confirmación en la selección')
				return
			}

			let msg = '¿Seguro que quiere confirmar ' + pending.length + ' pedido(s) seleccionado(s)?'
			if (!confirm(msg)) {
				return
			}

			this.$store.commit('auth/setMessage', 'Confirmando pedidos')
			this.$store.commit('auth/setLoading', true)

			let index = 0
			let confirmed_count = 0
			let failed_count = 0

			let process_next = () => {
				if (index >= pending.length) {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					if (failed_count === 0) {
						this.$toast.success('Se confirmaron ' + confirmed_count + ' pedido(s)')
					} else {
						this.$toast.warning(
							'Confirmados: ' + confirmed_count + '. Con error: ' + failed_count
						)
					}
					this.$store.commit('tienda_nube_order/setSelected', [])
					return
				}

				let order = pending[index]
				index++

				this.$api
					.put('tienda-nube-order/' + order.id, {
						...order,
						tienda_nube_order_status_id: 2,
					})
					.then(res => {
						this.$store.commit('tienda_nube_order/add', res.data.model)
						confirmed_count++
						process_next()
					})
					.catch(err => {
						console.log(err)
						failed_count++
						process_next()
					})
			}

			process_next()
		},
	},
}
</script>
