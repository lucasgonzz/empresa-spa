// sync_sales.js
import db from './db'

export default {
    methods: {
        /**
         * Guarda una venta localmente en IndexedDB
         * @param {Object} sale_data - Información completa de la venta
         */
        async save_sale_offline(sale_data) {
            console.log('agregando venta offlain:')
            console.log(sale_data)

            await db.sales.add({
                ...sale_data,
                created_at: new Date().toISOString()
            })

            const ventas = await db.sales.toArray()
            
            console.log('ventas guardadas:')
            console.log(ventas)

            // alert('🛒 Venta guardada en modo offline')

            let toast = '🛒 Venta guardada en modo offline'

            this.$toast.success(toast, {
                duration: 5000,
                position: 'top-right'
            })
        },

        /**
         * Intenta sincronizar todas las ventas no sincronizadas.
         *
         * Devuelve SIEMPRE un array (vacio si no se persistio nada), con un elemento por venta
         * que el servidor confirmo:
         *
         *     { sale: <modelo del servidor>, afip: {...}, fecha_original: <ISO string> }
         *
         * 🔴 Los datos de AFIP salen de la copia LOCAL, no del modelo que devuelve el servidor.
         * El modelo del servidor tiene `afip_information_id`, pero `forma_de_pago` y
         * `permiso_existente` no se persisten nunca en la tabla `sales`: viajan unicamente en el
         * POST a afip-ticket. Si se leyeran del modelo, se perderian justo antes de usarlos.
         *
         * @returns {Promise<Array>}
         */
        async sync_pending_sales() {
            try {

                console.log('sync_pending_sales')
                const pending_sales = await db.sales.toArray()

                console.log('ventas para guardar:')
                console.log(pending_sales)

                let ventas_sincronizadas = []
                /** Ventas que el servidor acepto pero no devolvio. Ver el comentario de abajo. */
                let ventas_sin_confirmar = 0

                if (pending_sales.length) {

                    for (const sale of pending_sales) {
                        try {
                            /** Evita enviar campos locales de IndexedDB al backend. */
                            const sale_to_sync = {
                                ...sale
                            }
                            delete sale_to_sync.id
                            delete sale_to_sync.created_at

                            const response = await this.$api.post('/sale', sale_to_sync)

                            if (response.status === 200 || response.status === 201) {

                                // Elimino venta en bbdd local
                                await db.sales.delete(sale.id)

                                /*
                                    SaleController::store() deduplica por usuario + cliente +
                                    empleado + total dentro de una ventana de 5 segundos, y cuando
                                    dispara hace `return;` seco: contesta 200 con el cuerpo VACIO,
                                    no con el modelo. Sin esta guarda, esa venta entraba a la lista
                                    como `undefined` y reventaba el modal que la va a mostrar.

                                    El arreglo de fondo es del backend -- que devuelva la venta que
                                    ya existe en vez de nada --, y esta mision no toca empresa-api.
                                    Aca lo unico que se hace es no romper y avisar.
                                */
                                if (response.data && response.data.model && response.data.model.id) {

                                    ventas_sincronizadas.push({
                                        sale: response.data.model,
                                        afip: {
                                            ventas_afip_information_id: sale.afip_information_id,
                                            afip_tipo_comprobante_id: sale.afip_tipo_comprobante_id,
                                            incoterms: sale.incoterms,
                                            forma_de_pago: sale.forma_de_pago,
                                            permiso_existente: sale.permiso_existente,
                                        },
                                        fecha_original: sale.created_at,
                                    })
                                } else {
                                    ventas_sin_confirmar++
                                    console.warn(`⚠️ El servidor no devolvio el modelo de la venta ${sale.id}`)
                                }

                                console.log(`✅ Venta ${sale.id} sincronizada`)
                            }

                        } catch (error) {
                            console.error(`❌ Error al sincronizar venta ${sale.id}`, error)
                        }
                    }

                    /** Notifica solo la cantidad realmente guardada en servidor. */
                    if (ventas_sincronizadas.length) {

                        let toast = `🔁 Se sincronizaron ${ventas_sincronizadas.length} ventas offline exitosamente`
                        this.$toast.success(toast, {
                            duration: 5000,
                            position: 'top-right'
                        })
                    }

                    if (ventas_sin_confirmar) {

                        let toast = `El servidor no confirmo ${ventas_sin_confirmar} venta(s) offline. Revisa en Ventas que esten todas antes de seguir.`
                        this.$toast.warning(toast, {
                            duration: 8000,
                            position: 'top-right'
                        })
                    }
                }

                return ventas_sincronizadas

            } catch (e) {
                let error = '❌ Error al guardar ventas offline:'
                console.error(e)
                this.$toast.error(error, {
                    duration: 5000,
                    position: 'top-right'
                })

                /*
                    Se devuelve el array vacio y no undefined para que el que llama pueda
                    encadenar sin preguntar: un `.filter()` sobre undefined tira TypeError y
                    dejaria la sincronizacion de articulos a medias por un error de ventas.
                */
                return []
            }
        },

        notificar_ventas_guardadas(ventas_guardadas) {
            let text = 'Se guardaron correctamente las ventas'
            ventas_guardadas.forEach(sale => {
                text += ' N° '+sale.num+','
            })
            alert(text)
        }
    }
}
