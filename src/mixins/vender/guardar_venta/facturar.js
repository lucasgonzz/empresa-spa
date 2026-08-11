export default {
	computed: {
        maked_sale() {
            return this.$store.state.vender.sale
        },
        afip_tipo_comprobante_id() {
            return this.$store.state.vender.afip_tipo_comprobante_id
        },
        incoterms() {
            return this.$store.state.vender.incoterms
        },
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id
			}, 
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value)
			},
		},
		forma_de_pago: {
			get() {
				return this.$store.state.vender.forma_de_pago
			},
			set(value) {
				this.$store.commit('vender/set_forma_de_pago', value)
			},
		},
		permiso_existente: {
			get() {
				return this.$store.state.vender.permiso_existente
			},
			set(value) {
				this.$store.commit('vender/set_permiso_existente', value)
			},
		},
	},
	methods: {
		mostrar_tarjeta() {
			let el = document.getElementById('loading-afip-ticket')
			el.classList.add('loading-afip-ticket-active')
		},
		ocultar_mensaje_demorado() {
			let el = document.getElementById('loading-afip-ticket')
			el.classList.remove('loading-afip-ticket-demorado')
		},
		mostrar_mensaje_exitoso() {
			let el = document.getElementById('loading-afip-ticket')
			el.classList.add('loading-afip-ticket-success')
		},
		ocutlar_mensaje_exitoso() {
			let el = document.getElementById('loading-afip-ticket')
			el.classList.remove('loading-afip-ticket-success')
		},
		ocultar_tarjeta() {
			let el = document.getElementById('loading-afip-ticket')
			el.classList.remove('loading-afip-ticket-active')

			setTimeout(() => {
				this.ocutlar_mensaje_exitoso()
				this.ocultar_mensaje_demorado()

				this.$store.commit('vender/setAfipResult', [])
			}, 500)
		},
		/*
			Los datos de AFIP llegan por parámetro y no se leen del store, porque para cuando esto
			se ejecuta el store ya se limpió: el punto de venta tiene que volver a cero apenas se
			guarda la venta, sin esperar la respuesta de AFIP (pedido de Lucas, 4/8/2026). Si esto
			vuelve a leer del store, deja de facturar y no avisa.
		*/
		facturar_venta(datos_afip = {}) {

			let afip_information_id = typeof datos_afip.afip_information_id !== 'undefined' ? datos_afip.afip_information_id : this.afip_information_id
			let afip_tipo_comprobante_id = typeof datos_afip.afip_tipo_comprobante_id !== 'undefined' ? datos_afip.afip_tipo_comprobante_id : this.afip_tipo_comprobante_id
			let incoterms = typeof datos_afip.incoterms !== 'undefined' ? datos_afip.incoterms : this.incoterms
			let forma_de_pago = typeof datos_afip.forma_de_pago !== 'undefined' ? datos_afip.forma_de_pago : this.forma_de_pago
			let permiso_existente = typeof datos_afip.permiso_existente !== 'undefined' ? datos_afip.permiso_existente : this.permiso_existente

			if (
				afip_information_id
				&& this.maked_sale.total_a_facturar > 0
			) {

				this.interval = window.setInterval(() => {
					this.ticket_demorado()
				}, 5000)

				this.mostrar_tarjeta()

				this.$api.post('afip-ticket', {
					sale_id: this.maked_sale.id,
					ventas_afip_information_id: afip_information_id,
					afip_tipo_comprobante_id: afip_tipo_comprobante_id,
					incoterms: incoterms,
					forma_de_pago: forma_de_pago,
					permiso_existente: permiso_existente,
				})
				.then(res => {

		            window.clearInterval(this.interval)
					this.interval = null

					this.ocultar_mensaje_demorado()

					let sale = res.data.sale

					this.$store.commit('sale/add', sale)
					this.$store.commit('vender/setSale', sale)
					this.$store.commit('vender/set_ultima_venta_sesion', sale)

					if (sale.afip_errors.length) {
						this.$toast.error('Afip informo errores', {
							duration: 6000
						})
					}

					if (sale.afip_observations.length) {
						this.$toast.error('Afip informo observaciones', {
							duration: 6000
						})
					}

					this.mostrar_mensaje_exitoso()

					/*
						La limpieza de AFIP ya no vive acá. Vivía adentro de este .then(), así que sólo
						se limpiaba cuando la factura salía bien: si la venta no se facturaba, si AFIP
						fallaba o si la venta se guardaba sin conexión, el punto de venta quedaba pegado
						para la venta siguiente. Además llegaba tarde y borraba el punto de venta que el
						usuario ya hubiera elegido para la venta nueva mientras la factura estaba en vuelo.
					*/

					setTimeout(() => {
						this.ocultar_tarjeta()
					}, 2000)
					
				})
				.catch(err => {
					// this.$bvModal.hide('loading-afip-ticket')
		            window.clearInterval(this.interval)
					console.log(err)
					if (err.message == 'Request failed with status code 500') {
						this.$store.commit('vender/setAfipResult', [{Msg: 'Ocurrio un error en el servidor de AFIP'}])
					}
					this.$toast.error('Error al facturar')
					setTimeout(() => {
						this.ocultar_tarjeta()
					}, 2000)
				})
			}
		},
		limpiar_afip() {
			this.$store.commit('vender/setAfipInformationId', 0)
			this.$store.commit('vender/set_afip_tipo_comprobante_id', 0)
			this.$store.commit('vender/set_forma_de_pago', '')
			this.$store.commit('vender/set_permiso_existente', '')
		},
		ticket_demorado() {
			document.getElementById('loading-afip-ticket').classList.add('loading-afip-ticket-demorado')
		},
	}
}