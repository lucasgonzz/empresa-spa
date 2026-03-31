import syncArticlesMixin from '@/offline/sync_articles'
import syncSalesMixin from '@/offline/sync_sales'
import db from './db'

export default {
    mixins: [syncArticlesMixin, syncSalesMixin],
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
        }
    },
    methods: {
        /**
         * Limpia almacenamiento local usado por modo offline.
         *
         * @returns {Promise<void>}
         */
        async clear_offline_memory() {
            /** Limpia artículos, ventas pendientes y metadata de sincronización. */
            await db.articles.clear()
            await db.sales.clear()
            await db.meta.clear()
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
            if (navigator.onLine) {
                console.log('🟢 Está online')

                /**
                 * En login maestro básico se evita sincronizar offline para ahorrar recursos.
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
                 * Si modo offline está desactivado, limpia memoria local y corta el flujo.
                 */
                const offline_disabled = await this.clear_offline_memory_if_mode_disabled()
                if (offline_disabled) {
                    return
                }

                if (this.owner.sync_offline_articles) {
                    this.sync_all_articles()
                } else {
                    console.log('No se descargaron articulos offline')
                }
                this.sync_pending_sales()
            }
        },
        online() {
            this.$store.commit('auth/set_online', true)
            this.sincronizar_offline()
        },
        async offline() {
            this.$store.commit('auth/set_online', false)

            const meta = await db.meta.get('last_articles_sync')
            /** Evita error si todavía no hay una fecha de sincronización guardada. */
            let last_update = meta ? meta.value : null
            let articles = await this.get_articles_offline()
            /** Construye mensaje con fallback cuando aún no existe sincronización previa. */
            let mensaje = ''
            if (last_update) {
                mensaje = 'Se perdio la conexion a Internet, se van a utilizar los '+articles.length+' articulos descargados el '+this.date(last_update)+' a las '+this.hour(last_update)
            } else {
                mensaje = 'Se perdio la conexion a Internet, se van a utilizar los '+articles.length+' articulos descargados en la memoria local'
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
        console.log('escuchando eventos online del navegador')
    },
    beforeDestroy() {
        /** Limpia listeners para evitar handlers duplicados al recrear componentes. */
        window.removeEventListener('online', this.online)
        window.removeEventListener('offline', this.offline)
        /** Evita ejecutar timeout tras destruir componente. */
        if (this.offline_articles_sync_progress_timeout_id) {
            clearTimeout(this.offline_articles_sync_progress_timeout_id)
            this.offline_articles_sync_progress_timeout_id = null
        }
    }
}
