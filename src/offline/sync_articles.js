// sync_articles.js
import db from './db'
import moment from 'moment-timezone'
/**
 * Descarga todos los artículos paginados desde la API
 * y los guarda en IndexedDB.
 */
export default {
    methods: {
        /**
         * Obtiene arreglo de artículos desde una respuesta paginada o simple.
         *
         * @param {Object} models Contenedor de modelos devuelto por backend.
         * @returns {Array}
         */
        get_articles_from_models(models) {
            /** Normaliza salida de backend con y sin paginación. */
            if (models && Array.isArray(models.data)) {
                return models.data
            }
            if (Array.isArray(models)) {
                return models
            }
            return []
        },
        /**
         * Obtiene total de registros informados por backend o por largo de arreglo.
         *
         * @param {Object|Array} models Contenedor de modelos devuelto por backend.
         * @returns {Number}
         */
        get_total_from_models(models) {
            /** Prioriza total paginado para evitar recorrer arrays grandes. */
            if (models && typeof models.total !== 'undefined') {
                return Number(models.total) || 0
            }
            const articles = this.get_articles_from_models(models)
            return articles.length
        },
        async sync_all_articles() {
            console.log('SINCRONIZANDO ARTICULOS')

            if (
                this.user.eliminar_articulos_offline
            ) {

                await db.articles.clear()
                await db.meta.clear()
                
                this.$toast.success('Se actualizo la memoria de productos')

                this.$api.put('user/set_eliminar_articulos_offline/'+this.user.id+'/0')
                .then(() => {
                    this.$toast.success('Reiniciando sistema...')
                    setTimeout(() => {

                        location.reload()
                    }, 2000)
                })
            } else {
                /** Prepara tarjeta de progreso para la sincronización incremental. */
                this.reset_offline_articles_sync_progress('Actualizando articulos offline')

                /** Obtener la fecha de la última sincronización. */
                const meta = await db.meta.get('last_articles_sync')
                const updated_after = meta ? meta.value : null

                /** Sincroniza eliminados y obtiene cuántos debe procesar. */
                const deleted_total = await this.articulos_eliminados(updated_after)

                /** Sincroniza actualizados y obtiene cuántos debe procesar. */
                const updated_total = await this.articulos_actualizados(updated_after)

                /** Asegura finalización visual cuando no hubo registros. */
                if ((deleted_total + updated_total) === 0) {
                    this.finish_offline_articles_sync_progress()
                }
            }


        },
        async articulos_eliminados(updated_after) {
            try {
                /**
                 * Controla paginación de artículos eliminados para alto volumen.
                 */
                let current_page = 1
                let last_page = 1
                /** Acumula total de eliminados procesados localmente. */
                let deleted_processed = 0
                /** Tamaño de página solicitado al backend para eliminados. */
                const per_page = 1000

                do {
                    const res = await this.$api.get('/article/index/eliminados',  {
                        params: {
                            updated_after,
                            page: current_page,
                            per_page,
                        }
                    })

                    const models = res.data.models
                    /** Obtiene lista normalizada del page actual. */
                    const deleted_articles = this.get_articles_from_models(models)
                    /** Arma ids para borrado en lote en IndexedDB. */
                    let deleted_ids = []
                    deleted_articles.forEach(article => {
                        deleted_ids.push(article.id)
                    })

                    /** Define total global de eliminados una sola vez. */
                    if (current_page === 1) {
                        this.set_offline_articles_sync_total(this.get_total_from_models(models))
                    }

                    if (deleted_ids.length) {
                        await db.articles.bulkDelete(deleted_ids)
                        deleted_processed += deleted_ids.length
                        /** Incrementa progreso por página de eliminados procesada. */
                        this.increment_offline_articles_sync_progress('deleted', deleted_ids.length)
                    }

                    /**
                     * Soporta respuesta paginada y no paginada.
                     * Si no hay metadata de páginas, termina en una sola vuelta.
                     */
                    if (
                        typeof models.current_page !== 'undefined'
                        && typeof models.last_page !== 'undefined'
                    ) {
                        current_page = Number(models.current_page) + 1
                        last_page = Number(models.last_page)
                    } else {
                        current_page = 2
                        last_page = 1
                    }
                } while (current_page <= last_page)

                console.log('Se sincronizaron articulos eliminados')
                return deleted_processed

            } catch (error) {
                console.error('❌ Error al sincronizar artículos eliminados:', error)
                this.fail_offline_articles_sync_progress('Error al sincronizar articulos eliminados')
                return 0
            }
        },
        async articulos_actualizados(updated_after) {
            /** Controla paginación de descarga incremental de artículos. */
            let current_page = 1
            let last_page = 1

            /** Acumula cantidad descargada para mensaje final. */
            let articulos_descargados = 0

            try {

                /** Descargo los articulos creados y actualizados. */
                do {
                 
                    const res = await this.$api.get('/article/index/from-status', {
                        params: {
                            updated_after,
                            page: current_page
                        }
                    })

                    const models = res.data.models

                    /** Obtiene artículos del page actual en formato uniforme. */
                    const articles = this.get_articles_from_models(models)

                    /** Ajusta total de barra con eliminados + actualizados reportados por backend. */
                    if (current_page === 1) {
                        const existing_total = this.offline_articles_sync_progress.total
                        this.set_offline_articles_sync_total(existing_total + this.get_total_from_models(models))
                    }

                    articulos_descargados += articles.length

                    /** Guarda artículos actualizados en IndexedDB por lote. */
                    await db.articles.bulkPut(articles)
                    /** Incrementa progreso por lote descargado. */
                    this.increment_offline_articles_sync_progress('updated', articles.length)

                    /**
                     * Soporta respuesta paginada y no paginada.
                     * Si no hay metadata de páginas, termina en una sola vuelta.
                     */
                    if (
                        typeof models.current_page !== 'undefined'
                        && typeof models.last_page !== 'undefined'
                    ) {
                        current_page = Number(models.current_page) + 1
                        last_page = Number(models.last_page)
                    } else {
                        current_page = 2
                        last_page = 1
                    }

                    console.log('se descargaron '+articles.length+' para offline')

                } while (current_page <= last_page)

                // Guardar nueva fecha de sincronización
                let now = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss')
                await db.meta.put({
                    key: 'last_articles_sync',
                    value: now
                })

                console.log('✅ Artículos sincronizados con IndexedDB')

                /** Cuenta en IndexedDB sin cargar todos los artículos a memoria. */
                let total_articles_offline = await db.articles.count()
                console.log('articulos almacenados offline:', total_articles_offline)

                let toast = 'Se actualizaron '+articulos_descargados+' articulos. '+total_articles_offline+' articulos descargados'

                this.$toast.success(toast, {
                    duration: 5000,
                    position: 'top-right'
                })
                /** Cierra estado de progreso al finalizar exitosamente. */
                this.finish_offline_articles_sync_progress()
                return articulos_descargados

            } catch (error) {
                console.error('❌ Error al sincronizar artículos actualizados:', error)
                this.fail_offline_articles_sync_progress('Error al sincronizar articulos actualizados')
                return 0
            }
        }   
    }
}
