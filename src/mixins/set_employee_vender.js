export default {
	methods: {
		setEmployeeVender() {
			if (!this.is_owner) {
				this.$store.commit('vender/setEmployeeId', this.user.id)
			} else {
				this.$store.commit('vender/setEmployeeId', 0)
			}
		},
		/**
		 * Deja en Vender el vendedor del empleado logueado: el "Perfil de Vendedor" (`user.seller_id`)
		 * que el dueño le asignó en el ABM de empleados. Asi el select "Vendedor" (si esta a la vista)
		 * ya aparece seleccionado y, con la extension apagada, la venta igual sale con ese vendedor.
		 *
		 * El dueño no tiene perfil de vendedor propio y queda en 0 ("sin elegir"), como siempre, igual
		 * que un empleado sin perfil: ahi la API decide sola (vendedor del cliente, o ninguno).
		 *
		 * Lo llaman el arranque (`startMethods`) y `limpiar_vender`, para que la venta SIGUIENTE
		 * tambien arranque con el vendedor del empleado y no en 0.
		 *
		 * @returns {void}
		 */
		setSellerVender() {
			if (this.user && !this.is_owner && this.user.seller_id) {
				this.$store.commit('vender/setSellerId', this.user.seller_id)
			} else {
				this.$store.commit('vender/setSellerId', 0)
			}
		},
	}
}