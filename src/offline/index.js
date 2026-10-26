import syncArticlesMixin from '@/offline/sync_articles'
import syncSalesMixin from '@/offline/sync_sales'
import syncClientsMixin from '@/offline/sync_clients'
import db from './db'
import { borrar_sesion } from './sesion_sin_conexion'
import { contar_ventas_del_equipo } from './sync_sales'

/**
 * Cada cuánto se vuelve a preguntar por el servidor mientras se trabaja con la sesión restaurada
 * desde el equipo, y cada cuánto se reintentan las ventas que quedaron sin subir.
 *
 * Hace falta además del evento `online` porque ese evento no llega en dos casos reales: un equipo
 * con wifi pero sin salida a internet (`navigator.onLine` está en true todo el tiempo) y una
 * reconexión en la que el primer intento falló (DNS que todavía no resuelve, servidor lento): ya
 * se está "online" y no hay otro evento que dispare el segundo intento.
 */
const INTERVALO_DE_VIGILANCIA_MS = 30000

export default {
    mixins: [syncArticlesMixin, syncSalesMixin, syncClientsMixin],
    data() {
        return {
            /**
             * Estado reactivo del progreso de sincronización offline de artículos.
             * Se muestra en una tarjeta flotante al iniciar sesión.
             */
            offline_articles_sync_progress: {
                visible: false,
                loading: false,
                finished: false,
                title: '',
                status_message: '',
                total: 0,
                processed: 0,
                updated_downloaded: 0,
                deleted_processed: 0,
            },
            /**
             * Referencia del timeout para ocultar la tarjeta de progreso.
             */
            offline_articles_sync_progress_timeout_id: null,
            /**
             * Evita limpiar la memoria offline repetidamente en el mismo ciclo.
             */
            offline_memory_cleared_for_disabled_mode: false,
            /**
             * Evita que dos disparadores lancen la sincronizacion a la vez. Ver el comentario
             * de `sincronizar_offline()`.
             */
            sincronizacion_offline_en_curso: false,
            /**
             * true mientras hay una revalidacion de la sesion restaurada en vuelo (ver
             * `reintentar_conexion()`): evita que el evento `online` y el reintento periodico
             * pregunten dos veces a la vez.
             */
            revalidando_sesion_sin_conexion: false,
            /**
             * Id del `setInterval` de `vigilar_conexion()`.
             */
            vigilancia_de_conexion_id: null,
            /**
             * true mientras hay un pedido de prueba al servidor en vuelo (ver
             * `sospechar_falta_de_conexion()`).
             */
            sondeando_servidor: false,
            /**
             * true si se pidió una sincronización completa mientras otra tenía el candado: se
             * corre apenas se libera (ver `correr_sincronizacion_pendiente()`).
             */
            sincronizacion_offline_pendiente: false,
        }
    },
    methods: {
        /**
         * Limpia almacenamiento local usado por modo offline.
         *
         * @returns {Promise<void>}
         */
        async clear_offline_memory() {
            /*
                Limpia los articulos descargados, la marca de la ultima sincronizacion y la sesion
                guardada para entrar sin conexion (con sus catalogos).

                🔴 NO toca `db.sales`. Hasta la mision ingreso-sin-internet (23/10/2026) esto hacia
                `db.sales.clear()`: un login maestro basico o apagar el modo sin conexion BORRABAN
                las ventas hechas sin internet que todavia no habian subido -- ventas con plata
                cobrada, sin aviso y sin vuelta atras --. Una venta guardada en el equipo sale de
                ahi solo cuando el servidor la confirma (sync_sales.js).

                Tampoco `db.meta.clear()`: en `meta` vive tambien la sesion guardada; se borra la
                marca puntual y la sesion por su funcion.
            */
            await db.articles.clear()
            await db.meta.delete('last_articles_sync')
            /*
                Los clientes guardados para elegir en Vender sin conexion (mision
                clientes-sin-internet) van con los articulos: mismo interruptor.
            */
            await db.clients.clear()
            await db.meta.delete('last_clients_sync')
            await db.meta.delete('last_clients_full_sync')
            await borrar_sesion()
        },
        /**
         * Si el usuario desactiva el modo offline, borra la memoria local.
         *
         * @returns {Promise<void>}
         */
        async clear_offline_memory_if_mode_disabled() {
            if (!this.owner.sync_offline_articles) {
                /** Evita repetir borrado y notificación en eventos consecutivos. */
                if (!this.offline_memory_cleared_for_disabled_mode) {
                    await this.clear_offline_memory()
                    this.offline_memory_cleared_for_disabled_mode = true
                    this.$toast.warning('Modo offline desactivado: se limpio la memoria local', {
                        duration: 5000,
                        position: 'top-right'
                    })
                }
                return true
            }

            /** Si vuelve a habilitar offline, permite futuras limpiezas si se desactiva otra vez. */
            this.offline_memory_cleared_for_disabled_mode = false
            return false
        },
        /**
         * Reinicia los contadores de progreso para una nueva sincronización.
         *
         * @param {String} title Título descriptivo del proceso a mostrar.
         * @returns {void}
         */
        reset_offline_articles_sync_progress(title) {
            /** Evita ocultar la tarjeta durante un nuevo ciclo activo. */
            if (this.offline_articles_sync_progress_timeout_id) {
                clearTimeout(this.offline_articles_sync_progress_timeout_id)
                this.offline_articles_sync_progress_timeout_id = null
            }

            this.offline_articles_sync_progress = {
                visible: true,
                loading: true,
                finished: false,
                title: title || 'Actualizando articulos offline',
                status_message: 'Iniciando sincronizacion de articulos...',
                total: 0,
                processed: 0,
                updated_downloaded: 0,
                deleted_processed: 0,
            }
        },
        /**
         * Define la cantidad total de artículos a procesar.
         *
         * @param {Number} total_articles Total combinado de actualizados y eliminados.
         * @returns {void}
         */
        set_offline_articles_sync_total(total_articles) {
            /** Normaliza el total para evitar NaN o valores negativos. */
            let normalized_total = Number(total_articles) || 0
            if (normalized_total < 0) {
                normalized_total = 0
            }

            this.offline_articles_sync_progress.total = normalized_total
            this.offline_articles_sync_progress.status_message = 'Procesando articulos...'
        },
        /**
         * Avanza el progreso por lote según tipo de operación.
         *
         * @param {String} operation_type Tipo de operación (`updated` o `deleted`).
         * @param {Number} amount Cantidad de artículos del lote procesado.
         * @returns {void}
         */
        increment_offline_articles_sync_progress(operation_type, amount) {
            /** Asegura incremento mínimo válido. */
            const safe_amount = Number(amount) > 0 ? Number(amount) : 0

            this.offline_articles_sync_progress.processed += safe_amount

            /** Lleva contadores separados para trazabilidad en UI. */
            if (operation_type === 'updated') {
                this.offline_articles_sync_progress.updated_downloaded += safe_amount
            } else if (operation_type === 'deleted') {
                this.offline_articles_sync_progress.deleted_processed += safe_amount
            }

            this.offline_articles_sync_progress.status_message = 'Procesando articulos...'
        },
        /**
         * Marca el proceso de sincronización como completado.
         *
         * @returns {void}
         */
        finish_offline_articles_sync_progress() {
            this.offline_articles_sync_progress.loading = false
            this.offline_articles_sync_progress.finished = true
            this.offline_articles_sync_progress.status_message = 'Sincronizacion de articulos completada'
            /** Oculta la tarjeta automáticamente luego de confirmar resultado. */
            this.hide_offline_articles_sync_progress_with_delay()
        },
        /**
         * Marca el proceso de sincronización con estado de error.
         *
         * @param {String} error_message Mensaje visible para usuario.
         * @returns {void}
         */
        fail_offline_articles_sync_progress(error_message) {
            this.offline_articles_sync_progress.loading = false
            this.offline_articles_sync_progress.finished = true
            this.offline_articles_sync_progress.status_message = error_message || 'No se pudo sincronizar articulos offline'
            /** Da tiempo al usuario para leer el error y luego oculta. */
            this.hide_offline_articles_sync_progress_with_delay()
        },
        /**
         * Oculta la tarjeta de progreso luego de unos segundos.
         *
         * @returns {void}
         */
        hide_offline_articles_sync_progress_with_delay() {
            this.offline_articles_sync_progress_timeout_id = setTimeout(() => {
                this.offline_articles_sync_progress.visible = false
                this.offline_articles_sync_progress_timeout_id = null
            }, 5000)
        },
        async sincronizar_offline() {
            console.log('sincronizar_offline')

            /*
                Esto se dispara desde DOS lados: el listener `online` de este mismo mixin y el
                watcher `authenticated` de App.vue. Al volver la conexion en una sesion recien
                abierta llegan los dos casi juntos, y dos corridas simultaneas postearian la misma
                venta dos veces -- la ventana de deduplicacion del backend es de 5 segundos y no
                cubre una venta que tarde mas que eso -- y abririan dos veces el modal de
                facturacion.

                Alcanza con un booleano en data() y no hace falta un lock en IndexedDB porque este
                mixin se mezcla en App.vue, que es UNA sola instancia: los dos disparadores
                comparten el mismo `data`.
            */
            if (this.sincronizacion_offline_en_curso) {
                console.log('Ya hay una sincronizacion offline en curso, no se lanza otra')
                /*
                    Pero se deja anotada para cuando termine la que corre (misión
                    ingreso-sin-internet): la que tiene el candado puede ser la subida periodica de
                    ventas de vigilar_conexion(), que NO baja articulos. Sin la anotacion, una
                    sincronizacion completa pedida justo en ese momento (un login, la vuelta de la
                    red) se perdia y los articulos no se actualizaban en toda la sesion.
                */
                this.sincronizacion_offline_pendiente = true
                return
            }

            this.sincronizacion_offline_en_curso = true

            try {

                if (!navigator.onLine) {
                    return
                }

                console.log('🟢 Está online')

                /**
                 * En login maestro básico se evita sincronizar offline para ahorrar recursos.
                 *
                 * Las ventas sin subir de este equipo se dejan donde estan, sin subirlas ni
                 * borrarlas: son del comercio y las sube el proximo inicio de sesion normal.
                 */
                if (this.user && this.user.skip_offline_articles_sync) {
                    console.log('Se omite sincronizacion offline por login maestro basico')
                    await this.clear_offline_memory()
                    this.$toast.warning('Login maestro detectado: no se descargaron articulos offline', {
                        duration: 5000,
                        position: 'top-right'
                    })
                    return
                }

                /**
                 * Si modo offline está desactivado, limpia la memoria local de articulos.
                 *
                 * 🔴 Y sigue igual hasta las ventas: antes cortaba aca, y una venta hecha sin
                 * internet antes de apagar el modo no subia nunca mas (y encima se borraba). Las
                 * ventas sin subir son ventas hechas: se suben siempre.
                 */
                const offline_disabled = await this.clear_offline_memory_if_mode_disabled()

                if (!offline_disabled && this.owner.sync_offline_articles) {
                    /*
                        Los clientes, DETRAS de los articulos y no en paralelo (mision
                        clientes-sin-internet): son las dos descargas mas pesadas del arranque y no
                        tienen por que pelearse el servidor. Ninguna de las dos rechaza.
                    */
                    this.sync_all_articles()
                    .catch(err => console.log(err))
                    .then(() => this.sync_all_clients())
                } else {
                    console.log('No se descargaron articulos offline')
                }

                await this.subir_y_facturar_ventas_pendientes()

            } finally {
                /*
                    🔴 El finally tiene que cubrir TAMBIEN los return tempranos de arriba (sin
                    conexion, login maestro, modo offline desactivado). Si la bandera quedara
                    prendida en uno de esos caminos, la sincronizacion no volveria a correr en toda
                    la sesion y las ventas offline se quedarian en IndexedDB sin que nada lo
                    denuncie -- que es exactamente el modo de falla silencioso que esta mision vino
                    a cerrar.
                */
                this.sincronizacion_offline_en_curso = false
                this.correr_sincronizacion_pendiente()
            }
        },
        /**
         * Si mientras había una sincronización en curso se pidió otra completa, la corre ahora.
         * Ver el comentario de `sincronizacion_offline_pendiente` en sincronizar_offline().
         *
         * @returns {void}
         */
        correr_sincronizacion_pendiente() {
            if (this.sincronizacion_offline_pendiente) {
                this.sincronizacion_offline_pendiente = false
                this.sincronizar_offline()
            }
        },
        /**
         * Sube las ventas guardadas en el equipo y deja en el store las que hay que facturar.
         *
         * Es el tramo de ventas de `sincronizar_offline()`, separado para que el reintento
         * periodico (`vigilar_conexion()`) lo pueda correr solo, sin volver a bajar articulos.
         * NO toma el candado `sincronizacion_offline_en_curso`: lo toma quien la llama.
         *
         * @param {Object} opciones Se pasan tal cual a `sync_pending_sales()`.
         * @returns {Promise<void>}
         */
        subir_y_facturar_ventas_pendientes(opciones) {
            return this.sync_pending_sales(opciones)
            .then(ventas_sincronizadas => {
                /*
                    Solo las que se guardaron con punto de venta: son las que, con internet,
                    habrian salido a facturar solas. Las demas se sincronizaron y ahi termina su
                    historia, igual que hoy.
                */
                const ventas_para_facturar = ventas_sincronizadas.filter(venta => venta.afip.ventas_afip_information_id)

                /*
                    Aca NO se abre el modal. Los componentes de App.vue se importan con
                    () => import(...), asi que el chunk del modal puede estar todavia bajando
                    cuando esto termina, y en ese caso $bvModal.show() no hace nada Y NO AVISA.
                    Se deja la lista en el store y el modal decide abrirse solo cuando exista,
                    mirando el mismo estado desde su watch y desde su mounted().
                */
                /*
                    Se SUMAN a las que ya esperaban (y no se reemplazan): con la subida periodica
                    puede llegar una tanda nueva mientras el modal todavia tiene la anterior sin
                    resolver, y reemplazar la lista sacaba del modal ventas ya subidas que nadie
                    habia decidido si facturar. Sin repetir la misma venta.
                */
                if (ventas_para_facturar.length) {
                    let actuales = this.$store.state.afip_ticket.ventas_offline_para_facturar || []
                    let ids = []
                    actuales.forEach(venta => {
                        if (venta.sale) ids.push(venta.sale.id)
                    })
                    let nuevas = ventas_para_facturar.filter(venta => ids.indexOf(venta.sale.id) === -1)
                    if (nuevas.length) {
                        this.$store.commit('afip_ticket/set_ventas_offline_para_facturar', actuales.concat(nuevas))
                    }
                }
            })
        },
        /**
         * Cuenta las ventas guardadas en el equipo y lo deja en `auth.ventas_sin_subir` (lo muestra
         * el aviso de conexión).
         *
         * @returns {Promise<void>}
         */
        actualizar_ventas_sin_subir() {
            return contar_ventas_del_equipo(this.$store)
        },
        /**
         * Corre cada INTERVALO_DE_VIGILANCIA_MS.
         *
         * - Con la sesión restaurada desde el equipo: pregunta si ya hay servidor
         *   (`reintentar_conexion()`).
         * - Con una sesión normal, con red y con ventas sin subir: las reintenta, salteando las que
         *   el servidor ya rechazó (esas se reintentan con el evento `online` o al iniciar sesión,
         *   como siempre; reintentarlas cada 30 segundos solo repetiría el mismo aviso).
         *
         * @returns {void}
         */
        vigilar_conexion() {
            if (!this.authenticated) {
                return
            }
            if (this.$store.state.auth.sesion_sin_conexion) {
                this.reintentar_conexion()
                return
            }
            if (navigator.onLine === false) {
                return
            }
            /*
                Se paso a trabajar sin conexion porque el servidor dejo de contestar, pero el
                navegador dice que hay red (wifi sin salida a internet): el evento `online` no va a
                llegar nunca, asi que se pregunta. Si contesta, es como si hubiera vuelto la red.
            */
            if (!this.$store.state.auth.online) {
                if (this.sondeando_servidor) {
                    return
                }
                this.sondeando_servidor = true
                this.sondear_servidor()
                .then(hay_servidor => {
                    this.sondeando_servidor = false
                    if (hay_servidor && !this.$store.state.auth.online) {
                        this.online()
                    }
                })
                return
            }
            if (this.sincronizacion_offline_en_curso) {
                return
            }
            // Login maestro básico: las ventas del equipo no se tocan (ver sincronizar_offline()).
            if (this.user && this.user.skip_offline_articles_sync) {
                return
            }
            db.sales.toArray()
            .then(ventas => {
                /** Las que todavía no fueron rechazadas por el servidor. */
                let reintentables = ventas.filter(venta => !venta.rechazada_at)
                if (!reintentables.length || this.sincronizacion_offline_en_curso) {
                    return
                }
                this.sincronizacion_offline_en_curso = true
                return this.subir_y_facturar_ventas_pendientes({ omitir_rechazadas: true })
                .catch(err => console.log(err))
                .then(() => {
                    this.sincronizacion_offline_en_curso = false
                    this.correr_sincronizacion_pendiente()
                })
            })
            .catch(err => console.log('vigilar_conexion', err))
        },
        /**
         * Pedido de prueba: ¿contesta el servidor? Cualquier respuesta (incluso un error HTTP)
         * cuenta como "hay servidor"; solo la falta de respuesta, o tardar más de 8 segundos,
         * cuenta como "no hay".
         *
         * @returns {Promise<Boolean>} Nunca rechaza.
         */
        sondear_servidor() {
            return this.$axios.get('/sanctum/csrf-cookie', {
                timeout: 8000,
                skip_global_error_event: true,
                skip_global_validation_toast: true,
                // Un cambio de pantalla no lo cancela: un sondeo cancelado se leería como "hay servidor".
                skip_navigation_cancel: true,
            })
            .then(() => true)
            .catch(err => !(err && err.isAxiosError && !err.response))
        },
        /**
         * Un pedido se quedó sin respuesta (lo avisa el interceptor de main.js con el evento
         * `cc-sin-respuesta-del-servidor`). Si el servidor tampoco contesta un pedido de prueba,
         * se pasa a trabajar sin conexión igual que con el evento `offline` del navegador: Vender
         * busca en el equipo y guarda las ventas en el equipo. `vigilar_conexion()` vuelve a
         * preguntar cada 30 segundos.
         *
         * Hace falta porque con wifi pero sin salida a internet -el corte de todos los días en un
         * comercio- el navegador sigue diciendo que hay red y el evento `offline` no llega nunca:
         * sin esto, el modo sin conexión no se activaba y Vender no podía cobrar.
         *
         * @returns {void}
         */
        sospechar_falta_de_conexion() {
            if (!this.authenticated || this.$store.state.auth.sesion_sin_conexion) {
                return
            }
            if (!this.$store.state.auth.online || this.sondeando_servidor) {
                return
            }
            this.sondeando_servidor = true
            this.sondear_servidor()
            .then(hay_servidor => {
                this.sondeando_servidor = false
                if (!hay_servidor && this.$store.state.auth.online) {
                    this.offline()
                }
            })
        },
        /**
         * Con la sesión restaurada desde el equipo, le pregunta al servidor si la sesión sigue
         * siendo válida, y actúa según la respuesta (ver `auth/revalidar_sesion`).
         *
         * @returns {Promise<void>}
         */
        reintentar_conexion() {
            if (!this.$store.state.auth.sesion_sin_conexion || this.revalidando_sesion_sin_conexion) {
                return Promise.resolve()
            }
            if (navigator.onLine === false) {
                return Promise.resolve()
            }
            this.revalidando_sesion_sin_conexion = true
            return this.$store.dispatch('auth/revalidar_sesion')
            .then(resultado => {
                this.revalidando_sesion_sin_conexion = false
                if (resultado === 'valida') {
                    this.salir_del_modo_sin_conexion()
                } else if (resultado === 'vencida') {
                    this.avisar_sesion_vencida_sin_conexion()
                }
            })
            .catch(err => {
                this.revalidando_sesion_sin_conexion = false
                console.log('reintentar_conexion', err)
            })
        },
        /**
         * Volvió el servidor y confirmó la sesión que se había restaurado desde el equipo: se
         * arranca la sesión completa, igual que si se hubiera entrado con internet (catálogos
         * frescos, avisos, subida de ventas, artículos), sin mover al usuario de la pantalla en la
         * que está -- puede estar a mitad de una venta en Vender --. `arrancar_sesion()` vive en
         * App.vue, que es el único componente que mezcla este mixin.
         *
         * @returns {void}
         */
        salir_del_modo_sin_conexion() {
            this.$toast.success('Volvió la conexión: se actualiza el sistema y se suben las ventas guardadas en este equipo.', {
                duration: 6000,
                position: 'top-right'
            })
            // Catálogos frescos: el panel de recursos los vuelve a pedir aunque ya estén en memoria
            // (ver `catalogos_del_equipo` en download-resources/Index.vue).
            this.$store.commit('download_resources/setStartDownload')
            this.arrancar_sesion({ desde_sin_conexion: true })
        },
        /**
         * El servidor volvió y dijo que la sesión restaurada ya no vale: se avisa qué pasa con las
         * ventas guardadas. La navegación al login la hace el watch de `authenticated` de App.vue.
         *
         * @returns {void}
         */
        avisar_sesion_vencida_sin_conexion() {
            let ventas = this.$store.state.auth.ventas_sin_subir
            let mensaje = 'Volvió la conexión, pero tu sesión ya no es válida. Iniciá sesión de nuevo.'
            if (ventas) {
                mensaje = 'Volvió la conexión, pero tu sesión ya no es válida. Iniciá sesión de nuevo: las '
                    + ventas + ' venta(s) guardada(s) en este equipo siguen acá y se suben solas al entrar.'
            }
            this.$toast.warning(mensaje, {
                duration: 15000,
                position: 'top'
            })
        },
        online() {
            /*
                Con la sesion restaurada desde el equipo, que el navegador diga "hay red" no
                alcanza: primero se le pregunta al servidor si la sesion sigue valida. Hasta que
                conteste, Vender sigue trabajando sin conexion (auth.online en false).
            */
            if (this.$store.state.auth.sesion_sin_conexion) {
                this.reintentar_conexion()
                return
            }
            this.$store.commit('auth/set_online', true)
            /*
                Si en este corte los catalogos se tuvieron que cargar desde el equipo (la llamada
                masiva del arranque se cayo por red), se vuelven a pedir ahora que hay servidor.
            */
            if (this.$store.state.download_resources.catalogos_del_equipo) {
                this.$store.commit('download_resources/setStartDownload')
            }
            this.sincronizar_offline()
        },
        async offline() {
            this.$store.commit('auth/set_online', false)

            const meta = await db.meta.get('last_articles_sync')
            /** Evita error si todavía no hay una fecha de sincronización guardada. */
            let last_update = meta ? meta.value : null
            /*
                Se cuentan, no se levantan: get_articles_offline() traia a memoria los 30-50 mil
                articulos de la tabla solo para mostrar el numero, justo en el momento en que se
                corta la red en plena venta.
            */
            let cantidad_de_articulos = await db.articles.count()
            /** Construye mensaje con fallback cuando aún no existe sincronización previa. */
            let mensaje = ''
            if (last_update) {
                mensaje = 'Se perdio la conexion a Internet, se van a utilizar los '+cantidad_de_articulos+' articulos descargados el '+this.date(last_update)+' a las '+this.hour(last_update)
            } else {
                mensaje = 'Se perdio la conexion a Internet, se van a utilizar los '+cantidad_de_articulos+' articulos descargados en la memoria local'
            }

            this.$toast.warning(mensaje, {
                duration: 7000,
                position: 'top'
            })
        },
    },
    created() {
        window.addEventListener('online', this.online)
        window.addEventListener('offline', this.offline)
        window.addEventListener('cc-sin-respuesta-del-servidor', this.sospechar_falta_de_conexion)
        console.log('escuchando eventos online del navegador')
        /*
            Abrir el sistema ya sin red no dispara el evento `offline`, y `auth.online` arranca en
            true: Vender buscaria los articulos contra la API. Se toma el estado real del navegador
            desde el primer momento.
        */
        if (navigator.onLine === false) {
            this.$store.commit('auth/set_online', false)
        }
        this.actualizar_ventas_sin_subir()
        this.vigilancia_de_conexion_id = setInterval(this.vigilar_conexion, INTERVALO_DE_VIGILANCIA_MS)
    },
    beforeDestroy() {
        /** Limpia listeners para evitar handlers duplicados al recrear componentes. */
        window.removeEventListener('online', this.online)
        window.removeEventListener('offline', this.offline)
        window.removeEventListener('cc-sin-respuesta-del-servidor', this.sospechar_falta_de_conexion)
        if (this.vigilancia_de_conexion_id) {
            clearInterval(this.vigilancia_de_conexion_id)
            this.vigilancia_de_conexion_id = null
        }
        /** Evita ejecutar timeout tras destruir componente. */
        if (this.offline_articles_sync_progress_timeout_id) {
            clearTimeout(this.offline_articles_sync_progress_timeout_id)
            this.offline_articles_sync_progress_timeout_id = null
        }
    }
}
