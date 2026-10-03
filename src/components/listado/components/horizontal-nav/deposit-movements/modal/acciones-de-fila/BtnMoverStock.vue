<template>
	<!--
		Boton "Mover stock" de un movimiento de deposito (mision movimientos-deposito-auditoria,
		3/10/2026). Cambiar el estado ya no mueve stock: el stock se mueve UNA sola vez, con este
		boton, y a partir de ahi los articulos del movimiento quedan bloqueados.

		`@click.stop`: el boton vive adentro de una fila de la tabla, y la fila abre el formulario
		del movimiento al hacerle clic (Tr.vue, onRowSelected). Sin el stop se abririan las dos cosas.
	-->
	<b-button
	v-if="se_puede_mover"
	size="sm"
	variant="primary"
	:data-testid="'mover-stock-deposito-'+model.id"
	@click.stop="confirmar">
		Mover stock
	</b-button>
</template>
<script>
export default {
	props: {
		/**
		 * El movimiento de deposito de la fila.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * El boton aparece solo si el stock de este movimiento todavia no se movio y el usuario
		 * tiene el permiso `deposit_movement.move_stock` (el dueño siempre lo tiene: `can()` le
		 * devuelve true). El backend vuelve a chequear las dos cosas.
		 *
		 * "Todavia no se movio" lo decide `deposit_movement_stock_movido()`
		 * (src/mixins/model_functions.js), que cuenta tambien `recibido_at`: un movimiento que el
		 * frente viejo ya traslado al pasarlo a "Recibido" no tiene que ofrecer moverlo otra vez.
		 *
		 * @returns {Boolean}
		 */
		se_puede_mover() {
			return !this.deposit_movement_stock_movido(this.model) && this.can('deposit_movement.move_stock')
		},
	},
	methods: {
		/**
		 * Nombre de un deposito (la calle de la sucursal) para el texto de la confirmacion. El
		 * movimiento trae solo los ids; los nombres salen del store de sucursales, que ya esta
		 * cargado (el boton de depositos del listado no se muestra sin sucursales).
		 *
		 * @param {Number} address_id id del deposito.
		 * @returns {String}
		 */
		nombre_de_deposito(address_id) {
			let address = this.get_store_model('address', address_id)
			if (address && address.street) {
				return address.street
			}
			return 'un depósito sin elegir'
		},
		/**
		 * Texto de la confirmacion: que se mueve, de donde a donde, y que despues los articulos
		 * quedan bloqueados. Es lo unico que el usuario lee antes de una accion que no se deshace
		 * desde la pantalla, asi que dice las tres cosas.
		 *
		 * @returns {String}
		 */
		texto_de_confirmacion() {
			let cantidad = this.model.articles ? this.model.articles.length : 0
			let articulos = cantidad == 1 ? '1 artículo' : cantidad + ' artículos'
			return 'Se van a mover ' + articulos
				+ ' del depósito ' + this.nombre_de_deposito(this.model.from_address_id)
				+ ' al depósito ' + this.nombre_de_deposito(this.model.to_address_id) + '.'
				+ ' Después de mover el stock, los artículos de este movimiento quedan bloqueados:'
				+ ' no se pueden agregar, quitar ni cambiar cantidades.'
		},
		/**
		 * Pide confirmacion y, si el usuario acepta, mueve el stock.
		 *
		 * @returns {void}
		 */
		confirmar() {
			let self = this
			this.$bvModal.msgBoxConfirm(this.texto_de_confirmacion(), {
				title: 'Mover stock del movimiento N° ' + this.model.num,
				okTitle: 'Mover stock',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (confirmado) {
					self.mover_stock()
				}
			})
			.catch(function () {})
		},
		/**
		 * Pega a `POST deposit-movement/{id}/move-stock` con el indicador global de carga.
		 *
		 * Al volver:
		 * - reemplaza el movimiento en la lista (`deposit_movement/add`), que ahora trae
		 *   `stock_moved_at`, `stock_moved_user` y `recibido_at`: el boton desaparece y aparece
		 *   "Stock movido";
		 * - refresca las alertas (`en_curso` son los movimientos con el stock sin mover: este sale
		 *   de la lista).
		 *
		 * Si el backend lo rechaza (403 sin permiso, 422 ya movido / sin articulos / mismo
		 * deposito) el mensaje lo muestra el manejador global de errores
		 * (common-vue/components/error/Index.vue): aca solo se apaga el indicador de carga.
		 *
		 * @returns {void}
		 */
		mover_stock() {
			let self = this
			this.$store.commit('auth/setMessage', 'Moviendo el stock')
			this.$store.commit('auth/setLoading', true)
			this.$api.post('deposit-movement/' + this.model.id + '/move-stock')
			.then(function (res) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$store.commit('deposit_movement/add', res.data.model)
				self.$store.dispatch('deposit_movement/en_curso/getModels')
				self.$toast.success('Listo: se movió el stock. Los artículos de este movimiento quedaron bloqueados.')
			})
			.catch(function (err) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
	},
}
</script>
