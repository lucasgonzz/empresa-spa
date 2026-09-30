/*
	Estado de trabajo del editor de Diseños de Vender (mision diseno-vender-configurable, 28/9/2026).

	El editor no arrastra el JSON guardado: arrastra una copia "de trabajo" que separa lo que el
	usuario puede ver y mover de lo que no. Estas funciones son puras (no tocan Vue ni la API) para
	que la regla mas delicada del editor -- no perder nada al guardar -- quede en un solo lugar.

	La forma del estado de trabajo:

	- etapas            por etapa, los items que se dibujan en el lienzo: elementos DISPONIBLES para
	                    este negocio/usuario y marcadores (separadores y saltos de fila), como
	                    {key, cols} (y {id} los marcadores).
	                    Son las listas que muta vuedraggable.
	- sacados           los elementos sacados que estan disponibles, como {key, cols}: los que se ven
	                    en la bandeja y se pueden volver a agregar.
	- ocultos           por etapa, los elementos NO disponibles (extension apagada, sin permiso,
	                    catalogo vacio) que el diseño tiene ubicados, con su posicion original.
	- orden_original    por etapa, la identidad de cada item en el orden en que vino el diseño; y en
	                    `sacados`, las keys sacadas en el orden en que vinieron.
	- sacados_ocultos   las keys sacadas que no estan disponibles, como {key, indice}.

	🔴 Por que existen `ocultos` y `sacados_ocultos`. El editor muestra solo lo que Vender le muestra
	a ESTE negocio, pero un diseño ubica TODO el catalogo (el resolver lo garantiza). Si al guardar se
	descartara lo que no se ve, el dia que el negocio prende la extension -- o le dan el permiso a un
	empleado -- el campo reapareceria en su lugar por defecto y no donde estaba. Por eso lo oculto
	vuelve al JSON tal cual: en su etapa, pegado al mismo vecino que tenia (ver armar_diseno_completo),
	o en `sacados` si estaba sacado.

	Y por la misma regla, abrir un diseño y guardarlo sin tocar nada devuelve exactamente el mismo
	diseño: con eso se mide si hay cambios sin guardar (huella_del_estado).
*/
import {
	ETAPAS,
	es_marcador,
	elemento,
	esta_disponible,
	cols_por_defecto,
} from '@/components/vender/layout/elementos'
import { resolver_diseno } from '@/components/vender/layout/resolver_diseno'
import diseno_predeterminado from '@/components/vender/layout/diseno_predeterminado'

/*
	Los dos elementos que agregan un articulo BUSCANDOLO. Combos, promociones, servicio y cantidad
	tambien son "entrada de articulos", pero sin el codigo de barras y sin el buscador por nombre no
	hay forma de cargar un articulo del catalogo: por eso un diseño sin ninguno de los dos no se
	guarda (decision del plan de la mision, §1).
*/
export const KEYS_DE_BUSCADORES = ['codigo_de_barras', 'buscador_de_articulos']

/*
	Tope de marcadores por etapa: hasta 10 separadores y 10 saltos de fila en cada una. El backend
	corta cada etapa en 100 items (VenderLayoutHelper::normalizar_layout) y lo que sobra lo reubica el
	resolver sin avisar; con el tope, ninguna etapa se acerca a ese limite por acumular marcadores, y
	el usuario se entera en el momento (el `move` del editor rechaza el que sobra y lo avisa).
*/
export const TOPE_DE_MARCADORES_POR_ETAPA = 10

/**
 * Identidad estable de un item dentro de un diseño: la key para un elemento (cada uno aparece una
 * sola vez) y "<key>:<id>" para un marcador ("separador:separador_1", "salto_de_fila:...": puede
 * haber varios). Sirve de `key` del v-for y para reconocer un item en otra lista.
 *
 * @param {Object} item {key, cols, id?}
 * @returns {string}
 */
export function identidad(item) {
	if (!item) {
		return ''
	}
	return es_marcador(item.key) ? item.key + ':' + item.id : item.key
}

/**
 * Copia de un item con solo lo que forma parte del diseño. Los marcadores van siempre a 12
 * columnas (el separador es una linea a lo ancho; el salto de fila, un corte de fila).
 *
 * @param {Object} item
 * @returns {Object}
 */
export function copiar_item(item) {
	let copia = {
		key: item.key,
		cols: item.cols,
	}
	if (es_marcador(item.key)) {
		copia.id = item.id
		copia.cols = 12
	}
	return copia
}

/**
 * Posicion de un item (por identidad) dentro de una lista, o -1.
 *
 * @param {Array} lista
 * @param {string} id identidad buscada
 * @returns {number}
 */
function posicion_de_identidad(lista, id) {
	let posicion = -1
	lista.forEach(function (item, indice) {
		if (posicion === -1 && identidad(item) === id) {
			posicion = indice
		}
	})
	return posicion
}

/**
 * Arma el estado de trabajo del editor a partir de un layout guardado (o de null, que es el diseño
 * predeterminado del sistema).
 *
 * @param {Object|string|null} layout lo que vino en vender_layouts.layout
 * @param {Object} vm componente de la SPA (para disponibilidad y anchos por defecto)
 * @returns {{etapas: Object, sacados: Array, ocultos: Object, orden_original: Object, sacados_ocultos: Array}}
 */
export function armar_estado_de_trabajo(layout, vm) {
	/* Siempre trae TODOS los elementos del catalogo, cada uno una vez (contrato del resolver) */
	let resuelto = resolver_diseno(layout, vm)

	let estado = {
		etapas: {},
		sacados: [],
		ocultos: {},
		orden_original: {
			sacados: resuelto.sacados.slice(),
		},
		sacados_ocultos: [],
	}

	ETAPAS.forEach(function (etapa) {
		estado.etapas[etapa] = []
		estado.ocultos[etapa] = []
		estado.orden_original[etapa] = []

		resuelto.etapas[etapa].forEach(function (item, indice) {
			estado.orden_original[etapa].push(identidad(item))

			/* esta_disponible() devuelve true para los marcadores: se ven siempre */
			if (esta_disponible(item.key, vm)) {
				estado.etapas[etapa].push(copiar_item(item))
			} else {
				estado.ocultos[etapa].push({
					item: copiar_item(item),
					indice: indice,
				})
			}
		})
	})

	resuelto.sacados.forEach(function (key, indice) {
		if (esta_disponible(key, vm)) {
			/* En la bandeja el campo guarda un ancho: el que va a tener si se lo vuelve a agregar */
			estado.sacados.push({
				key: key,
				cols: cols_por_defecto(key, vm),
			})
		} else {
			estado.sacados_ocultos.push({
				key: key,
				indice: indice,
			})
		}
	})

	return estado
}

/**
 * Rearma el diseño completo (lo que se ve + lo oculto) para mandarlo a serializar_diseno().
 *
 * Cada elemento oculto vuelve a su etapa pegado al vecino que tenia antes en el diseño original:
 * se busca hacia atras, en el orden original, el item mas cercano que siga estando en la etapa
 * (aunque el usuario lo haya movido de lugar), y el oculto va inmediatamente despues. Si no queda
 * ninguno de sus vecinos anteriores en la etapa, va al principio. Los ocultos se recorren en su
 * orden original, asi que dos ocultos seguidos siguen quedando seguidos.
 *
 * El plan pedia "al final de su etapa"; pegarlo a su vecino es lo mismo cuando el usuario no toco
 * nada de alrededor, y ademas hace que abrir y guardar sin cambios devuelva el diseño identico.
 *
 * @param {Object} estado estado de trabajo (armar_estado_de_trabajo)
 * @returns {{etapas: Object, sacados: Array}}
 */
export function armar_diseno_completo(estado) {
	let etapas = {}

	ETAPAS.forEach(function (etapa) {
		let lista = []

		estado.etapas[etapa].forEach(function (item) {
			lista.push(copiar_item(item))
		})

		let orden = estado.orden_original[etapa] || []
		let ocultos = estado.ocultos[etapa] || []

		ocultos.forEach(function (oculto) {
			/* Por defecto al principio: el oculto no tenia ningun vecino anterior que siga aca */
			let insertar_en = 0

			for (let i = oculto.indice - 1; i >= 0; i--) {
				let posicion = posicion_de_identidad(lista, orden[i])
				if (posicion >= 0) {
					insertar_en = posicion + 1
					break
				}
			}

			lista.splice(insertar_en, 0, copiar_item(oculto.item))
		})

		etapas[etapa] = lista
	})

	/* Los sacados ocultos vuelven con el mismo criterio de vecino, contra el orden en que vinieron */
	let sacados = []

	estado.sacados.forEach(function (item) {
		sacados.push(item.key)
	})

	let orden_de_sacados = estado.orden_original.sacados || []

	estado.sacados_ocultos.forEach(function (oculto) {
		let insertar_en = 0

		for (let i = oculto.indice - 1; i >= 0; i--) {
			let posicion = sacados.indexOf(orden_de_sacados[i])
			if (posicion >= 0) {
				insertar_en = posicion + 1
				break
			}
		}

		sacados.splice(insertar_en, 0, oculto.key)
	})

	return {
		etapas: etapas,
		sacados: sacados,
	}
}

/**
 * Huella de SOLO el diseño (sin nombre ni "en uso"): con ella el editor sabe si el lienzo se toco
 * respecto de su base (la del momento de abrir, o la de "Restablecer"). Es lo que decide si al
 * guardar viaja el `layout`: renombrar un diseño o ponerlo en uso no lo tiene que "congelar".
 *
 * @param {Object} estado estado de trabajo
 * @returns {string}
 */
export function huella_del_diseno(estado) {
	return JSON.stringify(armar_diseno_completo(estado))
}

/**
 * Huella del estado del editor, para saber si hay cambios sin guardar: se compara la del momento
 * de abrir con la de ahora. El nombre va sin espacios de los costados porque asi se guarda.
 *
 * `sigue_al_sistema` entra en la huella porque volver al diseño del sistema es un cambio aunque el
 * lienzo quede igual: un diseño fijo identico al predeterminado, restablecido, se guarda en null.
 *
 * @param {string} nombre
 * @param {boolean} en_uso
 * @param {Object} estado estado de trabajo
 * @param {boolean} [sigue_al_sistema] si al guardar va a quedar como el diseño del sistema (null)
 * @returns {string}
 */
export function huella_del_estado(nombre, en_uso, estado, sigue_al_sistema) {
	return JSON.stringify({
		nombre: String(nombre || '').trim(),
		en_uso: !!en_uso,
		sigue_al_sistema: !!sigue_al_sistema,
		diseno: armar_diseno_completo(estado),
	})
}

/**
 * Posicion en la que conviene volver a poner un elemento dentro de su etapa por defecto: despues
 * de su predecesor mas cercano en el orden del diseño predeterminado; si no hay ninguno en la
 * lista, antes de su sucesor mas cercano; si tampoco, al final. Es el mismo criterio con el que
 * el resolver ubica un elemento que el diseño no nombra (resolver_diseno.js::insertar_en_su_lugar),
 * asi "Agregar" desde la bandeja deja el campo donde el usuario lo espera.
 *
 * @param {Array} lista items de la etapa de destino
 * @param {string} key
 * @param {Object} vm
 * @returns {number}
 */
export function indice_por_defecto(lista, key, vm) {
	let el = elemento(key)

	if (!el) {
		return lista.length
	}

	/* Orden por defecto de la etapa, sin marcadores */
	let orden = []
	diseno_predeterminado(vm).etapas[el.etapa].forEach(function (item) {
		if (!es_marcador(item.key)) {
			orden.push(item.key)
		}
	})

	let posicion = orden.indexOf(key)

	for (let p = posicion - 1; p >= 0; p--) {
		let indice = posicion_de_identidad(lista, orden[p])
		if (indice >= 0) {
			return indice + 1
		}
	}

	for (let s = posicion + 1; s < orden.length; s++) {
		let indice = posicion_de_identidad(lista, orden[s])
		if (indice >= 0) {
			return indice
		}
	}

	return lista.length
}

/**
 * Si el diseño se quedo sin buscadores: el negocio tiene disponible el codigo de barras o el
 * buscador por nombre, y ninguno de los dos esta ubicado en una etapa. Solo cuentan los que se
 * ven (las listas de trabajo solo tienen disponibles): un buscador oculto no le sirve a nadie.
 *
 * @param {Object} etapas listas de trabajo por etapa
 * @param {Object} vm
 * @returns {boolean}
 */
export function falta_buscador(etapas, vm) {
	let disponibles = KEYS_DE_BUSCADORES.filter(function (key) {
		return esta_disponible(key, vm)
	})

	if (!disponibles.length) {
		return false
	}

	let ubicado = false

	ETAPAS.forEach(function (etapa) {
		(etapas[etapa] || []).forEach(function (item) {
			if (disponibles.indexOf(item.key) !== -1) {
				ubicado = true
			}
		})
	})

	return !ubicado
}

/**
 * Cantidad de marcadores de un tipo (separadores o saltos de fila) en una lista de items.
 *
 * @param {Array} lista
 * @param {string} key KEY_SEPARADOR o KEY_SALTO_DE_FILA
 * @returns {number}
 */
export function contar_marcadores(lista, key) {
	return (lista || []).filter(function (item) {
		return item.key === key
	}).length
}

/**
 * Cantidad de campos (sin contar marcadores) de una lista de items.
 *
 * @param {Array} lista
 * @returns {number}
 */
export function contar_campos(lista) {
	return (lista || []).filter(function (item) {
		return !es_marcador(item.key)
	}).length
}
