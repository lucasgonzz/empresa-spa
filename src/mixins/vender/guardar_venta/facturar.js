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

				/*
					La tarjeta arranca limpia: si la anterior quedó en rojo por un rechazo de ARCA y no
					se cerró con "Cerrar", seguiría mostrando ese rechazo en lugar del "Enviando".
				*/
				this.$store.commit('vender/setAfipResult', [])

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

					/*
						Rechazo de ARCA (misión destrabar-videos-centro, 16/10/2026): la venta vuelve con
						`afip_errors` y sin CAE. Hasta acá la tarjeta se ponía verde con «Comprobante
						generado correctamente» y se cerraba sola a los 2 segundos, o sea que le decía al
						usuario que se generó un comprobante que ARCA rechazó. Ahora la tarjeta pasa a rojo
						con lo que dijo ARCA y queda abierta hasta que el usuario toca «Cerrar». El toast
						de arriba se mantiene.
					*/
					if (this.arca_rechazo_el_comprobante(sale)) {
						if (!sale.afip_errors || !sale.afip_errors.length) {
							this.$toast.error('Afip informo errores', {
								duration: 6000
							})
						}
						this.$store.commit('vender/setAfipResult', this.mensajes_de_arca(sale))
						return
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
		/*
			El ticket que se acaba de pedir: el de id más alto de la venta. `POST afip-ticket`
			(SaleController@makeAfipTicket) devuelve solo la venta, sin el ticket aparte.
		*/
		ultimo_ticket_de_la_venta(sale) {
			let ultimo = null
			let tickets = sale && sale.afip_tickets ? sale.afip_tickets : []
			tickets.forEach(ticket => {
				if (ticket && (!ultimo || ticket.id > ultimo.id)) {
					ultimo = ticket
				}
			})
			return ultimo
		},
		/*
			Los errores de ARCA del ULTIMO intento. Salen del ticket (`afip_tickets.afip_errors`, que la
			venta trae cargado): el rechazo tipico de ARCA (AfipWsfeHelper::checkErrors) graba el error
			con `afip_ticket_id` bien pero con `sale_id` = id del TICKET, asi que `sale.afip_errors`
			(por sale_id) viene vacio o con errores de otra venta. Es la misma fuente que usan Alertas y
			BtnFactura. Si el ticket no trae errores (los que se graban sin ticket, como una falla de
			conexion con ARCA), se usan los de la venta.
		*/
		errores_del_ultimo_intento(sale) {
			let ultimo = this.ultimo_ticket_de_la_venta(sale)
			if (ultimo && ultimo.afip_errors && ultimo.afip_errors.length) {
				return ultimo.afip_errors
			}
			return sale && sale.afip_errors ? sale.afip_errors : []
		},
		/*
			ARCA rechazó el comprobante: el ÚLTIMO ticket de la venta (el que se acaba de pedir) no
			tiene CAE y hay errores que mostrar. Se mira el último y no "alguno": en una facturación
			parcial la venta ya puede tener otro ticket autorizado, y con el rechazo de la parte nueva
			la tarjeta no tiene que ponerse verde. Si el último tiene CAE, la tarjeta sigue el camino de
			siempre (y los errores que pudiera traer la venta son de un intento anterior).
		*/
		arca_rechazo_el_comprobante(sale) {
			if (!sale) {
				return false
			}
			let ultimo = this.ultimo_ticket_de_la_venta(sale)
			if (ultimo && ultimo.cae) {
				return false
			}
			return this.errores_del_ultimo_intento(sale).length > 0
		},
		/*
			Los errores de ARCA en la forma que dibuja la tarjeta (LoadingAfipTicket: una línea por
			cada `Msg`). `AfipError` guarda `message` y `code`.
		*/
		mensajes_de_arca(sale) {
			let mensajes = []
			this.errores_del_ultimo_intento(sale).forEach(afip_error => {
				let texto = afip_error.message || ''
				if (afip_error.code && texto.indexOf(String(afip_error.code)) == -1) {
					texto = afip_error.code + ' - ' + texto
				}
				mensajes.push({Msg: texto})
			})
			return mensajes
		},
		limpiar_afip() {
			this.$store.commit('vender/setAfipInformationId', 0)
			this.$store.commit('vender/set_afip_tipo_comprobante_id', 0)
			this.$store.commit('vender/set_forma_de_pago', '')
			this.$store.commit('vender/set_permiso_existente', '')
			/*
				La condicion de venta del comprobante de exportacion (tipo 8) vuelve a su valor
				inicial del store (0) junto con los otros dos campos de ese comprobante. Nadie la
				limpiaba: la venta siguiente salia a AFIP con el incoterm de la anterior, y como
				el tipo vuelve a 0 aca mismo, el select (SelectIncoterms.vue, con su propio dato
				local) se desmontaba y no habia forma de verlo. Va ACA y no en limpiar_vender()
				a proposito: en los caminos que solo llaman a limpiar_vender (Limpiar, guardar un
				presupuesto) el tipo 8 queda como estaba y el select sigue montado con su valor,
				y reiniciar el store ahi dejaria la pantalla diciendo una cosa y el POST otra.
			*/
			this.$store.commit('vender/set_incoterms', 0)
		},
		ticket_demorado() {
			document.getElementById('loading-afip-ticket').classList.add('loading-afip-ticket-demorado')
		},
	}
}