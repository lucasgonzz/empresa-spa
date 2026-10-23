// sync_sales.js
import db from './db'
import moment from 'moment'

/**
 * Identificador único de una venta hecha sin conexión (misión ingreso-sin-internet, 23/10/2026).
 *
 * Viaja en el POST como `offline_uuid` y `SaleController::store()` lo usa para que subir la misma
 * venta dos veces dé UNA sola venta (si ya existe, devuelve esa). Cierra las dos pérdidas que tenía
 * la subida: la guarda anti doble clic del backend (mismo cliente, empleado y total en 5 segundos)
 * descartaba la segunda de dos ventas iguales subidas seguidas -- y la SPA la borraba del equipo --,
 * y una respuesta cortada en el camino hacía que la venta se volviera a subir y quedara duplicada.
 *
 * `crypto.randomUUID()` existe solo en contexto seguro (https o localhost) y en navegadores
 * nuevos; el respaldo arma un UUID v4 con `crypto.getRandomValues()`, que está en todos.
 *
 * @returns {string}
 */
export function generar_offline_uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID()
    }
    /** 16 bytes al azar, con los bits de versión (4) y variante (10xx) de un UUID v4. */
    let bytes = new Uint8Array(16)
    window.crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    let hex = ''
    for (let i = 0; i < bytes.length; i++) {
        hex += (bytes[i] + 0x100).toString(16).slice(1)
    }
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
}

/**
 * Campos que existen solo en la tabla `sales` de IndexedDB y no viajan nunca en el POST /sale.
 * `offline_uuid` NO está: ese sí viaja.
 */
const CAMPOS_LOCALES = ['id', 'created_at', 'created_at_elegido', 'rechazada_at', 'rechazo_mensaje', 'adjuntos_pendientes', 'owner_id_local']

/**
 * Cuenta las ventas guardadas en el equipo y lo deja en el store: `auth.ventas_sin_subir` (todas)
 * y `auth.ventas_rechazadas` (las que el servidor ya rechazó con un 4xx). Las muestra el aviso de
 * conexión; App.vue usa la diferencia para no frenar el cambio de versión por una venta rechazada
 * que nadie puede resolver desde ahí.
 *
 * @param {Object} store El store de Vuex.
 * @returns {Promise<void>} Nunca rechaza.
 */
export function contar_ventas_del_equipo(store) {
    return db.sales.toArray()
    .then(ventas => {
        store.commit('auth/set_ventas_sin_subir', ventas.length)
        store.commit('auth/set_ventas_rechazadas', ventas.filter(venta => venta.rechazada_at).length)
    })
    .catch(err => {
        console.log('No se pudieron contar las ventas del equipo', err)
    })
}

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

            /** Momento de la captura, el mismo para `created_at` (local) y `capturada_at` (viaja). */
            const ahora = new Date().toISOString()

            await db.sales.add({
                ...sale_data,
                /*
                    El identificador se genera ACA, una sola vez, y queda guardado con la venta: es
                    lo que hace que reintentar la subida no duplique. Si ya viene (no hoy), se
                    respeta.
                */
                offline_uuid: sale_data.offline_uuid || generar_offline_uuid(),
                /*
                    Las dos viajan en el POST y el backend las usa solo con `venta_offline`
                    (ver sync_pending_sales):
                    - `capturada_at`: el momento real de la venta; la hora de la venta guardada sale
                      de aca y no de la hora en que volvio internet.
                    - `cargada_por_duenio`: la cargo el dueño (Vender manda `employee_id` 0). Sin
                      esto, si la sube un empleado logueado mas tarde en este equipo, el backend la
                      ponia a nombre de ese empleado (vendedor, comision, caja).
                */
                capturada_at: ahora,
                cargada_por_duenio: (!sale_data.employee_id && this.is_owner) ? 1 : 0,
                /*
                    De que comercio es (campo LOCAL, no viaja): una venta se sube solo con una
                    sesion del mismo dueño (ver sync_pending_sales). Hoy cada origen es de un solo
                    comercio, pero es lo que evita que una venta termine en la cuenta de otro si
                    alguna vez dos comparten el mismo frente.
                */
                owner_id_local: this.owner_id,
                created_at: ahora
            })

            /*
                🔴 De aca para abajo la venta YA esta escrita. Nada de lo que sigue puede volver a
                quien llama como error: guardar_venta_offline() lo leeria como "no se guardo", el
                vendedor reintentaria y quedarian dos ventas. Por eso va en su propio try.
            */
            try {
                await contar_ventas_del_equipo(this.$store)

                let toast = '🛒 Venta guardada en modo offline'

                this.$toast.success(toast, {
                    duration: 5000,
                    position: 'top-right'
                })
            } catch (err) {
                console.log('La venta quedo guardada en el equipo, pero fallo lo de despues', err)
            }
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
         * @param {Object} opciones `{omitir_rechazadas: true}` saltea las ventas que el servidor ya
         *                         rechazó con un 4xx (las usa el reintento periódico, para no
         *                         repetir el mismo aviso cada 30 segundos). Sin opciones se
         *                         intentan todas, como siempre.
         * @returns {Promise<Array>}
         */
        sync_pending_sales(opciones) {
            /*
                🔴 Una sola pestaña por vez (misión ingreso-sin-internet, 23/10/2026). El candado
                `sincronizacion_offline_en_curso` es de cada pestaña, y el evento `online` les llega
                a todas a la vez: dos pestañas subían la misma venta en paralelo y cada una la
                ofrecía en su modal de facturación. Con Web Locks (mismo origen = mismo IndexedDB) la
                segunda espera a que termine la primera y, cuando entra, esas ventas ya no están en el
                equipo. El backend además devuelve la misma venta por `offline_uuid`. En un navegador
                sin Web Locks se sigue como antes.
            */
            if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
                return navigator.locks.request('cc-subir-ventas-offline', () => this.subir_ventas_del_equipo(opciones))
            }
            return this.subir_ventas_del_equipo(opciones)
        },

        /**
         * El cuerpo de sync_pending_sales(), ya con el candado entre pestañas tomado. Ver el
         * docblock de sync_pending_sales() para lo que devuelve.
         *
         * @param {Object} opciones
         * @returns {Promise<Array>}
         */
        async subir_ventas_del_equipo(opciones) {
            try {

                console.log('sync_pending_sales')
                let pending_sales = await db.sales.toArray()

                if (opciones && opciones.omitir_rechazadas) {
                    pending_sales = pending_sales.filter(sale => !sale.rechazada_at)
                }

                /*
                    Solo las de este comercio (ver `owner_id_local` en save_sale_offline). Las de
                    otro dueño se quedan en el equipo, sin tocarlas, hasta que entre una sesión suya.
                    Las guardadas antes de esta version no traen la marca y se suben como siempre.
                */
                pending_sales = pending_sales.filter(sale => !sale.owner_id_local || !this.owner_id || sale.owner_id_local == this.owner_id)

                console.log('ventas para guardar:')
                console.log(pending_sales)

                let ventas_sincronizadas = []
                /** Ventas que el servidor acepto pero no devolvio. Ver el comentario de abajo. */
                let ventas_sin_confirmar = 0

                if (pending_sales.length) {

                    for (const sale of pending_sales) {
                        try {
                            /*
                                Venta guardada ANTES de esta version: no tiene `offline_uuid`. Se le
                                da uno AHORA y se lo guarda en el equipo antes del POST, para que
                                tambien a ella la cubran la idempotencia (si la respuesta se pierde,
                                el reintento no la duplica) y `venta_offline` (la guarda anti doble
                                clic ya no descarta la segunda de dos ventas iguales). Su momento de
                                captura es su `created_at` local.
                            */
                            if (!sale.offline_uuid) {
                                sale.offline_uuid = generar_offline_uuid()
                                sale.capturada_at = sale.capturada_at || sale.created_at
                                await db.sales.update(sale.id, {
                                    offline_uuid: sale.offline_uuid,
                                    capturada_at: sale.capturada_at,
                                })
                            }

                            /** Evita enviar campos locales de IndexedDB al backend. */
                            const sale_to_sync = {
                                ...sale
                            }
                            CAMPOS_LOCALES.forEach(campo => {
                                delete sale_to_sync[campo]
                            })

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
                                `venta_offline`: esta venta se hizo sin conexion y se esta subiendo
                                ahora. Con el `offline_uuid`, le dice al backend que la guarda anti
                                doble clic de 5 segundos NO aplica (dos ventas sin conexion iguales,
                                subidas seguidas, son dos ventas: la guarda descartaba la segunda) y
                                que use `capturada_at` y `cargada_por_duenio`. Solo para las que
                                tienen uuid: las guardadas antes de esta version siguen el camino
                                de siempre.
                            */
                            if (sale.offline_uuid) {
                                sale_to_sync.venta_offline = 1
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
                                // Corre en segundo plano: cambiar de pantalla no la tiene que cortar.
                                skip_navigation_cancel: true,
                            })

                            /** ¿El servidor devolvio la venta (recien creada, o la que ya existia con este uuid)? */
                            let devolvio_la_venta = Boolean(response.data && response.data.model && response.data.model.id)

                            if ((response.status === 200 || response.status === 201) && !devolvio_la_venta && sale.offline_uuid) {
                                /*
                                    🔴 Una venta CON `offline_uuid` que vuelve sin modelo solo puede
                                    venir de una API anterior a la mision ingreso-sin-internet (la
                                    nueva devuelve siempre la venta, tambien cuando ya existia): ahi
                                    disparo la guarda anti doble clic (mismo cliente, empleado y
                                    total en 5 segundos) y el servidor NO la creo. No hay forma de
                                    saber si era una repeticion o una venta distinta por el mismo
                                    total, asi que NO se borra del equipo: se marca y se avisa, y
                                    decide una persona. Pasa solo en la ventana de un deploy.
                                */
                                await db.sales.update(sale.id, {
                                    rechazada_at: new Date().toISOString(),
                                    rechazo_mensaje: 'el servidor la tomó como repetida de otra venta igual',
                                }).catch(err => console.log(err))
                                ventas_sin_confirmar++
                                console.warn(`⚠️ El servidor no devolvio el modelo de la venta ${sale.id}; queda en el equipo`)

                            } else if (response.status === 200 || response.status === 201) {

                                // Elimino venta en bbdd local
                                await db.sales.delete(sale.id)

                                /*
                                    Venta guardada ANTES de esta version (sin `offline_uuid`):
                                    SaleController::store() deduplica por usuario + cliente +
                                    empleado + total dentro de una ventana de 5 segundos, y cuando
                                    dispara contesta 200 con el cuerpo VACIO, no con el modelo. Sin
                                    esta guarda, esa venta entraba a la lista como `undefined` y
                                    reventaba el modal que la va a mostrar. Para las ventas con
                                    uuid (todas desde la mision ingreso-sin-internet) el servidor
                                    devuelve siempre la venta y este caso no existe.
                                */
                                if (devolvio_la_venta && sale.adjuntos_pendientes && sale.adjuntos_pendientes.length) {
                                    await this.subir_adjuntos_de_venta_offline(response.data.model, sale.adjuntos_pendientes)
                                }

                                if (devolvio_la_venta) {

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

                            /*
                                401/419 (sesion vencida) y el 403 del candado de otra pestaña NO son
                                rechazos de la venta: son de la sesion. Marcarlos como rechazo haria
                                que el reintento periodico la saltee aunque la venta este bien. Van
                                por la rama de "se vuelve a intentar".
                            */
                            let es_problema_de_sesion = status === 401 || status === 419
                                || (status === 403 && error.response && error.response.data && error.response.data.misma_sesion_otra_pestana)

                            if (status && status >= 400 && status < 500 && !es_problema_de_sesion) {
                                /*
                                    Se marca en el equipo que el servidor la rechazo, con el
                                    motivo: el reintento periodico (offline/index.js,
                                    vigilar_conexion) la saltea para no repetir este aviso cada 30
                                    segundos. La venta NO se borra; con el evento `online` o al
                                    iniciar sesion se vuelve a intentar, como siempre.
                                */
                                await db.sales.update(sale.id, {
                                    rechazada_at: new Date().toISOString(),
                                    rechazo_mensaje: String(message),
                                }).catch(err => console.log(err))

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

                // Cuantas siguen en el equipo (las rechazadas y las que no pudieron subir).
                await contar_ventas_del_equipo(this.$store)

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

        /**
         * Sube los adjuntos de una venta hecha sin conexion, ya con el id que devolvio el servidor.
         *
         * Mismo endpoint que el camino con servidor (upload_pending_attachments de
         * mixins/vender/guardar_venta). Uno por uno; si alguno falla se avisa cual venta y cuantos,
         * para que se carguen a mano desde el detalle: la venta ya quedo guardada y no se frena
         * por un adjunto.
         *
         * @param {Object} sale Venta devuelta por el servidor.
         * @param {Array} adjuntos `{article_id, file, observation}` guardados con la venta.
         * @returns {Promise<void>}
         */
        async subir_adjuntos_de_venta_offline(sale, adjuntos) {
            let errores = 0
            for (const adjunto of adjuntos) {
                const form = new FormData()
                form.append('sale_id', sale.id)
                form.append('article_id', adjunto.article_id)
                form.append('file', adjunto.file)
                form.append('observation', adjunto.observation || '')
                try {
                    await this.$api.post('/sale-article-attachment', form, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        skip_global_error_event: true,
                        skip_global_validation_toast: true,
                        skip_navigation_cancel: true,
                    })
                } catch (err) {
                    console.log('No se pudo subir un adjunto de la venta offline', err)
                    errores++
                }
            }
            if (errores) {
                this.$toast.warning(`La venta N° ${sale.num} se subió, pero ${errores} de ${adjuntos.length} archivo(s) adjunto(s) no se pudieron subir: cargalos desde el detalle de la venta.`, {
                    duration: 15000,
                    position: 'top-right',
                })
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
