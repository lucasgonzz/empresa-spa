export default {
    computed: {
        selected_sales() {
            return this.$store.state.sale.selected
        },
        afip_tickets_for_make() {
            return this.$store.state.afip_ticket.afip_tickets_for_make
        },
        // Le puse ventas_afip_information_id para no confundirlo con el afip_information_id del mixin de vender set_afip_tipo_comprobante 
        ventas_afip_information_id: {
            get() {
                return this.$store.state.afip_ticket.afip_information_id
            },
            set(value) {
                this.$store.commit('afip_ticket/set_afip_information_id', value)
            }
        },
        forma_de_pago: {
            get() {
                return this.$store.state.afip_ticket.forma_de_pago
            },
            set(value) {
                this.$store.commit('afip_ticket/set_forma_de_pago', value)
            }
        },
        permiso_existente: {
            get() {
                return this.$store.state.afip_ticket.permiso_existente
            },
            set(value) {
                this.$store.commit('afip_ticket/set_permiso_existente', value)
            }
        },
        incoterms: {
            get() {
                return this.$store.state.afip_ticket.incoterms
            },
            set(value) {
                this.$store.commit('afip_ticket/set_incoterms', value)
            }
        },
        afip_tipo_comprobante_id: {
            get() {
                return this.$store.state.afip_ticket.afip_tipo_comprobante_id
            },
            set(value) {
                this.$store.commit('afip_ticket/set_afip_tipo_comprobante_id', value)
            }
        },
        monto_a_facturar: {
            get() {
                return this.$store.state.afip_ticket.monto_a_facturar
            },
            set(value) {
                this.$store.commit('afip_ticket/set_monto_a_facturar', value)
            }
        },
    },
	methods: {
        tiene_nota_de_credito_facturada(sale) {
            if (sale) {
                if (sale.current_acount) {
                    if (sale.current_acount.status == 'nota_credito') {
                        return true
                    }
                }
            }
            return false
        },

        async enviar_afip_tickets() {
            this.$store.commit('afip_ticket/set_afip_tickets_for_make', [])

            this.setAfipTicketsForMake()

            console.log('enviar_afip_tickets')

            console.log('selected_sales:')
            console.log(this.selected_sales)

            console.log('afip_tickets_for_make:')
            console.log(this.afip_tickets_for_make)


            this.$bvModal.show('send-afip-tickets')
            
            for (var i = 0; i < this.selected_sales.length; i++) {
                try {
                    let res = await this.send_request(i)
                    
                    setTimeout(() => {

                    }, 2000)

                    console.log('se facturo la venta')

                    this.$store.commit('sale/add', res.data.sale)

                    this.afip_tickets_for_make[i].maked = true

                    if (res.data.sale.afip_errors.length) {
                        this.afip_tickets_for_make[i].errors = true
                    }
                    if (res.data.sale.afip_observations.length) {
                        this.afip_tickets_for_make[i].observations = true
                    }

                } catch (err) {
                    console.log('errores al facturar:')
                    console.log(err)
                }
                
            }

            console.log('termino')

            console.log('afip_tickets_for_make:')
            console.log(this.afip_tickets_for_make)

            setTimeout(() => {

                this.ventas_afip_information_id = 0
                this.afip_tipo_comprobante_id = 0

                this.$store.commit('sale/setIsSelecteable', 0)
                this.$store.commit('sale/setSelected', [])

                this.$store.commit('afip_ticket/set_forma_de_pago', '')
                this.$store.commit('afip_ticket/set_permiso_existente', '')
                this.$store.commit('afip_ticket/set_incoterms', 'FOB')
                this.$store.commit('afip_ticket/set_monto_a_facturar', '')

                this.$bvModal.hide('send-afip-tickets')
                this.$bvModal.hide('confirm-make-afip-tickets')
                this.$bvModal.hide('sale')
                this.$bvModal.hide('afip-reenviar-facturas')

                this.$store.dispatch('afip_ticket/get_problemas_al_facturar')

            }, 2000)

        },
        send_request(index) {
            console.log('send_request monto_a_facturar:')
            console.log(this.monto_a_facturar)
            return this.$api.post('afip-ticket', {
                sale_id: this.selected_sales[index].id,
                ventas_afip_information_id: this.ventas_afip_information_id,
                afip_tipo_comprobante_id: this.afip_tipo_comprobante_id,
                monto_a_facturar: this.monto_a_facturar,
                afip_fecha_emision: this.afip_fecha_emision,
                forma_de_pago: this.forma_de_pago,
                permiso_existente: this.permiso_existente,
                incoterms: this.incoterms,
            })
            .catch(err => {
                this.$toast.error('Error al emitir factura para la venta N° '+this.selected_sales[index].num)
                this.afip_tickets_for_make[index].maked = false
            })
        },
        setAfipTicketsForMake() {
            this.selected_sales.forEach(sale => {
                this.$store.commit('afip_ticket/add_afip_tickets_for_make', {
                    sale: sale,
                    maked: false,
                    errors: false,
                    observations: false,
                })
            })
        }
	}
}