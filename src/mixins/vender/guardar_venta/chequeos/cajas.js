export default {
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
	},
	methods: {
		check_cajas() {
			console.log('check_cajas asdasd')

			if (
				this.$store.state.vender.client
				&& !this.$store.state.vender.omitir_en_cuenta_corriente
			) {
				return true
			}

			if (this.cajas.length) {

				if (!this.cajas_abiertas.length) {
					this.avisar_que_no_hay_cajas_abiertas()
					return false 
				}

				if (
					!this.$store.state.vender.caja_id
					&& this.selected_payment_methods.length == 0
					&& (
						!this.$store.state.vender.client
						|| this.$store.state.vender.omitir_en_cuenta_corriente
					)
				) {

					this.avisar_que_falta_la_caja()
					return false 
				}

				if (
					!this.$store.state.vender.caja_id
					&& this.selected_payment_methods.length > 0
				) {

					console.log(this.selected_payment_methods)


					let ok = true

					this.selected_payment_methods.forEach(pay => {
						if (!pay.caja_id) {

							let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == pay.current_acount_payment_method_id)
							
							this.$toast.error('Indique una CAJA para el metodo de pago '+payment_method.name)
							ok = false
						}
					})


					return ok 
				}

				

				let caja_seleccionada = this.cajas_abiertas.find(caja => caja.id == this.$store.state.vender.caja_id)
				console.log('caja_seleccionada:')
				console.log(caja_seleccionada)
				
				if (typeof caja_seleccionada == 'undefined') {

					this.avisar_que_falta_la_caja()
					return false 
				}
			}
			return true 
		},
		/*
			Misión prueba-primera-venta (12/11/2026): en el ensayo de la prueba gratuita «Guardar venta»
			frenó tres veces seguidas, de a un requisito por vez (cajas cerradas, caja sin elegir,
			sucursal sin elegir). Los dos avisos de abajo dicen TODO lo que falta de una: si además de la
			caja falta la sucursal (la misma condición de check_sucursal, que sigue corriendo después y
			frena sola si la caja estaba bien), lo dicen en el mismo aviso.
		*/
		/**
		 * No hay ninguna caja abierta: dice dónde se abre y, si el usuario puede entrar a Tesorería,
		 * tocar el aviso lo lleva ahí. La venta en curso queda en el store: al volver sigue como estaba.
		 *
		 * @returns {void}
		 */
		avisar_que_no_hay_cajas_abiertas() {
			let puede_ir = this.can('caja.index')

			let mensaje = 'No hay ninguna CAJA abierta. Abrí una en Tesorería: en la fila de la caja, botón «Abrir».'

			if (puede_ir) {
				mensaje += ' Tocá este aviso para ir.'
			}

			if (this.falta_sucursal_de_la_venta()) {
				mensaje += ' Además, indicá la SUCURSAL de la venta.'
			}

			let opciones = { duration: 10000 }

			if (puede_ir) {
				opciones.onClick = () => {
					if (this.$route.name != 'caja') {
						this.$router.push({ name: 'caja' })
					}
				}
			}

			this.$toast.error(mensaje, opciones)
		},
		/**
		 * Hay cajas abiertas pero la venta no tiene una elegida (o tiene una cerrada).
		 *
		 * @returns {void}
		 */
		avisar_que_falta_la_caja() {
			if (this.falta_sucursal_de_la_venta()) {
				this.$toast.error('Indicá la CAJA y la SUCURSAL de esta venta')
				return
			}

			this.$toast.error('Indique una CAJA para esta venta')
		},
	}
}