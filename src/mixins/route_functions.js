export default {
	methods: {
		/**
		 * Abre el panel del chat del asistente IA, opcionalmente parado en una
		 * conversación puntual (ej: la que creó una sugerencia de stock, D22/D23).
		 *
		 * Vive acá porque este mixin entra por common-vue/mixins/app.js a Vue.mixin():
		 * queda disponible en TODA la app (incluido el modal de la notificación global)
		 * sin tocar common-vue. Si no se pasa id, se respeta la conversación que ya
		 * estuviera seleccionada: al abrir, el panel cae solo a la última con actividad.
		 *
		 * @param {number|null} conversation_id
		 */
		abrir_chat_ia(conversation_id = null) {
			if (conversation_id) {
				this.$store.commit('ai_chat/setSelectedConversationId', conversation_id)
			}
			this.$store.commit('ai_chat/setPanelAbierto', true)
		},
		toProduccion() {
			if (this.user) {
				if (this.hasExtencion('production.order_production')) {
					this.$router.push({name: 'produccion', params: {view: 'ordenes'}})
				} else if (this.hasExtencion('production.production_movement')) {
					this.$router.push({name: 'produccion', params: {view: 'movimientos'}})
				}
			}
		},
		toSales() {
			if (this.user) {
				let from_dates = this.$store.state.sale.from_dates
				
				// Si entra, es porque se llamo el historico desde Deposito
				if (!from_dates) {

					this.$store.commit('sale/setFromDates', true)
				}
				
				this.$store.dispatch('sale/getModels')

				let sucursal = this.get_address_param()

				let empelado = this.get_employee_param()
				
				this.$router.push({name: 'sale', params: {view: sucursal, sub_view: empelado}})

			}
		},
		get_address_param() {
			let sucursal = 'todas' 

			if (!this.can('sale.index.addresses.all')
				&& this.can('sale.index.addresses.only_your')) {

				if (this.user.address_id) {
					let user_address = this.$store.state.address.models.find(address => address.id == this.user.address_id)
					
					if (typeof user_address != 'undefined') {

						sucursal = this.routeString(user_address.street)
					}
				}
			}

			return sucursal
		},
		get_employee_param() {
			let empleado = 'todos' 
 
			if (!this.can('sale.index.employees.all')
				&& this.can('sale.index.employees.only_your')) {

				empleado = this.routeString(this.user.name)
			}

			return empleado
		},
	}
}