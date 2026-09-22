// sync_sales.js
import db from './db'
import moment from 'moment'

export default {
    methods: {
        /**
         * Guarda una venta localmente en IndexedDB
         *
         * 🔴 En esta tabla conviven DOS fechas distintas y es facil confundirlas:
         *
         *  - `created_at`: cuando se CAPTURO la venta estando sin internet. Es un campo LOCAL de
         *    Dexie (esta indexado en offline/db.js), lo escribe esta funcion y nunca viaja al
         *    backend: sync_pending_sales() lo borra antes del POST. Se usa para ordenar y para
         *    mostrarle al usuario de cuando era la venta (`fecha_original` del modal de ventas
         *    sincronizadas y los toasts de error de abajo).
         *
         *  - `created_at_elegido`: el dia 'YYYY-MM-DD' que el VENDEDOR eligio en la etapa 1 de
         *    Vender. Es el que el backend tiene que persistir como `created_at` de la venta, y
         *    sync_pending_sales() lo manda con ese nombre en el cuerpo del POST.
         *
         * Por eso la fecha elegida entra con nombre propio y no como `created_at`: si usara el
         * mismo nombre, el spread de aca abajo la pisaria con el momento de la captura.
         *
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
                            delete sale_to_sync.created_at_elegido

                            /*
                                🔴 Las dos fechas de esta tabla, en el unico lugar donde se cruzan
                                (el detalle esta en el comentario de save_sale_offline()):

                                 - `sale.created_at` es LOCAL --cuando se capturo la venta offline--
                                   y por eso se borra arriba: no tiene nada que hacer en el POST.
                                 - `sale.created_at_elegido` es el dia que eligio el vendedor, y es
                                   justamente el que el backend espera bajo el nombre `created_at`
                                   (SaleHelper::resolver_created_at() le suma la hora actual).

                                La clave solo se manda si esta: una venta guardada en IndexedDB
                                ANTES de esta version no la tiene, y mandar `created_at: undefined`
                                --o null-- seria peor que no mandarla, porque el back ya sabe caer a
                                now() cuando la clave no viaja.
                            */
                            if (sale.created_at_elegido) {
                                sale_to_sync.created_at = sale.created_at_elegido
                            }

                            /*
                                Los dos avisos globales del interceptor de main.js se apagan para
                                este POST: el rechazo lo avisa el catch de abajo, con la venta
                                identificada. Sin esto, el 422 de "esta cuenta trabaja con listas de
                                precios" --o cualquier otro rechazo-- salia como un toast generico en
                                cada reconexion, sin decir que era una venta offline ni cual.
                            */
                            const response = await this.$api.post('/sale', sale_to_sync, {
                                skip_global_error_event: true,
                                skip_global_validation_toast: true,
                            })

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
                                        /*
                                            La de la CAPTURA offline, no la que eligio el vendedor:
                                            el modal de ventas sincronizadas muestra de cuando es la
                                            venta que quedo esperando conexion. Ver el comentario de
                                            save_sale_offline().
                                        */
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

                            /*
                                🔴 Un 4xx es un RECHAZO del servidor, y el servidor no va a cambiar
                                de opinion en la proxima reconexion: hasta esta mision la venta se
                                reintentaba para siempre --en cada evento `online` y en cada login--
                                y lo unico que veia el usuario era el toast generico del handler
                                global, sin saber que era una venta offline ni cual. Se avisa CUAL
                                venta y por que.

                                NO se borra de IndexedDB: es una venta hecha, con plata cobrada; que
                                hacer con ella lo decide una persona, no un catch. El aviso lo dice.
                            */
                            let status = error && error.response ? error.response.status : null
                            let message = error && error.response && error.response.data && error.response.data.message
                                ? error.response.data.message
                                : (error && error.message ? error.message : 'sin detalle')
                            let fecha = sale.created_at ? moment(sale.created_at).format('DD/MM/YYYY HH:mm') : 'sin fecha'
                            let total = this.price(sale.total)

                            if (status && status >= 400 && status < 500) {
                                this.$toast.error(`La venta offline del ${fecha} por ${total} fue rechazada: ${message}. Sigue guardada en este equipo.`, {
                                    duration: 15000,
                                    position: 'top-right',
                                })
                            } else {
                                /*
                                    Caida de red o error del servidor: no es un rechazo, se vuelve a
                                    intentar con la proxima conexion. Se avisa igual porque el aviso
                                    global quedo apagado para este POST y antes si se veia.
                                */
                                this.$toast.warning(`No se pudo sincronizar la venta offline del ${fecha} por ${total}: ${message}. Se vuelve a intentar con la proxima conexion.`, {
                                    duration: 8000,
                                    position: 'top-right',
                                })
                            }
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
