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
        /*
            Reparto del importe personalizado por alicuota: [{ key: '21', importe: 12100 }, ...].
            `key` es la clave interna de AFIP ('10' es 10,5 % y '2' es 2,5 %) e `importe` es el
            total de esa alicuota CON IVA. Vacio = el backend liquida todo al 21 %, como hoy.
        */
        importe_personalizado_ivas: {
            get() {
                return this.$store.state.afip_ticket.importe_personalizado_ivas
            },
            set(value) {
                this.$store.commit('afip_ticket/set_importe_personalizado_ivas', value)
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

        /**
         * Emite las facturas de las ventas seleccionadas, de a una y en orden.
         *
         * La secuencia se arma con recursion sobre emitir_una(index), encadenando con .then():
         * en src/ del repo no se usa la sintaxis asincronica moderna. Que sea SECUENCIAL no es
         * un detalle de estilo: se factura de a una contra ARCA y ese orden no se puede perder.
         */
        enviar_afip_tickets() {
            this.$store.commit('afip_ticket/set_afip_tickets_for_make', [])

            this.setAfipTicketsForMake()

            this.$bvModal.show('send-afip-tickets')

            this.emitir_una(0)
        },
        /**
         * Emite la venta de la posicion index y encadena la siguiente.
         * Cuando no quedan mas ventas corre el bloque de cierre.
         *
         * @param {Number} index
         */
        emitir_una(index) {
            let self = this

            if (index >= this.selected_sales.length) {
                this.terminar_emision()
                return
            }

            this.send_request(index)
            .then(res => {
                /*
                    🔴 send_request traga el error en su propio .catch y devuelve resolved, asi
                    que cuando la factura fallo aca llega `undefined`. Sin esta guarda,
                    res.data reventaria y la cadena se cortaria en la primera venta que falla.
                */
                if (!res) {
                    self.emitir_una(index + 1)
                    return
                }

                self.$store.commit('sale/add', res.data.sale)

                self.afip_tickets_for_make[index].maked = true

                if (res.data.sale.afip_errors.length) {
                    self.afip_tickets_for_make[index].errors = true
                }
                if (res.data.sale.afip_observations.length) {
                    self.afip_tickets_for_make[index].observations = true
                }

                self.emitir_una(index + 1)
            })
            .catch(() => {
                /*
                    Red de seguridad: send_request ya avisa por toast y nunca rechaza, asi que
                    aca solo puede llegar un error del bloque de arriba. La cadena sigue igual
                    para que una respuesta rara no deje sin facturar a las ventas que vienen
                    despues.
                */
                self.emitir_una(index + 1)
            })
        },
        /**
         * Limpieza y cierre despues de emitir todas las facturas. Los 2 segundos de espera son
         * los de siempre: dan tiempo a leer el resultado de la ultima venta antes de que el
         * modal se cierre solo.
         */
        terminar_emision() {
            let self = this

            setTimeout(() => {

                self.ventas_afip_information_id = 0
                self.afip_tipo_comprobante_id = 0

                self.$store.commit('sale/setIsSelecteable', 0)
                self.$store.commit('sale/setSelected', [])

                self.$store.commit('afip_ticket/set_forma_de_pago', '')
                self.$store.commit('afip_ticket/set_permiso_existente', '')
                self.$store.commit('afip_ticket/set_incoterms', 'FOB')
                self.$store.commit('afip_ticket/set_monto_a_facturar', '')
                self.$store.commit('afip_ticket/set_importe_personalizado_ivas', [])

                self.$bvModal.hide('send-afip-tickets')
                self.$bvModal.hide('confirm-make-afip-tickets')
                self.$bvModal.hide('sale')
                self.$bvModal.hide('afip-reenviar-facturas')

                self.$store.dispatch('afip_ticket/get_problemas_al_facturar')

            }, 2000)
        },
        send_request(index) {
            let self = this
            return this.$api.post('afip-ticket', {
                sale_id: this.selected_sales[index].id,
                ventas_afip_information_id: this.ventas_afip_information_id,
                afip_tipo_comprobante_id: this.afip_tipo_comprobante_id,
                monto_a_facturar: this.monto_a_facturar,
                /*
                    Reparto del importe personalizado por alicuota. Va siempre, aunque este
                    vacio: vacio significa "no repartir" y el backend liquida todo al 21 %.
                */
                importe_personalizado_ivas: this.importe_personalizado_ivas,
                afip_fecha_emision: this.afip_fecha_emision,
                forma_de_pago: this.forma_de_pago,
                permiso_existente: this.permiso_existente,
                incoterms: this.incoterms,
            })
            .catch(err => {
                /*
                    El backend rechaza con 422 y un message explicando por que (importe mayor al
                    total de la venta, reparto que no suma). Ese texto es lo unico que le dice al
                    usuario que corregir, asi que se muestra tal cual cuando viene.
                */
                let mensaje = err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : 'Error al emitir factura para la venta N° ' + self.selected_sales[index].num

                self.$toast.error(mensaje)
                self.afip_tickets_for_make[index].maked = false
                self.$store.dispatch('sale/getModels')
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