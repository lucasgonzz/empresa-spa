import axios from 'axios'

/*
	Mecanismo GENERICO de recuperacion para catalogos criticos del arranque que hoy no tienen
	ninguno: si su pedido individual (dentro de pedir_sueltos(), ver download-resources/Index.vue)
	falla, quedan marcados "listos" con el store vacio, para siempre, hasta que alguien recargue la
	pagina a mano (informe 20260925-incidente-selects-vacios-vender-trama.md, cliente Trama).

	`price_type` YA tiene un mecanismo parecido (mixins/vender/price_types.js), armado en la mision
	del 17-18/9. Este helper GENERALIZA esa idea para que la puedan usar otros catalogos sin
	duplicar la logica archivo por archivo, pero es un mecanismo APARTE: no toca price_types.js
	(60+ tests lo sostienen) y copia --no importa-- la funcion que lee el estado del arranque, para
	no crear una dependencia cruzada entre un mixin de Vender y un helper de common-vue.

	Mejora real sobre price_type (no solo paridad): en vez de UN solo GET extra, este mecanismo
	reintenta la red con backoff creciente -- varios intentos, no uno -- porque un corte de mas de
	unos segundos (el caso medido en Trama, 10-20% de fallas diarias) agota el intento unico de
	price_type sin dejar ningun otro camino de recuperacion salvo el reload manual.

	Estado module-level y no por componente, a proposito (mismo motivo que catalogo_de_listas_ya_
	pedido en price_types.js): un catalogo se recupera UNA vez por sesion de la SPA, sin importar
	cuantos componentes lo consuman ni cuantas veces se remonte Vender.vue.
*/
import Vue from 'vue'

/** El elemento raiz de common-vue/components/download-resources/Index.vue: data-estado del arranque. */
const MARCADOR_DEL_ARRANQUE_DE_RECURSOS = '[data-testid="recursos-estado"]'

/** Timeout del GET propio, igual que el de price_types.js::pedir_catalogo_de_listas_una_vez(). */
const TIMEOUT_DEL_INTENTO_MS = 15000

/**
 * Espera ANTES de cada reintento de red, creciente. Cinco valores: hasta cinco reintentos ademas
 * del intento inicial, y la suma (2+4+8+16+30) son 60 segundos -- el tope "~1 minuto en total" que
 * pide la mision. Un corte de unos pocos segundos (el caso tipico) se resuelve en el primer o
 * segundo reintento; uno mas largo tiene margen antes de darse por vencido.
 */
const ESPERAS_DE_REINTENTO_MS = [2000, 4000, 8000, 16000, 30000]

/**
 * Espera entre cada chequeo LOCAL de si el arranque ya llego a 'listo'. No es un reintento de red
 * (no cuenta contra ESPERAS_DE_REINTENTO_MS): es solo "¿ya termino de intentarlo el arranque?".
 */
const ESPERA_ENTRE_CHEQUEOS_DE_ARRANQUE_MS = 1000

/**
 * Tope de chequeos locales de arranque (120 * 1s = 2 minutos, el mismo orden de magnitud que
 * TIMEOUT_DESCARGA de e2e/helpers/recursos.js). Cubre el caso patologico de una pestaña que quedo
 * colgada sin que el marcador llegue nunca a 'listo': sin este tope, el chequeo local quedaria
 * reprogramandose para siempre.
 */
const MAXIMO_DE_CHEQUEOS_DE_ARRANQUE = 120

/**
 * Estado reactivo por catalogo (Vue.observable, no Vuex): lo leen los computeds de los selectores
 * de Vender para decidir que mostrar. Se crea de a uno, la primera vez que se pide -- no hace
 * falta declarar de antemano la lista cerrada de catalogos que van a usar este mecanismo.
 *
 * - reintentando: hay un intento de red en vuelo (o entre reintentos, esperando el proximo).
 * - agotado: se gastaron todos los reintentos sin que el servidor confirmara nada: hace falta el
 *   boton manual.
 * - confirmado_vacio: el servidor CONTESTO que el catalogo esta vacio (array de largo cero). No es
 *   una falla: es una cuenta que de verdad no tiene nada configurado en ese catalogo, y no tiene
 *   sentido seguir reintentando ni mostrar el boton de reintentar.
 */
const registro = Vue.observable({})

/** Cuantos reintentos de RED ya se gastaron, por model_name (indice sobre ESPERAS_DE_REINTENTO_MS). */
const reintentos_de_red_hechos = {}

/** Cuantos chequeos LOCALES de arranque ya se hicieron, por model_name. */
const chequeos_de_arranque_hechos = {}

/**
 * Si hay una cadena viva (esperando el arranque o reintentando la red) para ese model_name, para
 * no arrancar dos en paralelo cuando el mixin se llama mas de una vez (Vender.vue puede remontarse
 * sin recargar la pagina).
 */
const cadena_en_curso = {}

/**
 * El slot reactivo de un catalogo, creandolo la primera vez que se pide.
 *
 * @param {string} model_name
 * @returns {{reintentando: boolean, agotado: boolean, confirmado_vacio: boolean}}
 */
function slot_de_estado(model_name) {
	if (!registro[model_name]) {
		Vue.set(registro, model_name, {
			reintentando: false,
			agotado: false,
			confirmado_vacio: false,
		})
	}

	return registro[model_name]
}

/**
 * El estado reactivo publicado de un catalogo, para que un computed de componente lo lea
 * directamente (ver mixins/vender/payment_methods_recovery.js y afip_information_recovery.js).
 *
 * @param {string} model_name
 * @returns {{reintentando: boolean, agotado: boolean, confirmado_vacio: boolean}}
 */
export function estado_de_recuperacion(model_name) {
	return slot_de_estado(model_name)
}

/**
 * Que dice el arranque de recursos (download-resources/Index.vue) sobre si mismo.
 *
 * 🔴 Se COPIA de price_types.js::estado_del_arranque_de_recursos() a proposito, no se importa: el
 * plan de esta mision (3.1) pide evitar una dependencia cruzada entre un mixin propio de Vender y
 * un helper de common-vue que cualquier catalogo puede usar. Si el dia de mañana price_types.js
 * cambia esta lectura, este helper no tiene por que enterarse ni romperse con el.
 *
 * @returns {string} 'sin_marcador' (el componente todavia no monto), 'pendiente', 'descargando' o
 *                    'listo'.
 */
function estado_del_arranque_de_recursos() {
	let marcador = document.querySelector(MARCADOR_DEL_ARRANQUE_DE_RECURSOS)

	if (!marcador) {
		return 'sin_marcador'
	}

	return marcador.getAttribute('data-estado') || 'pendiente'
}

/**
 * El catalogo de ese modelo, tal cual esta hoy en el store, vacio o no.
 *
 * @param {string} model_name
 * @param {Object} store instancia $store (Vuex)
 * @returns {boolean} true si el modulo no existe o su `models` esta vacio.
 */
function catalogo_vacio(model_name, store) {
	let modulo = store.state[model_name]

	return !modulo || !modulo.models || !modulo.models.length
}

/**
 * ¿Todavia hay algo que esperar antes de dar este catalogo por perdido en esta sesion?
 *
 * Si: el catalogo esta vacio Y (el arranque todavia no termino de intentarlo, O ya termino pero
 * quedan reintentos de red disponibles). Una vez que el catalogo tiene datos, que se confirmo
 * vacio de verdad, o que se agotaron los reintentos, no hay nada mas que esperar.
 *
 * @param {string} model_name
 * @param {Object} store instancia $store (Vuex)
 * @returns {boolean}
 */
export function catalogo_todavia_puede_llegar(model_name, store) {
	if (!catalogo_vacio(model_name, store)) {
		return false
	}

	let estado = slot_de_estado(model_name)

	if (estado.confirmado_vacio) {
		return false
	}

	if (estado_del_arranque_de_recursos() !== 'listo') {
		return true
	}

	return (reintentos_de_red_hechos[model_name] || 0) < ESPERAS_DE_REINTENTO_MS.length
}

/**
 * Arranca (o continua) la cadena de recuperacion de un catalogo. Pensada para llamarse UNA vez
 * desde el created() de quien lo necesite (via los mixins), y es un no-op seguro si se vuelve a
 * llamar mientras ya hay una cadena viva, o si ya no hace falta nada (ver
 * catalogo_todavia_puede_llegar).
 *
 * Es PASIVA, igual que el mecanismo de price_type: no dispara ningun GET hasta que el arranque de
 * recursos (masivo + repliegue) ya termino de intentarlo por su cuenta. Disparar un GET propio
 * ANTES competiria por la misma conexion contra el pedido que el arranque ya tiene en vuelo, sin
 * ninguna ganancia -- si ese pedido va a llegar, va a llegar solo.
 *
 * @param {string} model_name nombre del modulo Vuex (ej. 'current_acount_payment_method').
 * @param {string} ruta_api ruta relativa que entiende $api (this.routeString(model_name)).
 * @param {Object} store instancia $store (Vuex).
 * @returns {void}
 */
export function reintentar_catalogo(model_name, ruta_api, store) {
	if (cadena_en_curso[model_name]) {
		return
	}

	if (!catalogo_todavia_puede_llegar(model_name, store)) {
		return
	}

	cadena_en_curso[model_name] = true

	continuar_cadena(model_name, ruta_api, store)
}

/**
 * Un paso de la cadena: si el arranque no termino, reprograma un chequeo local corto (no gasta
 * reintentos de red); si ya termino y el catalogo sigue vacio, dispara el intento de red.
 *
 * @param {string} model_name
 * @param {string} ruta_api
 * @param {Object} store
 * @returns {void}
 */
function continuar_cadena(model_name, ruta_api, store) {
	if (!catalogo_todavia_puede_llegar(model_name, store)) {
		cadena_en_curso[model_name] = false
		return
	}

	if (estado_del_arranque_de_recursos() === 'listo') {
		intentar_red(model_name, ruta_api, store)
		return
	}

	let chequeos = (chequeos_de_arranque_hechos[model_name] || 0) + 1
	chequeos_de_arranque_hechos[model_name] = chequeos

	if (chequeos > MAXIMO_DE_CHEQUEOS_DE_ARRANQUE) {
		// El arranque nunca llego a 'listo' (pestaña colgada, o algo la destruyo antes). No hay
		// timers vivos para siempre: se da por agotado igual, con el boton manual como salida.
		console.log('critical_catalog_recovery: ' + model_name + ' se dio por agotado esperando el arranque, nunca llego a listo')
		marcar_agotado(model_name)
		return
	}

	setTimeout(function () {
		continuar_cadena(model_name, ruta_api, store)
	}, ESPERA_ENTRE_CHEQUEOS_DE_ARRANQUE_MS)
}

/**
 * Dispara UN GET propio contra ruta_api. Si la respuesta trae `models` como array (vacio o no) lo
 * commitea contra el store y da la cadena por resuelta; si no --fallo de red, timeout, o una
 * respuesta que no trae lo que se espera-- programa el siguiente reintento con backoff, o agota la
 * cadena si ya no quedan.
 *
 * 🔴 Mismo criterio que price_types.js::pedir_catalogo_de_listas_una_vez(): solo se commitea, y
 * solo se confirma el vacio, cuando `models` es efectivamente un array. Una respuesta 200 sin
 * `models` (la pagina generica de un hosting saturado, por ejemplo) no se distingue de una que
 * todavia no llego: ante la duda, se reintenta.
 *
 * `skip_global_error_event: true` porque un cartel global de "no pudimos conectarnos" disparado
 * en soledad por un reintento de fondo --sin que el vendedor haya hecho nada-- se lee como que se
 * cayo todo el sistema. El estado visible de cada selector (reintentando / boton Reintentar) ya es
 * el aviso que corresponde.
 *
 * @param {string} model_name
 * @param {string} ruta_api
 * @param {Object} store
 * @returns {void}
 */
function intentar_red(model_name, ruta_api, store) {
	let estado = slot_de_estado(model_name)
	estado.reintentando = true
	estado.agotado = false

	axios.get('/api/' + ruta_api, {
		timeout: TIMEOUT_DEL_INTENTO_MS,
		skip_global_error_event: true,
	})
	.then(function (res) {
		let models = res && res.data ? res.data.models : null

		if (!Array.isArray(models)) {
			console.log('critical_catalog_recovery: ' + model_name + ' no trajo un array de models, se reintenta')
			programar_siguiente_reintento(model_name, ruta_api, store)
			return
		}

		estado.reintentando = false

		if (!models.length) {
			estado.confirmado_vacio = true
		}

		store.commit(model_name + '/setModels', models)
		cadena_en_curso[model_name] = false
	})
	.catch(function (err) {
		console.log(err)
		programar_siguiente_reintento(model_name, ruta_api, store)
	})
}

/**
 * Agenda el proximo intento de red con el backoff que corresponda, o agota la cadena si ya no
 * quedan. Bandera de reintentos (reintentos_de_red_hechos) y no un simple contador de vueltas: es
 * lo que le permite a catalogo_todavia_puede_llegar() saber, desde afuera, cuantos quedan.
 *
 * @param {string} model_name
 * @param {string} ruta_api
 * @param {Object} store
 * @returns {void}
 */
function programar_siguiente_reintento(model_name, ruta_api, store) {
	let hechos = reintentos_de_red_hechos[model_name] || 0

	if (hechos >= ESPERAS_DE_REINTENTO_MS.length) {
		marcar_agotado(model_name)
		return
	}

	let espera = ESPERAS_DE_REINTENTO_MS[hechos]
	reintentos_de_red_hechos[model_name] = hechos + 1

	setTimeout(function () {
		intentar_red(model_name, ruta_api, store)
	}, espera)
}

/**
 * Cierra la cadena en "agotado": el estado que hace aparecer el boton manual.
 *
 * @param {string} model_name
 * @returns {void}
 */
function marcar_agotado(model_name) {
	let estado = slot_de_estado(model_name)
	estado.reintentando = false
	estado.agotado = true
	cadena_en_curso[model_name] = false
}

/**
 * El boton "Reintentar" manual: resetea los contadores de ESE catalogo y dispara un intento de
 * red inmediato, saltando la espera del arranque (si el boton esta visible es porque `agotado` ya
 * esta prendido, y eso solo pasa despues de que el arranque termino de intentarlo hace rato).
 *
 * Si este intento inmediato tambien falla, la cadena de backoff automatica sigue sola desde ahi
 * (programar_siguiente_reintento reprograma el proximo paso): no hace falta que la persona
 * clickee varias veces.
 *
 * @param {string} model_name
 * @param {string} ruta_api
 * @param {Object} store
 * @returns {void}
 */
export function forzar_reintento_ahora(model_name, ruta_api, store) {
	if (cadena_en_curso[model_name]) {
		return
	}

	if (!catalogo_vacio(model_name, store)) {
		return
	}

	reintentos_de_red_hechos[model_name] = 0
	chequeos_de_arranque_hechos[model_name] = 0

	let estado = slot_de_estado(model_name)
	estado.agotado = false
	estado.confirmado_vacio = false

	cadena_en_curso[model_name] = true

	intentar_red(model_name, ruta_api, store)
}
