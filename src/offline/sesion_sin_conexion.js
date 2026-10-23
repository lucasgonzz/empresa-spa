/*
	Sesión y catálogos guardados en el equipo para poder ENTRAR al sistema sin internet (misión
	ingreso-sin-internet, 23/10/2026).

	Hasta esta misión el modo sin conexión servía solo si la pestaña ya estaba abierta con la sesión
	iniciada: al abrir el sistema sin red, `auth/me` fallaba, el arranque lo leía como "no hay
	sesión" y mandaba al login, donde no se puede entrar sin servidor. Y aunque se hubiera podido
	entrar, los catálogos del arranque (listas de precios, métodos de pago, sucursales, empleados,
	puntos de venta...) vivían solo en memoria.

	Lo que se guarda, y dónde:

	- En la tabla `meta` de `OfflineDB` (src/offline/db.js), la misma base de los artículos y las
	  ventas sin conexión. NO se sube la versión de Dexie a propósito: una versión nueva cierra la
	  base en las pestañas que todavía tienen el bundle anterior (evento `versionchange`), y en esas
	  pestañas guardar una venta sin conexión fallaría justo el día del release.
	- `sesion_sin_conexion`: `{user, guardada_at}`. El usuario completo tal como lo devuelve
	  GET /api/user (con permisos, dueño y extensiones), y cuándo lo confirmó el servidor por última
	  vez. No trae secretos: `User::$hidden` ya los saca de esa respuesta.
	- `catalogo:<model_name>`: `{models}` de cada catálogo que baja el panel de recursos.

	🔴 Cuándo se guarda y cuándo se borra (lo decide `plugin_de_sesion_sin_conexion`, más abajo):
	se guarda cada vez que el servidor CONFIRMA una sesión (`auth/setAuthenticated` en true fuera
	del modo sin conexión) y se borra con TODO `auth/setUser(null)`: cerrar sesión, sesión vencida,
	sesión cerrada desde otro dispositivo, paso a otra versión del sistema. Las ventas sin subir
	(`db.sales`) NUNCA se tocan desde acá: son ventas hechas, con plata cobrada.

	Todas las funciones devuelven promesas que no rechazan: un problema con IndexedDB (ventana
	privada, cuota llena) no puede romper el inicio de sesión ni el arranque.
*/
import db from './db'

/**
 * Clave de la sesión guardada en la tabla `meta`.
 */
const CLAVE_SESION = 'sesion_sin_conexion'

/**
 * Prefijo de las claves de los catálogos guardados en la tabla `meta`.
 */
const PREFIJO_CATALOGO = 'catalogo:'

/**
 * ¿Este usuario puede dejar su sesión guardada para entrar sin internet?
 *
 * Tres condiciones:
 * - El dueño tiene prendido el modo sin conexión (`sync_offline_articles`, el mismo interruptor
 *   que la descarga de artículos): sin artículos en el equipo, entrar sin red no sirve para nada, y
 *   el que apagó el modo sin conexión no espera que el sistema quede abriendo solo.
 * - No es un acceso maestro (`es_acceso_maestro`) ni un login maestro básico
 *   (`skip_offline_articles_sync`): esa sesión es de soporte, no del comercio, y no tiene que poder
 *   reabrirse sola en el equipo.
 *
 * @param {Object|null} user Usuario autenticado (forma de GET /api/user).
 * @returns {Boolean}
 */
export function puede_guardar_sesion(user) {
	if (!user || !user.id) {
		return false
	}
	if (user.es_acceso_maestro || user.skip_offline_articles_sync) {
		return false
	}
	/** El dueño: el mismo usuario si no tiene `owner_id`, o el que viene embebido. */
	let owner = user.owner_id ? user.owner : user
	return Boolean(owner && owner.sync_offline_articles)
}

/**
 * Copia plana de un valor, sin los getters/setters reactivos de Vue ni funciones.
 *
 * IndexedDB clona con structured clone; los objetos del store son reactivos y conviene no
 * depender de cómo los serializa cada navegador.
 *
 * @param {*} valor
 * @returns {*}
 */
function copia_plana(valor) {
	return JSON.parse(JSON.stringify(valor))
}

/**
 * Guarda (o reemplaza) la sesión de este equipo, si el usuario puede tenerla. Si no puede (modo
 * sin conexión apagado, acceso maestro), BORRA la que hubiera: una sesión vieja de este mismo
 * comercio no tiene que seguir abriendo sola después de que el dueño apagó el modo.
 *
 * @param {Object} user Usuario confirmado por el servidor.
 * @returns {Promise<void>}
 */
export function guardar_sesion(user) {
	if (!puede_guardar_sesion(user)) {
		return borrar_sesion()
	}
	/** Registro que se guarda: el usuario y cuándo lo confirmó el servidor. */
	let registro = {
		key: CLAVE_SESION,
		value: {
			user: copia_plana(user),
			guardada_at: new Date().toISOString(),
		},
	}
	return db.meta.put(registro)
	.then(() => {})
	.catch(err => {
		console.log('No se pudo guardar la sesion para entrar sin conexion', err)
	})
}

/**
 * Lee la sesión guardada en este equipo.
 *
 * @returns {Promise<{user: Object, guardada_at: String}|null>} null si no hay ninguna utilizable.
 */
export function leer_sesion() {
	return db.meta.get(CLAVE_SESION)
	.then(registro => {
		if (!registro || !registro.value || !registro.value.user || !registro.value.user.id) {
			return null
		}
		return registro.value
	})
	.catch(err => {
		console.log('No se pudo leer la sesion guardada', err)
		return null
	})
}

/**
 * Borra la sesión guardada y los catálogos de este equipo.
 *
 * Los catálogos se van con la sesión porque son datos del comercio que solo sirven para entrar sin
 * conexión; el próximo inicio de sesión con internet los vuelve a bajar. Los artículos y las ventas
 * sin subir NO se tocan.
 *
 * @returns {Promise<void>}
 */
export function borrar_sesion() {
	return db.meta.delete(CLAVE_SESION)
	.then(() => borrar_catalogos())
	.catch(err => {
		console.log('No se pudo borrar la sesion guardada', err)
	})
}

/**
 * Guarda los catálogos del arranque en el equipo.
 *
 * @param {Array<{model_name: String, models: Array}>} catalogos
 * @returns {Promise<void>}
 */
export function guardar_catalogos(catalogos) {
	/** Registros para un solo bulkPut. */
	let registros = []
	catalogos.forEach(catalogo => {
		if (!catalogo || !catalogo.model_name || !Array.isArray(catalogo.models)) {
			return
		}
		registros.push({
			key: PREFIJO_CATALOGO + catalogo.model_name,
			value: {
				models: copia_plana(catalogo.models),
			},
		})
	})
	if (!registros.length) {
		return Promise.resolve()
	}
	return db.meta.bulkPut(registros)
	.then(() => {})
	.catch(err => {
		console.log('No se pudieron guardar los catalogos para usar sin conexion', err)
	})
}

/**
 * Lee todos los catálogos guardados en el equipo.
 *
 * @returns {Promise<Array<{model_name: String, models: Array}>>} Vacío si no hay ninguno.
 */
export function leer_catalogos() {
	return db.meta.where('key').startsWith(PREFIJO_CATALOGO).toArray()
	.then(registros => {
		/** Catálogos en la forma que los consume el panel de recursos. */
		let catalogos = []
		registros.forEach(registro => {
			if (registro && registro.value && Array.isArray(registro.value.models)) {
				catalogos.push({
					model_name: registro.key.slice(PREFIJO_CATALOGO.length),
					models: registro.value.models,
				})
			}
		})
		return catalogos
	})
	.catch(err => {
		console.log('No se pudieron leer los catalogos guardados', err)
		return []
	})
}

/**
 * Borra los catálogos guardados en el equipo.
 *
 * @returns {Promise<void>}
 */
export function borrar_catalogos() {
	return db.meta.where('key').startsWith(PREFIJO_CATALOGO).delete()
	.then(() => {})
	.catch(err => {
		console.log('No se pudieron borrar los catalogos guardados', err)
	})
}

/**
 * ¿Este error de axios significa "no hay conexión con el servidor" y no "no hay sesión"?
 *
 * - Sin `response`: red cortada, DNS, servidor que no contesta, timeout.
 * - 5xx: el servidor está caído o saturado (un 502/503 del proxy, un 500 del arranque).
 *
 * Un 401/419 (sesión vencida) o un 403 NO entran: ahí el servidor contestó y dijo que no.
 * Un error que no es de axios (un TypeError en un `.then`) tampoco: no es la red.
 *
 * @param {*} err
 * @returns {Boolean}
 */
export function es_falta_de_conexion(err) {
	if (!err || !err.isAxiosError) {
		return false
	}
	if (!err.response) {
		return true
	}
	return err.response.status >= 500
}

/**
 * Plugin de Vuex que mantiene la sesión guardada al día mirando las mutaciones de `auth`.
 *
 * Se resuelve acá, en un solo lugar, y no en cada pantalla que inicia sesión (LoginForm, el ingreso
 * por token de otra versión, el modal de la otra pestaña, `auth/me`): todos terminan en
 * `auth/setAuthenticated(true)` con el usuario COMPLETO ya commiteado. Se guarda en ese momento y no
 * en cada `auth/setUser`, porque varios lugares reemplazan al usuario con un modelo parcial (la foto
 * de perfil, por ejemplo, devuelve el `User` pelado, sin permisos ni dueño): guardar eso dejaría
 * una sesión que, restaurada sin conexión, no tiene permiso para entrar a Vender.
 *
 * Con `auth.sesion_sin_conexion` prendido no se guarda: el usuario que hay en memoria salió de la
 * propia copia del equipo, no del servidor, y su `guardada_at` tiene que seguir diciendo cuándo lo
 * confirmó el servidor por última vez.
 *
 * @param {Object} store
 * @returns {void}
 */
export function plugin_de_sesion_sin_conexion(store) {
	store.subscribe((mutation, state) => {
		/*
			Envuelto: una excepción acá (por ejemplo al copiar un usuario raro) no puede romper el
			commit que la disparó, que es el del inicio de sesión.
		*/
		try {
			if (mutation.type === 'auth/setAuthenticated' && mutation.payload === true) {
				if (!state.auth.sesion_sin_conexion && state.auth.user) {
					guardar_sesion(state.auth.user)
				}
				return
			}
			if (mutation.type === 'auth/setUser' && !mutation.payload) {
				borrar_sesion()
			}
		} catch (err) {
			console.log('plugin_de_sesion_sin_conexion', err)
		}
	})
}
