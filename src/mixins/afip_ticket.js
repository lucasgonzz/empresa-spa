export default {
	computed: {
        maked_sale() {
            return this.$store.state.vender.sale
        },
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id
			}, 
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value)
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
		sendAfipTicket() {
			if (this.afip_information_id && this.maked_sale.total_a_facturar > 0) {
				this.interval = window.setInterval(() => {
					this.ticket_demorado()	
				}, 5000)

				this.mostrar_tarjeta()

				this.$api.post('afip-ticket', {
					sale_id: this.maked_sale.id,
					afip_information_id: this.afip_information_id
				})
				.then(res => {

		            window.clearInterval(this.interval)
					this.interval = null

					this.ocultar_mensaje_demorado()

					let sale = res.data.sale

					this.$store.commit('sale/add', sale)
					this.$store.commit('vender/setSale', sale)

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
		ticket_demorado() {
			document.getElementById('loading-afip-ticket').classList.add('loading-afip-ticket-demorado')
		},
	}
}