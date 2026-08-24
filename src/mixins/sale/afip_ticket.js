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
         * Arma un item del motor por cada venta seleccionada.
         *
         * Los datos de AFIP se SNAPSHOTEAN aca en vez de leerse en vivo dentro de send_request,
         * para que el motor pueda emitir listas donde cada venta tiene sus propios datos (por
         * ejemplo, una fecha de emision distinta por venta). El comportamiento de hoy no cambia
         * porque nadie toca esos valores mientras la cadena corre: los unicos que los escriben
         * son los v-model de ConfirmAfipTickets (ya confirmado, con el boton deshabilitado) y
         * terminar_emision(), que corre despues.
         *
         * @return {Array}
         */
        items_desde_seleccion() {
            return this.selected_sales.map(sale => {
                return {
                    sale: sale,
                    maked: false,
                    errors: false,
                    observations: false,
                    /*
                        fallo se crea aca, con el item, y no se agrega despues cuando la request
                        muere: en Vue 2 una propiedad agregada a un objeto ya existente no es
                        reactiva y el modal de progreso nunca se enteraria del error.
                    */
                    fallo: false,
                    datos_afip: {
                        ventas_afip_information_id: this.ventas_afip_information_id,
                        afip_tipo_comprobante_id: this.afip_tipo_comprobante_id,
                        monto_a_facturar: this.monto_a_facturar,
                        importe_personalizado_ivas: this.importe_personalizado_ivas,
                        /*
                            afip_fecha_emision NO existe en este mixin ni en el store: es un
                            data() de ConfirmAfipTickets.vue. Desde afip-reenviar-facturas/Btn.vue
                            vale undefined, axios lo saca del body y el backend factura con fecha
                            de hoy. Se copia TAL CUAL, undefined incluido: ponerle un default tipo
                            moment().format('YYYY-MM-DD') cambiaria el body del reenvio de
                            facturas, que es justo lo que este refactor promete no tocar.
                        */
                        afip_fecha_emision: this.afip_fecha_emision,
                        forma_de_pago: this.forma_de_pago,
                        permiso_existente: this.permiso_existente,
                        incoterms: this.incoterms,
                    },
                }
            })
        },
        /**
         * Arranca la emision en serie de la lista de items que le pasen.
         *
         * No abre ningun modal a proposito: cada llamador decide con que interfaz muestra el
         * progreso (el modal send-afip-tickets, o el suyo propio leyendo afip_tickets_for_make).
         *
         * @param {Array} items
         */
        iniciar_emision(items) {
            /*
                🔴 Una sola lista global gobierna DOS cosas: el corte del bucle y el body de cada
                POST. Arrancar una cadena con otra en vuelo no la cancela -- la vieja sigue
                avanzando sobre indices que ahora apuntan a OTRAS ventas: marca la fila
                equivocada y llega a postear dos veces la misma factura contra ARCA, que despues
                solo se deshace con nota de credito.

                No es teorico: alcanza con emitir desde Ventas y que mientras tanto termine la
                sincronizacion offline y se abra su modal encima del progreso.
            */
            if (this.hay_emision_en_curso()) {

                this.$toast.error('Ya hay una emision de facturas en curso. Espera a que termine.')

                return false
            }

            this.$store.commit('afip_ticket/set_afip_tickets_for_make', [])

            this.setAfipTicketsForMake(items)

            this.emitir_una(0)

            return true
        },
        /**
         * ¿Quedo alguna venta del lote anterior sin resolver? Se deriva de la lista y no de una
         * bandera aparte para que no exista el estado "la bandera quedo prendida": si el lote
         * termino, todos sus items estan en maked o en fallo.
         *
         * @return {Boolean}
         */
        hay_emision_en_curso() {
            let en_curso = false

            this.afip_tickets_for_make.forEach(item => {
                if (!item.maked && !item.fallo) {
                    en_curso = true
                }
            })

            return en_curso
        },
        /**
         * Emite las facturas de las ventas seleccionadas, de a una y en orden.
         *
         * La secuencia se arma con recursion sobre emitir_una(index), encadenando con .then():
         * en src/ del repo no se usa la sintaxis asincronica moderna. Que sea SECUENCIAL no es
         * un detalle de estilo: se factura de a una contra ARCA y ese orden no se puede perder.
         */
        enviar_afip_tickets() {
            let items = this.items_desde_seleccion()

            // Si hay otra emision en vuelo no se abre el progreso: no hay nada que mostrar.
            if (!this.iniciar_emision(items)) {
                return
            }

            this.$bvModal.show('send-afip-tickets')
        },
        /**
         * Emite la venta de la posicion index y encadena la siguiente.
         * Cuando no quedan mas ventas corre el bloque de cierre.
         *
         * @param {Number} index
         */
        emitir_una(index) {
            let self = this

            /*
                Se corta por la lista del motor y no por selected_sales porque el motor ahora
                emite cualquier lista de items, venga o no de la seleccion de Ventas. Para el
                camino de hoy es equivalente: iniciar_emision limpia y rearma la lista 1:1 con
                las ventas seleccionadas.
            */
            if (index >= this.afip_tickets_for_make.length) {
                this.terminar_emision()
                return
            }

            this.send_request(index)
            .then(res => {
                let item = self.afip_tickets_for_make[index]

                /*
                    🔴 Dos casos distintos, los dos terminan aca y los dos tienen que marcar el
                    item como fallido:

                    1. send_request traga el error en su propio .catch y devuelve resolved, asi
                       que cuando la factura fallo aca llega `undefined`.
                    2. La respuesta vino 200 pero SIN venta adentro. makeAfipTicket contesta
                       `response(null, 200)` cuando no encuentra la venta, y con eso `res` es
                       truthy: pasaba esta guarda y reventaba mas abajo, en la mutation sale/add,
                       que hace value.id sobre undefined. El TypeError caia al .catch de abajo y
                       la cadena seguia, pero el item quedaba sin `maked` Y sin `fallo`.

                    Un item que no queda ni en uno ni en otro deja el progreso mostrando un
                    spinner que no para nunca, porque no hay nada mas que lo mueva.
                */
                if (!res || !res.data || !res.data.sale) {
                    item.fallo = true
                    self.emitir_una(index + 1)
                    return
                }

                /*
                    maked se prende ANTES de tocar el store: la factura ya salio, y si sale/add
                    llegara a fallar por la forma de la respuesta, el progreso igual tiene que
                    decir la verdad.
                */
                item.maked = true

                self.$store.commit('sale/add', res.data.sale)

                if (res.data.sale.afip_errors.length) {
                    item.errors = true
                }
                if (res.data.sale.afip_observations.length) {
                    item.observations = true
                }

                self.emitir_una(index + 1)
            })
            .catch(() => {
                /*
                    Red de seguridad: send_request ya avisa por toast y nunca rechaza, asi que
                    aca solo puede llegar un error del bloque de arriba. La cadena sigue igual
                    para que una respuesta rara no deje sin facturar a las ventas que vienen
                    despues, y el item se marca para que el progreso no quede colgado.
                */
                let item = self.afip_tickets_for_make[index]

                if (item && !item.maked) {
                    item.fallo = true
                }

                self.emitir_una(index + 1)
            })
        },
        /**
         * ⚠️ Efecto aceptado a conciencia, no un descuido: esto tambien corre cuando la cadena la
         * arranco el modal de ventas offline, que se abre SOLO al volver la conexion y desde
         * cualquier pantalla. O sea que dos segundos despues de terminar de facturar se le limpia
         * la seleccion de Ventas al usuario y se le cierran los modales `sale` y
         * `afip-reenviar-facturas`, sin que el haya pedido nada.
         *
         * Antes esto solo pasaba cuando el usuario mismo habia arrancado la emision desde Ventas
         * o desde Reenviar facturas, donde limpiar era justamente lo que esperaba.
         *
         * Se dejo asi y no se acoto porque no pierde datos ni facturas -- lo unico que se pierde
         * es una seleccion de pantalla -- y separar los dos casos significaria partir el bloque de
         * cierre en dos, que es la clase de duplicacion que este refactor vino a evitar. Si algun
         * dia molesta de verdad, la salida es un parametro en iniciar_emision, no copiar el
         * bloque.
         *
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
            let item = this.afip_tickets_for_make[index]

            return this.$api.post('afip-ticket', {
                sale_id: item.sale.id,
                ventas_afip_information_id: item.datos_afip.ventas_afip_information_id,
                afip_tipo_comprobante_id: item.datos_afip.afip_tipo_comprobante_id,
                monto_a_facturar: item.datos_afip.monto_a_facturar,
                /*
                    Reparto del importe personalizado por alicuota. Va siempre, aunque este
                    vacio: vacio significa "no repartir" y el backend liquida todo al 21 %.
                */
                importe_personalizado_ivas: item.datos_afip.importe_personalizado_ivas,
                afip_fecha_emision: item.datos_afip.afip_fecha_emision,
                forma_de_pago: item.datos_afip.forma_de_pago,
                permiso_existente: item.datos_afip.permiso_existente,
                incoterms: item.datos_afip.incoterms,
            })
            .catch(err => {
                /*
                    El backend rechaza con 422 y un message explicando por que (importe mayor al
                    total de la venta, reparto que no suma). Ese texto es lo unico que le dice al
                    usuario que corregir, asi que se muestra tal cual cuando viene.
                */
                let mensaje = err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : 'Error al emitir factura para la venta N° ' + item.sale.num

                self.$toast.error(mensaje)
                item.maked = false
                item.fallo = true
                self.$store.dispatch('sale/getModels')
            })
        },
        /**
         * Carga en el store la lista de items que va a emitir el motor.
         *
         * @param {Array} items
         */
        setAfipTicketsForMake(items) {
            items.forEach(item => {
                this.$store.commit('afip_ticket/add_afip_tickets_for_make', item)
            })
        }
	}
}