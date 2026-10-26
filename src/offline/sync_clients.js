// sync_clients.js
/*
	Descarga de los clientes al equipo para poder elegirlos en Vender sin conexión (misión
	clientes-sin-internet, 26/10/2026).

	Mismo esquema que los artículos (src/offline/sync_articles.js), en chico y sin tarjeta de progreso:
	- `GET client/index/offline-eliminados?updated_after=` → se borran del equipo;
	- `GET client/index/offline?updated_after=` → se guardan (completos, `Client::withAll()`);
	- la marca `last_clients_sync` (tabla `meta`) es la hora del SERVIDOR menos lo que tardó la
	  corrida, y no avanza si falló cualquiera de las dos consultas. El porqué de esa marca está en
	  sync_articles.js::marca_de_sincronizacion(), que se reusa acá.

	Corre detrás de la sincronización de artículos (offline/index.js), nunca en paralelo con ella: son
	las dos descargas más pesadas del arranque.

	Nunca rechaza: un error se loguea y la próxima corrida retoma desde la marca vieja. Con una API
	anterior a esta misión los endpoints no existen (404) y Vender sigue como antes, sin clientes sin
	conexión.
*/
import db from './db'

/** Clave de la marca de la última sincronización de clientes en la tabla `meta`. */
const MARCA_CLIENTES = 'last_clients_sync'

/** Clientes por página: el techo del endpoint es 1000; con `withAll()` 500 es un pedido razonable. */
const CLIENTES_POR_PAGINA = 500

/** Clave del momento (reloj del equipo, ms) de la última descarga COMPLETA de clientes. */
const MARCA_COMPLETA = 'last_clients_full_sync'

/**
 * Cada cuánto se baja la lista entera en vez de solo lo modificado.
 *
 * Hace falta porque el `updated_at` del cliente NO se mueve cuando cambia el saldo de su cuenta
 * corriente (vive en `credit_accounts`) ni cuando se le vinculan descuentos o recargos (pivot): la
 * descarga incremental no trae esos cambios. Sin conexión, Vender muestra el saldo y aplica los
 * ajustes del cliente con lo guardado; una vez cada 12 horas (en el primer inicio de sesión del día,
 * en la práctica) se rehace entera.
 */
const INTERVALO_COMPLETA_MS = 12 * 60 * 60 * 1000

export default {
	methods: {
		/**
		 * Sincroniza los clientes del equipo con el servidor.
		 *
		 * @returns {Promise<void>} Nunca rechaza.
		 */
		sync_all_clients() {
			/** Momento (reloj del equipo) en que arranca la corrida: ver marca_de_sincronizacion(). */
			let inicio_ms = Date.now()

			return Promise.all([db.meta.get(MARCA_CLIENTES), db.meta.get(MARCA_COMPLETA)])
			.then(([meta, meta_completa]) => {
				/** ¿Toca la descarga completa? Ver INTERVALO_COMPLETA_MS. */
				let completa = !meta || !meta_completa || (inicio_ms - Number(meta_completa.value)) > INTERVALO_COMPLETA_MS
				if (completa) {
					return this.clientes_completos_offline(inicio_ms)
				}
				let updated_after = meta.value
				return this.clientes_eliminados_offline(updated_after)
				.then(() => this.clientes_actualizados_offline(updated_after, inicio_ms))
			})
			.then(marca => {
				return db.meta.put({ key: MARCA_CLIENTES, value: marca })
				.then(() => db.clients.count())
				.then(cantidad => {
					console.log('Clientes sincronizados para usar sin conexion: ' + cantidad)
				})
			})
			.catch(err => {
				console.log('No se pudieron sincronizar los clientes para usar sin conexion', err)
			})
		},
		/**
		 * Borra del equipo los clientes que se borraron en el servidor después de la marca.
		 *
		 * @param {String|null} updated_after
		 * @returns {Promise<void>} Rechaza si falla una página: la marca no tiene que avanzar.
		 */
		clientes_eliminados_offline(updated_after) {
			return this.recorrer_paginas_de_clientes('client/index/offline-eliminados', updated_after, (models) => {
				/** Ids de la página, para un solo bulkDelete. */
				let ids = []
				models.forEach(model => {
					ids.push(model.id)
				})
				return ids.length ? db.clients.bulkDelete(ids) : Promise.resolve()
			})
		},
		/**
		 * Guarda en el equipo los clientes creados o modificados después de la marca, y devuelve la
		 * marca nueva calculada con la hora del servidor de la primera página.
		 *
		 * @param {String|null} updated_after
		 * @param {Number} inicio_ms
		 * @returns {Promise<String>} La marca a guardar. Rechaza si falla una página.
		 */
		clientes_actualizados_offline(updated_after, inicio_ms) {
			/** La hora del servidor de la primera respuesta (`sincronizado_hasta`). */
			let sincronizado_hasta = null
			return this.recorrer_paginas_de_clientes('client/index/offline', updated_after, (models, data, page) => {
				if (page === 1) {
					sincronizado_hasta = data.sincronizado_hasta
				}
				/*
					Copia plana: lo que llega de axios ya es JSON, pero se guarda sin nada que IndexedDB
					no sepa clonar.
				*/
				return models.length ? db.clients.bulkPut(JSON.parse(JSON.stringify(models))) : Promise.resolve()
			})
			.then(() => this.marca_de_sincronizacion(sincronizado_hasta, inicio_ms))
		},
		/**
		 * Descarga COMPLETA: baja todos los clientes y recién al final reemplaza la tabla entera, en
		 * una sola transacción (si se corta a la mitad, en el equipo queda la lista anterior, completa).
		 * Así salen también los borrados y lo que la incremental no ve (saldo, ajustes por pivot).
		 *
		 * @param {Number} inicio_ms
		 * @returns {Promise<String>} La marca a guardar. Rechaza si falla una página.
		 */
		clientes_completos_offline(inicio_ms) {
			/** Todos los clientes, juntados en memoria hasta tener la lista entera. */
			let todos = []
			/** La hora del servidor de la primera respuesta. */
			let sincronizado_hasta = null
			return this.recorrer_paginas_de_clientes('client/index/offline', null, (models, data, page) => {
				if (page === 1) {
					sincronizado_hasta = data.sincronizado_hasta
				}
				todos = todos.concat(models)
				return Promise.resolve()
			})
			.then(() => {
				let copia = JSON.parse(JSON.stringify(todos))
				return db.transaction('rw', db.clients, () => {
					return db.clients.clear().then(() => db.clients.bulkPut(copia))
				})
			})
			.then(() => db.meta.put({ key: MARCA_COMPLETA, value: inicio_ms }))
			.then(() => this.marca_de_sincronizacion(sincronizado_hasta, inicio_ms))
		},
		/**
		 * Pide una ruta paginada de a una página por vez y le pasa cada página a `procesar`.
		 *
		 * @param {String} ruta Ruta de la API (sin `/api`).
		 * @param {String|null} updated_after
		 * @param {Function} procesar (models, data, page) => Promise
		 * @returns {Promise<void>}
		 */
		recorrer_paginas_de_clientes(ruta, updated_after, procesar) {
			let pedir_pagina = (page) => {
				return this.$api.get(ruta, {
					params: {
						updated_after: updated_after,
						page: page,
						per_page: CLIENTES_POR_PAGINA,
					},
					// Corre en segundo plano: sin avisos globales y sin cortarse al cambiar de pantalla.
					skip_global_error_event: true,
					skip_navigation_cancel: true,
				})
				.then(res => {
					let data = res.data || {}
					let paginado = data.models || {}
					let models = Array.isArray(paginado.data) ? paginado.data : []
					return Promise.resolve(procesar(models, data, page))
					.then(() => {
						let actual = Number(paginado.current_page) || page
						let ultima = Number(paginado.last_page) || actual
						if (actual < ultima) {
							return pedir_pagina(actual + 1)
						}
					})
				})
			}
			return pedir_pagina(1)
		},
	},
}
