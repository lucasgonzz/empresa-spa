// sync_articles.js
import db from './db'
/*
	El indice en memoria de los codigos de variante de la cache (VENDER sin conexion) deja de valer
	cuando cambia la tabla de articulos: se tira despues de cada escritura de esta sincronizacion y el
	proximo escaneo lo rearma. Ver utils/variantes_en_cache.js.
*/
import { invalidar_indice_de_variantes_en_cache } from '@/utils/variantes_en_cache'
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
                /*
                    Solo la marca de la ultima sincronizacion, no `meta.clear()`: en `meta` vive
                    tambien la sesion guardada para entrar sin conexion y sus catalogos
                    (offline/sesion_sin_conexion.js), que no tienen nada que ver con los articulos.
                */
                await db.meta.delete('last_articles_sync')

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

                /**
                 * Momento (reloj del equipo) en que arranca esta sincronizacion, ANTES de pedir los
                 * eliminados. Lo usa articulos_actualizados() para calcular la marca que se guarda:
                 * ver el comentario de `marca_de_sincronizacion` alla.
                 */
                const inicio_ms = Date.now()

                /*
                    Si la consulta de eliminados falla, la marca NO se puede adelantar aunque los
                    actualizados bajen bien: los borrados de este lapso no volverian a pedirse nunca
                    y quedarian vendibles en el equipo. Lo prende el catch de articulos_eliminados()
                    y lo mira articulos_actualizados() antes de guardar la marca. Propiedad suelta
                    (no reactiva) a proposito: es interna de esta corrida.
                */
                this.fallaron_los_eliminados_offline = false

                /** Sincroniza eliminados y obtiene cuántos debe procesar. */
                const deleted_total = await this.articulos_eliminados(updated_after)

                /** Sincroniza actualizados y obtiene cuántos debe procesar. */
                const updated_total = await this.articulos_actualizados(updated_after, inicio_ms)

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
                        invalidar_indice_de_variantes_en_cache()
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
                this.fallaron_los_eliminados_offline = true
                this.fail_offline_articles_sync_progress('Error al sincronizar articulos eliminados')
                return 0
            }
        },
        /**
         * Calcula la marca que se guarda como `last_articles_sync` (el `updated_after` de la
         * proxima sincronizacion).
         *
         * 🔴 Hasta la mision ingreso-sin-internet (23/10/2026) la marca era la hora del EQUIPO
         * tomada al TERMINAR la descarga. Dos agujeros, los dos silenciosos:
         *  - un articulo modificado (o borrado) mientras se descargaban las paginas quedaba con su
         *    `updated_at` ANTES de la marca y no se bajaba nunca mas: en el equipo seguia el precio
         *    viejo, o un articulo borrado seguia vendible sin conexion;
         *  - con el reloj del equipo adelantado, la marca quedaba en el futuro respecto del
         *    servidor y se perdian todos los cambios de ese lapso.
         *
         * Ahora: la hora del SERVIDOR (`sincronizado_hasta`, que GET article/index/from-status
         * toma antes de consultar) menos todo lo que tardo esta sincronizacion desde que arranco
         * (incluida la consulta de eliminados, que va antes) y un minuto de margen. Bajar dos veces
         * un articulo no cuesta nada; perderlo si. Con una API vieja que no manda la clave, se cae
         * a la hora del equipo al ARRANCAR menos diez minutos.
         *
         * @param {String|undefined} sincronizado_hasta 'YYYY-MM-DD HH:mm:ss' del servidor.
         * @param {Number} inicio_ms Date.now() del arranque de la sincronizacion.
         * @returns {String} 'YYYY-MM-DD HH:mm:ss' en hora de Buenos Aires.
         */
        marca_de_sincronizacion(sincronizado_hasta, inicio_ms) {
            /** Zona en la que el backend compara `updated_at` (config/app.php de empresa-api). */
            const zona = 'America/Argentina/Buenos_Aires'
            /** Formato en el que la API recibe `updated_after`. */
            const formato = 'YYYY-MM-DD HH:mm:ss'
            /** Lo que tardo esta sincronizacion hasta la respuesta, mas un minuto de margen. */
            const atraso_ms = Math.max(0, Date.now() - inicio_ms) + 60000

            if (sincronizado_hasta) {
                let del_servidor = moment.tz(sincronizado_hasta, formato, zona)
                if (del_servidor.isValid()) {
                    return del_servidor.subtract(atraso_ms, 'milliseconds').format(formato)
                }
            }
            return moment(inicio_ms).tz(zona).subtract(10, 'minutes').format(formato)
        },
        async articulos_actualizados(updated_after, inicio_ms) {
            /** Controla paginación de descarga incremental de artículos. */
            let current_page = 1
            let last_page = 1

            /**
             * Marca que se guarda al terminar bien. Se calcula con la PRIMERA respuesta: ver
             * marca_de_sincronizacion(). Si nadie pasa `inicio_ms`, vale como si arrancara ahora.
             */
            let marca_de_sincronizacion = null
            if (!inicio_ms) {
                inicio_ms = Date.now()
            }

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
                        marca_de_sincronizacion = this.marca_de_sincronizacion(res.data.sincronizado_hasta, inicio_ms)
                    }

                    articulos_descargados += articles.length

                    /** Guarda artículos actualizados en IndexedDB por lote. */
                    await db.articles.bulkPut(articles)
                    invalidar_indice_de_variantes_en_cache()
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

                // Guardar nueva fecha de sincronización (la de ANTES de empezar: ver marca_de_sincronizacion).
                // No se guarda si fallaron los eliminados: ver el comentario en sync_all_articles().
                if (!this.fallaron_los_eliminados_offline) {
                    await db.meta.put({
                        key: 'last_articles_sync',
                        value: marca_de_sincronizacion || this.marca_de_sincronizacion(null, inicio_ms)
                    })
                }

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
