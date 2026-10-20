/**
 * Nombres físicos de los canales en vivo (misión pusher-canales-por-sistema, 19/10/2026).
 *
 * ## El problema
 *
 * Toda la flota —demos incluidas— usa UNA sola app de Pusher, y los canales llevaban solo un id
 * (`global_notification.2600`, `private-chat.user.2600`...). Dos sistemas con el mismo id de dueño se
 * escuchaban entre sí: el 19/10/2026 el aviso del escaneo de una factura de demo3 le apareció a
 * Ferretotal, y un login en demo3 podía expulsar al dueño de Ferretotal.
 *
 * ## La solución, del lado del SPA
 *
 * empresa-api ahora emite cada canal con el sufijo `@{espacio}` del sistema
 * (`global_notification.2600@26d5013a6846`) y manda ese espacio en el usuario
 * (`user.canales_en_vivo`, ver `App\Models\User::getCanalesEnVivoAttribute()`). Este módulo lo guarda
 * y envuelve la instancia de Echo para que TODO nombre lógico que le pidan los componentes se traduzca
 * al físico. Por eso ningún componente se toca: `broadcast.js`, `FloatingButton`, `SidebarHost`,
 * `Aviso*Automaticas` siguen pidiendo `Echo.channel('global_notification.' + owner_id)`.
 *
 * ## Compatibilidad
 *
 * - API vieja (no manda `canales_en_vivo`): el espacio queda en `null` y los nombres no cambian. El
 *   SPA nuevo contra una API vieja escucha exactamente como antes.
 * - Canales que emite la TIENDA (`order.created.{owner}`, `private-tienda-mensajes.{owner}`): la
 *   tienda se actualiza aparte, así que en el modo de transición (`canales_viejos_de_tienda: true`,
 *   el default) se siguen escuchando SIN espacio, como hoy; la tienda nueva en transición emite con y
 *   sin espacio, así que llega igual. En estricto (`false`), con espacio.
 *
 * ## 🔴 Por qué el estado vive acá y no en `state.user`
 *
 * `state.user` se reemplaza desde varios endpoints que devuelven el usuario a medias (la foto de
 * perfil en Cropper.vue, deleteImage, address.js...). Si el espacio viviera ahí, un reemplazo sin la
 * clave lo borraría a mitad de la sesión y el próximo `Echo.leave()` buscaría el canal sin sufijo, que
 * no existe: la suscripción vieja quedaría viva. Por eso `set_canales_en_vivo()` ignora un null y
 * nunca borra un espacio ya recibido.
 *
 * Las claves (`espacio`, `canales_viejos_de_tienda`) son contrato con empresa-api y son las mismas que
 * usa tienda-spa con `Buyer`.
 */

/** Separador entre el nombre lógico y el espacio. Mismo que `EspacioDeCanales::SEPARADOR` de la API. */
const SEPARADOR = '@'

/**
 * Prefijos de tipo de canal de Pusher, en el orden en que hay que probarlos (el cifrado primero,
 * porque también empieza con `private-`). Echo los agrega en el conector: `Echo.private('x')` se
 * suscribe a `private-x`.
 */
const PREFIJOS_DE_TIPO = ['private-encrypted-', 'private-', 'presence-']

/**
 * Comienzos de los nombres LÓGICOS (sin prefijo de tipo) de los canales que este SPA escucha y que
 * emite la tienda, que no sale en el mismo release que el ERP:
 *
 * - `order.created.{owner}`: pedido nuevo de la tienda (`mixins/broadcast.js`).
 * - `tienda-mensajes.{owner}`: privado de Mensajes, lo emiten tienda-api y empresa-api
 *   (`components/online/components/mensajes/SidebarHost.vue`).
 *
 * `added_model.{owner}` también lo podría emitir tienda-api, pero su `sendAddModelNotification()` no
 * tiene ningún llamador vivo (medido el 19/10/2026): ese canal lo emite solo empresa-api y va con
 * espacio como el resto.
 *
 * 🔴 Si mañana el SPA escucha un canal nuevo que emite la tienda, va acá. Si no, con una tienda sin
 * actualizar ese canal no llega nunca, sin ningún error a la vista.
 */
const PREFIJOS_DE_TIENDA = ['order.created.', 'tienda-mensajes.']

/**
 * Estado del módulo: lo último que mandó la API.
 *
 * - espacio: null hasta que llegue (API vieja → queda null para siempre y nada cambia).
 * - canales_viejos_de_tienda: true (transición) hasta que la API diga otra cosa.
 */
const estado = {
	espacio: null,
	canales_viejos_de_tienda: true,
}

/**
 * Guarda lo que mandó la API en `user.canales_en_vivo`. Lo llama `auth/setUser`.
 *
 * Ignora un null, un objeto sin espacio o un espacio vacío: nunca borra uno ya recibido (ver el
 * bloque de arriba sobre `state.user`).
 *
 * @param {{espacio: string, canales_viejos_de_tienda: boolean}|null|undefined} datos
 * @returns {void}
 */
export function set_canales_en_vivo(datos) {
	if (!datos || typeof datos !== 'object' || !datos.espacio) {
		return
	}

	estado.espacio = String(datos.espacio)
	// Solo un false explícito pasa a estricto; cualquier otra cosa es la transición.
	estado.canales_viejos_de_tienda = datos.canales_viejos_de_tienda !== false
}

/**
 * Lo que hay guardado ahora (copia: no se puede modificar el estado desde afuera). Para depurar desde
 * la consola y para el arnés de pruebas.
 *
 * @returns {{espacio: (string|null), canales_viejos_de_tienda: boolean}}
 */
export function get_canales_en_vivo() {
	return {
		espacio: estado.espacio,
		canales_viejos_de_tienda: estado.canales_viejos_de_tienda,
	}
}

/**
 * Separa el prefijo de tipo de Pusher del resto del nombre.
 *
 * @param {string} nombre Nombre completo (`private-chat.user.5`) o lógico (`chat.user.5`).
 * @returns {{prefijo: string, resto: string}}
 */
function separar_prefijo_de_tipo(nombre) {
	/** Prefijo encontrado ('' si no tiene). */
	let prefijo = ''

	PREFIJOS_DE_TIPO.forEach(function (candidato) {
		if (prefijo === '' && nombre.indexOf(candidato) === 0) {
			prefijo = candidato
		}
	})

	return {
		prefijo: prefijo,
		resto: nombre.substring(prefijo.length),
	}
}

/**
 * ¿Es un canal que emite la tienda (ver `PREFIJOS_DE_TIENDA`)? Se mira sin el prefijo de tipo.
 *
 * @param {string} nombre
 * @returns {boolean}
 */
function es_canal_de_tienda(nombre) {
	/** Nombre sin `private-` / `presence-`. */
	const logico = separar_prefijo_de_tipo(nombre).resto

	return PREFIJOS_DE_TIENDA.filter(function (prefijo) {
		return logico.indexOf(prefijo) === 0
	}).length > 0
}

/**
 * `String.prototype.endsWith` sin depender del polyfill.
 *
 * @param {string} texto
 * @param {string} final
 * @returns {boolean}
 */
function termina_con(texto, final) {
	return texto.length >= final.length && texto.substring(texto.length - final.length) === final
}

/**
 * Traduce un nombre lógico al físico: el que de verdad se escucha en Pusher.
 *
 * - Sin espacio (API vieja o todavía no llegó) → igual.
 * - Canal de la tienda en transición → igual (como hoy).
 * - Ya termina en `@{espacio}` → igual (nunca doble sufijo: `leaveAllChannels()` de Echo vuelve a
 *   pasar por acá con los nombres ya físicos).
 * - Cualquier otro → `nombre + '@' + espacio`.
 *
 * @param {string} nombre_logico Nombre como lo piden los componentes, sin prefijo de tipo.
 * @returns {string}
 */
export function nombre_fisico(nombre_logico) {
	if (typeof nombre_logico !== 'string' || nombre_logico === '') {
		return nombre_logico
	}
	if (!estado.espacio) {
		return nombre_logico
	}
	if (estado.canales_viejos_de_tienda && es_canal_de_tienda(nombre_logico)) {
		return nombre_logico
	}

	/** Sufijo propio de este sistema. */
	const sufijo = SEPARADOR + estado.espacio

	if (termina_con(nombre_logico, sufijo)) {
		return nombre_logico
	}

	return nombre_logico + sufijo
}

/**
 * Como `nombre_fisico()`, pero para un nombre COMPLETO, con su prefijo de tipo
 * (`private-chat.user.5`): se separa el prefijo, se traduce el resto y se vuelve a pegar. Es lo que
 * recibe `Echo.leaveChannel()`.
 *
 * @param {string} nombre_completo
 * @returns {string}
 */
function nombre_fisico_completo(nombre_completo) {
	if (typeof nombre_completo !== 'string' || nombre_completo === '') {
		return nombre_completo
	}

	/** Prefijo de tipo y nombre lógico. */
	const partes = separar_prefijo_de_tipo(nombre_completo)

	return partes.prefijo + nombre_fisico(partes.resto)
}

/**
 * Métodos de la instancia de Echo (laravel-echo 1.x) cuyo primer argumento es el nombre LÓGICO del
 * canal, sin prefijo de tipo: el conector le agrega `private-` / `presence-` después.
 */
const METODOS_CON_NOMBRE_LOGICO = ['channel', 'private', 'encryptedPrivate', 'join', 'leave', 'listen']

/**
 * Envuelve una instancia de Echo para que traduzca los nombres lógicos a físicos. Se llama UNA vez,
 * en `main.js`, al crearla.
 *
 * Reemplaza en la instancia (no en el prototipo de Echo):
 * - `channel`, `private`, `encryptedPrivate`, `join`, `leave`, `listen`: traducen el primer argumento
 *   con `nombre_fisico()`.
 * - `leaveChannel`: recibe el nombre COMPLETO (`private-...`), así que separa el prefijo, traduce el
 *   resto y lo vuelve a pegar.
 *
 * Por qué alcanza con la instancia (leído en `node_modules/laravel-echo/dist/echo.js`, 1.15.0):
 * `Echo.leave(nombre)` llama a `connector.leave(nombre)`, y ese llama a `connector.leaveChannel()` con
 * las cuatro variantes del nombre: no vuelve a pasar por los métodos de la instancia, así que no hay
 * doble sufijo. Lo mismo `Echo.listen()` → `connector.listen()` → `connector.channel()`. La única que
 * sí vuelve a la instancia es `Echo.leaveAllChannels()` → `this.leaveChannel(nombre)`, con los nombres
 * ya físicos que guarda el conector: `nombre_fisico()` los deja como están porque ya terminan en el
 * sufijo.
 *
 * El nombre se traduce en el MOMENTO de la llamada, no al envolver: el espacio llega con el usuario,
 * mucho después de crear Echo, y las suscripciones arrancan recién con los watchers de `user.id` /
 * `authenticated`, o sea después de `set_canales_en_vivo()`.
 *
 * @param {Object} echo Instancia de `laravel-echo`.
 * @returns {Object} La misma instancia, envuelta.
 */
export function envolver_echo(echo) {
	if (!echo || echo.__canales_en_vivo_envuelto) {
		return echo
	}

	METODOS_CON_NOMBRE_LOGICO.forEach(function (metodo) {
		if (typeof echo[metodo] !== 'function') {
			return
		}

		/** El método original de Echo, atado a la instancia. */
		const original = echo[metodo]

		echo[metodo] = function () {
			/** Argumentos tal cual vinieron, con el nombre traducido. */
			const argumentos = Array.prototype.slice.call(arguments)
			argumentos[0] = nombre_fisico(argumentos[0])
			return original.apply(echo, argumentos)
		}
	})

	if (typeof echo.leaveChannel === 'function') {
		/** El leaveChannel original de Echo. */
		const leave_channel_original = echo.leaveChannel

		echo.leaveChannel = function (nombre_completo) {
			return leave_channel_original.call(echo, nombre_fisico_completo(nombre_completo))
		}
	}

	// Marca no enumerable: envolver dos veces encadenaría las traducciones (inocuo por el chequeo del
	// sufijo, pero innecesario).
	Object.defineProperty(echo, '__canales_en_vivo_envuelto', { value: true, enumerable: false })

	return echo
}
