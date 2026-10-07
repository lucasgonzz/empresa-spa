/**
 * Descuentos y recargos en el pie del Ticket 2.0 (ESC/POS).
 *
 * Es el espejo de `Footer()` de `SaleTicketPdf.php` (el ticket PDF de 80mm): sin estos renglones
 * el ticket nunca explica por que el TOTAL A PAGAR difiere de la suma de los articulos.
 *
 * Todo sale de campos que la API ya manda en la venta (`Sale::scopeWithAll` carga `discounts`,
 * `surchages` y `current_acount_payment_methods`), asi que no hay contrato nuevo: si una API
 * vieja no manda algun campo, ese renglon simplemente no se imprime.
 *
 * 🔴 Los nombres de los metodos llevan "pie" a proposito: el mixin global de common-vue pisa por
 * nombre cualquier metodo o prop que coincida, y un `renglones` o `formatear_renglon` a secas
 * es justo el tipo de nombre que ya existe en otros componentes.
 */

/**
 * Tolerancia de un centavo para decidir si hay canje de puntos. Es la misma que usa
 * `PuntosComprobanteHelper::DELTA` en el PDF: un canje de $0,004 no merece un renglon.
 */
const TOLERANCIA_CANJE = 0.01

export default {
    methods: {

        /**
         * Imprime en el ticket los renglones de la cuenta entre el sub total y el total.
         *
         * Va inmediatamente antes de `total()`. Si la venta no tiene nada de esto no agrega
         * ni una linea, y el ticket sale identico al de antes.
         */
        descuentos_y_recargos() {
            let self = this

            /*
             * El desglose es informacion secundaria: si por un dato raro la cuenta tira una
             * excepcion, el ticket tiene que salir igual, sin el pie. Sin este try/catch el error
             * llegaria al .catch de printTicket() y el cliente veria "No se pudo armar el ticket"
             * sin poder imprimir una venta que ya cobro.
             */
            try {
                self.renglones_pie_descuentos_y_recargos().forEach(function (renglon) {
                    self.content.push(self.formatear_renglon_pie(renglon.etiqueta, renglon.importe) + "\n")
                })
            } catch (error) {
                console.error('No se pudo armar el desglose de descuentos y recargos del Ticket 2.0:', error)
            }
        },

        /**
         * Arma los renglones de la cuenta, sin tocar `this.content` (por eso es testeable).
         *
         * El orden y la cuenta son los de `SaleTicketPdf::Footer()` y los de
         * `vender_set_total.js`: Total, descuentos, recargos, canje, descuentos por medio de
         * pago y ajuste forzado. Cada renglon muestra el total CORRIDO hasta ese punto.
         *
         * @returns {Array<{etiqueta: string, importe: string}>} vacio si no hay nada que mostrar.
         *          `importe` viene vacio cuando el sub total no es un numero: se imprime la
         *          etiqueta sola antes que un `NaN` en el papel.
         */
        renglones_pie_descuentos_y_recargos() {
            let sale = this.sale_to_print

            if (!sale) {
                return []
            }

            // Pueden faltar en una API vieja o en una venta armada a mano: se tratan como vacios.
            let descuentos = Array.isArray(sale.discounts) ? sale.discounts : []
            let recargos = Array.isArray(sale.surchages) ? sale.surchages : []

            /*
             * 🔴 Con `aplicar_recargos_directo_a_items` prendido el recargo YA esta metido en el
             * precio de cada renglon, y por lo tanto en `sub_total`. La venta conserva igual la
             * relacion `surchages` (SaleHelper la adjunta), y el servidor la saltea en ese caso
             * (`SaleHelper::getTotalSale()`: `!$sale->aplicar_recargos_directo_a_items`). Si aca se
             * aplicara de nuevo, el papel diria "Rec 5% $1.102" arriba de un TOTAL A PAGAR de
             * $1.050. El flag puede venir como 0/1, "0"/"1" o booleano: por eso el Number().
             */
            if (Number(sale.aplicar_recargos_directo_a_items)) {
                recargos = []
            }
            let medios_de_pago = Array.isArray(sale.current_acount_payment_methods) ? sale.current_acount_payment_methods : []

            let descuento_puntos = this.numero_del_pie(sale.descuento_puntos)
            let hay_canje = descuento_puntos !== null && descuento_puntos > TOLERANCIA_CANJE

            // Solo los medios que de verdad descontaron algo: en el resto el pivot trae null.
            let medios_con_descuento = medios_de_pago.filter(function (medio) {
                return medio && medio.pivot && medio.pivot.discount_amount !== null
                    && typeof medio.pivot.discount_amount !== 'undefined'
            })

            let ajuste_forzado = this.numero_del_pie(sale.forzar_total_monto)
            let hay_ajuste = ajuste_forzado !== null && ajuste_forzado !== 0

            if (!descuentos.length && !recargos.length && !hay_canje && !medios_con_descuento.length && !hay_ajuste) {
                return []
            }

            /*
             * El corrido arranca en `sub_total` (la suma de los renglones, antes de tocar nada) y
             * NO en `total`: `total` ya trae todo aplicado. Si `sub_total` no es un numero queda
             * en null y de ahi en mas no se calcula nada, solo se muestran las etiquetas.
             */
            let corrido = this.numero_del_pie(sale.sub_total)

            // Un sub_total en 0 no es un dato confiable (el comando que lo rellena tambien lo trata
            // asi): imprimir "Total $0 / Desc 10% $0" seria peor que mostrar solo las etiquetas.
            if (corrido !== null && corrido <= 0) {
                corrido = null
            }
            let renglones = []
            let self = this

            function agregar(etiqueta) {
                renglones.push({
                    etiqueta: etiqueta,
                    importe: corrido === null ? '' : self.price(corrido, false),
                })
            }

            agregar('Subtotal')

            /*
             * Los descuentos y recargos son PORCENTAJES sobre el corrido, no sobre el sub total:
             * un 10% de descuento y despues un 5% de recargo dan 100 -> 90 -> 94,5, y no 95. Es
             * como los aplica el front y como los muestra el PDF; cambiar la base descuadra el
             * ticket contra la factura.
             */
            descuentos.forEach(function (descuento) {
                let porcentaje = self.numero_del_pie(descuento && descuento.pivot ? descuento.pivot.percentage : null)

                if (porcentaje === null) {
                    return
                }

                if (corrido !== null) {
                    corrido -= corrido * porcentaje / 100
                }

                agregar('Desc ' + self.porcentaje_es(descuento.pivot.percentage) + '%')
            })

            recargos.forEach(function (recargo) {
                let porcentaje = self.numero_del_pie(recargo && recargo.pivot ? recargo.pivot.percentage : null)

                if (porcentaje === null) {
                    return
                }

                if (corrido !== null) {
                    corrido += corrido * porcentaje / 100
                }

                agregar('Rec ' + self.porcentaje_es(recargo.pivot.percentage) + '%')
            })

            // El canje va despues de los porcentajes y antes de los medios de pago, igual que el PDF.
            if (hay_canje) {
                if (corrido !== null) {
                    corrido -= descuento_puntos
                }

                let puntos = this.puntos_del_pie(sale.puntos_canjeados)

                // Si la API no manda los puntos canjeados se imprime "Canje" a secas, sin "  pts" huerfano.
                agregar(puntos ? 'Canje ' + puntos + ' pts' : 'Canje')
            }

            /*
             * El descuento por medio de pago es un MONTO en pesos, no un porcentaje: se resta
             * tal cual. La etiqueta lleva las 3 primeras letras del medio porque en 58mm no
             * entra el nombre entero (es lo mismo que recorta el PDF con substr).
             */
            medios_con_descuento.forEach(function (medio) {
                let monto = self.numero_del_pie(medio.pivot.discount_amount)

                if (monto === null) {
                    return
                }

                if (corrido !== null) {
                    corrido -= monto
                }

                let nombre = medio.name ? String(medio.name).substring(0, 3) : ''

                agregar(('Desc ' + self.price(monto, false) + ' ' + nombre).trim())
            })

            /*
             * El ajuste del total forzado viene CON SIGNO (negativo = se bajo el total, positivo =
             * se subio), por eso se SUMA tal cual: restarlo, como el canje, convertiria cada
             * redondeo hacia abajo en un recargo. Va ultimo porque es lo ultimo que le pasa al total.
             */
            if (hay_ajuste) {
                if (corrido !== null) {
                    corrido += ajuste_forzado
                }

                agregar('Ajuste ' + (ajuste_forzado < 0 ? '-' : '+') + self.price(Math.abs(ajuste_forzado), false))
            }

            /*
             * 🔴 RED DE SEGURIDAD: un pie que no cierra es peor que un pie sin importes.
             *
             * El ticket no conoce todo lo que el servidor metio en `sale.total`: los servicios solo
             * reciben el descuento o el recargo si `discounts_in_services` / `surchages_in_services`
             * estan prendidos (la SPA los manda en 0 por defecto), el reparto por medio de pago o
             * cuotas no se guarda en la venta, y `table_articles.js` ni siquiera lista los servicios.
             * Si el corrido no llega a `sale.total` (con la misma tolerancia de un peso entero que
             * usa el PDF), se conserva el Subtotal --que es `sub_total` y es verdad-- y el resto de
             * los renglones queda solo con su etiqueta: el cliente ve QUE descuentos y recargos hubo,
             * sin una cuenta falsa encima.
             */
            let total_guardado = this.numero_del_pie(sale.total)

            if (corrido === null || total_guardado === null || Math.abs(corrido - total_guardado) >= 1) {
                renglones.forEach(function (renglon, indice) {
                    if (indice > 0 || corrido === null) {
                        renglon.importe = ''
                    }
                })
            }

            /*
             * 🔴 El TOTAL A PAGAR que imprime `total()` sigue siendo `sale.total`, NO este corrido.
             * `sale.total` es lo que el servidor guardo y lo que se cobro de verdad; el corrido es
             * solo la explicacion de como se llega. Si alguna vez no coinciden (un redondeo, un
             * concepto que el ticket no desglosa), el papel tiene que decir lo que se cobro.
             */
            return renglones
        },

        /**
         * Una fila del pie: etiqueta a la izquierda, importe pegado a la derecha, ancho
         * `TICKET_WIDTH`. Si la etiqueta no entra se recorta: nunca desborda ni pisa el importe.
         *
         * No agrega el salto de linea; lo pone quien la llama (como las filas de la tabla).
         *
         * @param {string} etiqueta
         * @param {string} importe puede venir vacio
         * @returns {string}
         */
        formatear_renglon_pie(etiqueta, importe) {
            let ancho = this.TICKET_WIDTH
            importe = importe || ''

            // Sin importe la etiqueta usa todo el ancho; con importe se deja al menos un espacio.
            let ancho_etiqueta = importe.length ? Math.max(0, ancho - importe.length - 1) : ancho

            return String(etiqueta).substring(0, ancho_etiqueta).padEnd(ancho - importe.length, ' ') + importe
        },

        /**
         * Convierte un valor crudo de la API (numero, string decimal de Laravel, null) a numero.
         *
         * `Number(null)` es 0 y `Number('')` tambien: sin este filtro una API que no manda el
         * campo imprimiria un renglon de $0 como si fuera un dato real.
         *
         * @param {*} valor
         * @returns {number|null} null si no hay valor o no es numerico.
         */
        numero_del_pie(valor) {
            if (valor === null || typeof valor === 'undefined' || valor === '') {
                return null
            }

            let numero = Number(valor)

            return isNaN(numero) ? null : numero
        },

        /**
         * Los puntos canjeados para la etiqueta: sin decimales si es un entero (500) y con
         * dos si no lo es (12,5), igual que `formato_puntos()` del PDF.
         *
         * @param {*} valor
         * @returns {string} vacio si no hay valor numerico.
         */
        puntos_del_pie(valor) {
            let puntos = this.numero_del_pie(valor)

            if (puntos === null) {
                return ''
            }

            let decimales = Math.abs(puntos - Math.round(puntos)) > TOLERANCIA_CANJE ? 2 : 0

            return this.numero_es_con_decimales(puntos, decimales)
        },
    },
}
