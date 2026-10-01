/*
	Estado de trabajo del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	El diseñador no arrastra el JSON guardado (`pdf_column_profiles.page_layout`): arrastra una copia
	"de trabajo" con lo que la interfaz necesita (un id de interfaz por campo para el v-for y la
	selección). Estas funciones son puras (no tocan Vue ni la API), igual que estado_del_editor.js
	del editor de Diseños de Vender, para que la regla más delicada -- no perder nada al guardar y
	que abrir y guardar sin tocar devuelva el MISMO diseño -- quede en un solo lugar y se pueda
	probar con Node.

	La forma del JSON es la de DisenoDePaginaPdf (empresa-api): {version, superior: [ITEM], pie: [ITEM]}
	con ITEM = caja | salto_de_fila | fijo. La forma de trabajo es la misma, salvo que cada campo de
	una caja lleva además `ui_id` (solo interfaz: no se guarda).

	🔴 Lo único del catálogo que este archivo conoce por nombre son las keys `texto_libre`,
	`afip_receptor` y `afip_pie`, los tipos `caja` / `salto_de_fila` / `fijo` (contrato con
	CatalogoDeCamposPdf y DisenoDePaginaPdf) y el formato `a5` (solo para la regla de la factura de
	ARCA, ver KEY_HOJA_A5). Nombres, ejemplos, estilos por defecto y límites llegan del endpoint
	`pdf-column-profiles/page-layout-catalog`: nada de eso se escribe acá.
*/

/* El único campo repetible: el texto que escribe el usuario (CatalogoDeCamposPdf::KEY_TEXTO_LIBRE) */
export const KEY_TEXTO_LIBRE = 'texto_libre'

/* Bloques fijos de la factura de ARCA (CatalogoDeCamposPdf::FIJO_*): se mueven, no se sacan */
export const FIJO_AFIP_RECEPTOR = 'afip_receptor'
export const FIJO_AFIP_PIE = 'afip_pie'

/* Tipos de ítem de una zona (DisenoDePaginaPdf::TIPO_*) */
export const TIPO_CAJA = 'caja'
export const TIPO_SALTO_DE_FILA = 'salto_de_fila'
export const TIPO_FIJO = 'fijo'

/* Las dos zonas del diseño, en el orden en que se dibujan (DisenoDePaginaPdf::ZONAS) */
export const ZONAS = ['superior', 'pie']

/* Versión del esquema que se guarda (DisenoDePaginaPdf::VERSION) */
export const VERSION_DEL_DISENO = 1

/* Patrones de ids y keys que valida la API (DisenoDePaginaPdf::PATRON_ID / PATRON_KEY) */
export const PATRON_ID = /^[a-z0-9_]{1,40}$/
export const PATRON_KEY = /^[a-z0-9_]{1,60}$/

/*
	La hoja que imprime el PDF de siempre (NewSalePdf / ProfileDocumentPdf): una A4 vertical con 5 mm
	de margen, SIN importar lo que el perfil tenga guardado en paper_width_mm / margin_mm (hallazgo
	del 30/9: hay perfiles de venta con los 297/277 que el formulario ponía por defecto, y su PDF
	sale igual en A4). Es la hoja con que el diseñador muestra un perfil que nunca se diseñó (el
	diseño equivalente a lo que imprime hoy) y la que vuelve a dejar "Volver al diseño de siempre"
	(plan §8.3: 210/210/5 y paper_height_mm en null).
*/
export const HOJA_DE_SIEMPRE = {
	ancho: 210,
	alto: 297,
	margen: 5,
}

/* Lo que vale cada dato de la hoja cuando el perfil no lo tiene (plan §4.1: 210, 297 y 5) */
export const ANCHO_DE_HOJA_POR_DEFECTO = 210
export const ALTO_DE_HOJA_POR_DEFECTO = 297
export const MARGEN_POR_DEFECTO = 5

/*
	Key del formato A5 en CatalogoDeCamposPdf::formatos_de_hoja(). En una A5 no entra completo el
	bloque fijo de ARCA del pie (importes + QR + CAE, unos 100 mm) debajo del encabezado y la zona de
	arriba (dato del lado API, 1/10/2026): una factura de ARCA no se diseña en A5. Es la única key de
	formato que el diseñador conoce por nombre, y solo para esta regla.
*/
export const KEY_HOJA_A5 = 'a5'

/* Por qué una factura de ARCA no va en A5 (se muestra en los controles de la hoja y arriba del lienzo) */
export const MOTIVO_A5_EN_ARCA = 'En A5 no entra completo el cuadro de ARCA (importes, QR y CAE): para facturas usá A4, Carta u Oficio.'

/* Aviso suave (no bloquea) de una venta en A5 con "Mostrar pie de página en cada hoja" */
export const AVISO_A5_CON_PIE_EN_CADA_HOJA = 'Con hoja A5 y el pie en cada hoja, entran pocos renglones por hoja.'

/* Ancho (en columnas de 12) de una caja nueva desde "+ Agregar caja" (plan §8.3) */
export const COLS_DE_CAJA_NUEVA = 6

/* Ancho de la caja que "Agregar" crea cuando la zona no tiene ninguna (plan §8.3) */
export const COLS_DE_CAJA_COMPLETA = 12

/* Contador de los ids de interfaz de los campos (ver nuevo_ui_id) */
let contador_de_ui = 0

/**
 * Id de interfaz para un campo de una caja: es la `key` del v-for y lo que identifica al campo
 * seleccionado. No se guarda (el JSON no lo conoce): por eso puede ser un simple contador.
 *
 * @returns {string}
 */
export function nuevo_ui_id() {
	contador_de_ui++
	return 'ui_' + contador_de_ui
}

/**
 * Normaliza un booleano que puede venir de la API, de un pivot o de un checkbox (true/1/'1').
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function es_verdadero(valor) {
	return valor === true || valor === 1 || valor === '1'
}

/**
 * Lee lo que haya en `page_layout` y devuelve el diseño como objeto, o null si no hay diseño.
 * Acepta el objeto que manda la API o, por las dudas, un string JSON. Hay diseño cuando trae
 * `superior` o `pie` con algo distinto de null: el mismo criterio que
 * DisenoDePaginaPdf::tiene_diseno() (un `isset` de PHP).
 *
 * @param {*} valor
 * @returns {Object|null}
 */
export function leer_diseno(valor) {
	let diseno = valor

	if (typeof diseno == 'string') {
		if (!diseno || diseno === 'null') {
			return null
		}
		try {
			diseno = JSON.parse(diseno)
		} catch (e) {
			return null
		}
	}

	if (!diseno || typeof diseno != 'object' || Array.isArray(diseno)) {
		return null
	}

	let con_superior = typeof diseno.superior != 'undefined' && diseno.superior !== null
	let con_pie = typeof diseno.pie != 'undefined' && diseno.pie !== null

	return con_superior || con_pie ? diseno : null
}

/**
 * Si un perfil tiene un diseño armado con cajas (el que decide si el PDF sale con el dibujante
 * de cajas o con el de siempre).
 *
 * @param {*} page_layout
 * @returns {boolean}
 */
export function tiene_diseno(page_layout) {
	return leer_diseno(page_layout) !== null
}

/**
 * Un entero acotado a un rango, o el valor por defecto si no es un número.
 *
 * @param {*} valor
 * @param {number} minimo
 * @param {number} maximo
 * @param {number} por_defecto
 * @returns {number}
 */
export function acotar_entero(valor, minimo, maximo, por_defecto) {
	let numero = parseInt(valor, 10)
	if (isNaN(numero)) {
		numero = por_defecto
	}
	if (numero < minimo) {
		numero = minimo
	}
	if (numero > maximo) {
		numero = maximo
	}
	return numero
}

/**
 * Corta un texto a `maximo` caracteres contando por carácter y no por unidad UTF-16 (como el
 * mb_substr de la API: un emoji cuenta uno). Sin máximo, lo devuelve entero.
 *
 * @param {string} texto
 * @param {number|undefined} maximo
 * @returns {string}
 */
function cortar(texto, maximo) {
	if (!maximo || maximo < 0) {
		return texto
	}
	let caracteres = Array.from(texto)
	return caracteres.length > maximo ? caracteres.slice(0, maximo).join('') : texto
}

/**
 * Un texto de un renglón como lo guarda la API (DisenoDePaginaPdf::texto_acotado con una_linea):
 * sin saltos de línea, los espacios repetidos en uno, sin espacios a los costados y cortado.
 *
 * @param {*} texto
 * @param {number} [maximo]
 * @returns {string}
 */
export function texto_de_un_renglon(texto, maximo) {
	if (texto === null || typeof texto == 'undefined' || typeof texto == 'object') {
		return ''
	}
	return cortar(String(texto).replace(/\s+/g, ' ').trim(), maximo)
}

/**
 * El texto libre como lo guarda la API (texto_acotado sin una_linea): conserva los saltos de
 * línea, pasa CRLF a LF, saca los espacios del final y lo corta.
 *
 * @param {*} texto
 * @param {number} [maximo]
 * @returns {string}
 */
export function texto_libre_acotado(texto, maximo) {
	if (texto === null || typeof texto == 'undefined' || typeof texto == 'object') {
		return ''
	}
	/* rtrim() de PHP: espacio, tab, \n, \r, \0 y \x0B */
	let limpio = String(texto).replace(/\r\n/g, '\n').replace(/[ \t\n\r\0\x0B]+$/, '')
	return cortar(limpio, maximo)
}

/**
 * Si la respuesta del catálogo tiene la forma que el diseñador necesita. Una API vieja (404) o
 * una respuesta rota no tienen que llegar a armar un estado a medias: el diseñador muestra
 * "No se pudo abrir el diseñador" (plan §2.5).
 *
 * @param {*} catalogo respuesta de GET pdf-column-profiles/page-layout-catalog
 * @returns {boolean}
 */
export function catalogo_valido(catalogo) {
	if (!catalogo || typeof catalogo != 'object') {
		return false
	}
	let limites = catalogo.limites
	return Array.isArray(catalogo.categorias)
		&& Array.isArray(catalogo.campos)
		&& Array.isArray(catalogo.fijos)
		&& Array.isArray(catalogo.formatos_de_hoja)
		&& !!limites
		&& typeof limites == 'object'
		&& Array.isArray(limites.estilos_de_caja)
		&& limites.estilos_de_caja.length > 0
		&& Array.isArray(limites.alineaciones)
}

/**
 * Las definiciones del catálogo indexadas por key.
 *
 * @param {Array} campos `campos` del catálogo
 * @returns {Object} {key: definición}
 */
export function mapa_de_definiciones(campos) {
	let mapa = {}
	;(campos || []).forEach(function (campo) {
		if (campo && typeof campo.key == 'string') {
			mapa[campo.key] = campo
		}
	})
	return mapa
}

/**
 * La zona de cada bloque fijo según el catálogo ({afip_receptor: 'superior', afip_pie: 'pie'} en
 * una factura de ARCA; vacío si el perfil no es fiscal).
 *
 * @param {Array} fijos `fijos` del catálogo
 * @returns {Object}
 */
function zonas_de_los_fijos(fijos) {
	let zonas = {}
	;(fijos || []).forEach(function (fijo) {
		if (fijo && typeof fijo.key == 'string' && ZONAS.indexOf(fijo.zona) !== -1) {
			zonas[fijo.key] = fijo.zona
		}
	})
	return zonas
}

/**
 * Identidad estable de un ítem de una zona (key del v-for y lo que reconoce al seleccionado):
 * "caja:<id>", "salto_de_fila:<id>" o "fijo:<key>" (los fijos no tienen id: hay uno por key).
 *
 * @param {Object} item
 * @returns {string}
 */
export function identidad(item) {
	if (!item) {
		return ''
	}
	if (item.tipo === TIPO_FIJO) {
		return TIPO_FIJO + ':' + item.key
	}
	return item.tipo + ':' + item.id
}

/**
 * Todos los ids que usa el estado (cajas, saltos de fila y textos libres comparten un solo
 * espacio de nombres en la API: DisenoDePaginaPdf::id_unico).
 *
 * @param {Object} estado {superior, pie}
 * @returns {Object} {id: true}
 */
export function ids_en_uso(estado) {
	let ids = {}
	ZONAS.forEach(function (zona) {
		;((estado && estado[zona]) || []).forEach(function (item) {
			if (item.id) {
				ids[item.id] = true
			}
			if (item.tipo === TIPO_CAJA) {
				item.campos.forEach(function (campo) {
					if (campo.key === KEY_TEXTO_LIBRE && campo.id) {
						ids[campo.id] = true
					}
				})
			}
		})
	})
	return ids
}

/**
 * Un id nuevo con el patrón de la API (`caja_<base36>`, `salto_…`, `texto_…`) que no esté en uso.
 * Lo anota en `ids`, así dos llamadas seguidas en el mismo milisegundo no repiten.
 *
 * @param {string} prefijo 'caja' | 'salto' | 'texto'
 * @param {Object} ids {id: true} (se modifica)
 * @returns {string}
 */
export function nuevo_id(prefijo, ids) {
	let id = ''
	let intentos = 0

	do {
		intentos++
		id = prefijo + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36)
	} while ((ids[id] || !PATRON_ID.test(id)) && intentos < 50)

	/* Prácticamente imposible, pero si el azar no alcanzó, un contador seguro */
	if (ids[id] || !PATRON_ID.test(id)) {
		let numero = 1
		while (ids[prefijo + '_' + numero]) {
			numero++
		}
		id = prefijo + '_' + numero
	}

	ids[id] = true
	return id
}

/**
 * El id que vino si sirve (patrón y único), o uno nuevo con el prefijo.
 *
 * @param {*} id
 * @param {string} prefijo
 * @param {Object} ids {id: true} (se modifica)
 * @returns {string}
 */
function id_valido(id, prefijo, ids) {
	if (typeof id == 'string' && PATRON_ID.test(id) && !ids[id]) {
		ids[id] = true
		return id
	}
	return nuevo_id(prefijo, ids)
}

/**
 * Un campo de trabajo a partir de un campo del JSON, o null si no sirve (key inválida, o un
 * campo que ya está en el diseño: cada uno va una sola vez, salvo el texto libre).
 *
 * @param {*} campo
 * @param {Object} limites `limites` del catálogo
 * @param {Object} ids ids en uso (se modifica)
 * @param {Object} keys keys ya ubicadas (se modifica)
 * @returns {Object|null}
 */
function armar_campo(campo, limites, ids, keys) {
	if (!campo || typeof campo != 'object' || typeof campo.key != 'string' || !PATRON_KEY.test(campo.key)) {
		return null
	}

	let es_texto_libre = campo.key === KEY_TEXTO_LIBRE

	if (!es_texto_libre) {
		if (keys[campo.key]) {
			return null
		}
		keys[campo.key] = true
	}

	let tamano = null
	if (campo.tamano !== null && typeof campo.tamano != 'undefined' && !isNaN(parseInt(campo.tamano, 10))) {
		tamano = acotar_entero(campo.tamano, limites.tamano_min, limites.tamano_max, limites.tamano_min)
	}

	let armado = {
		ui_id: nuevo_ui_id(),
		key: campo.key,
		etiqueta: campo.etiqueta === null || typeof campo.etiqueta == 'undefined' ? null : String(campo.etiqueta),
		tamano: tamano,
		negrita: campo.negrita === null || typeof campo.negrita == 'undefined' ? null : !!campo.negrita,
		cursiva: campo.cursiva === null || typeof campo.cursiva == 'undefined' ? null : !!campo.cursiva,
		alineacion: limites.alineaciones.indexOf(campo.alineacion) !== -1 ? campo.alineacion : null,
	}

	if (es_texto_libre) {
		armado.id = id_valido(campo.id, 'texto', ids)
		armado.texto = typeof campo.texto == 'string' ? campo.texto : ''
	}

	return armado
}

/**
 * Una caja de trabajo a partir de una caja del JSON.
 *
 * @param {Object} item
 * @param {Object} limites
 * @param {Object} ids
 * @param {Object} keys
 * @returns {Object}
 */
function armar_caja(item, limites, ids, keys) {
	let campos = []

	;(Array.isArray(item.campos) ? item.campos : []).forEach(function (campo) {
		if (campos.length >= limites.max_campos_por_caja) {
			return
		}
		let armado = armar_campo(campo, limites, ids, keys)
		if (armado) {
			campos.push(armado)
		}
	})

	return {
		tipo: TIPO_CAJA,
		id: id_valido(item.id, 'caja', ids),
		cols: acotar_entero(item.cols, 1, 12, COLS_DE_CAJA_COMPLETA),
		titulo: typeof item.titulo == 'string' ? item.titulo : '',
		estilo: limites.estilos_de_caja.indexOf(item.estilo) !== -1 ? item.estilo : limites.estilos_de_caja[0],
		campos: campos,
	}
}

/**
 * Un bloque fijo de trabajo, o null si no es de esta zona según el catálogo (o ya estaba).
 *
 * @param {string} zona
 * @param {Object} item
 * @param {Object} zona_del_fijo ver zonas_de_los_fijos()
 * @param {Object} keys keys ya ubicadas (se modifica; los fijos van como "fijo:<key>")
 * @returns {Object|null}
 */
function armar_fijo(zona, item, zona_del_fijo, keys) {
	let key = item.key

	if (typeof key != 'string' || zona_del_fijo[key] !== zona || keys['fijo:' + key]) {
		return null
	}
	keys['fijo:' + key] = true

	let fijo = {
		tipo: TIPO_FIJO,
		key: key,
	}

	if (key === FIJO_AFIP_PIE) {
		fijo.importes = Object.prototype.hasOwnProperty.call(item, 'importes') ? !!item.importes : true
	}

	return fijo
}

/**
 * Arma el estado de trabajo a partir de un diseño (el guardado en el perfil o el `diseno_derivado`
 * del catálogo). Es defensivo como DisenoDePaginaPdf::normalizar(): lo que no tiene forma se
 * descarta, los ids inválidos o repetidos se rehacen y cada campo queda una sola vez. Las keys
 * que el catálogo no conoce NO se descartan (un campo que se retiró, o uno de una versión más
 * nueva): se muestran como "campo que ya no existe" y se guardan tal cual, igual que la API.
 *
 * Al final se asegura que estén los bloques fijos que el catálogo pide (factura de ARCA).
 *
 * @param {*} diseno objeto o string JSON (o null: diseño vacío)
 * @param {Object} catalogo respuesta del catálogo (usa `limites` y `fijos`)
 * @returns {{superior: Array, pie: Array}}
 */
export function armar_estado(diseno, catalogo) {
	let leido = leer_diseno(diseno) || {}
	let limites = catalogo.limites
	let zona_del_fijo = zonas_de_los_fijos(catalogo.fijos)
	let ids = {}
	let keys = {}
	let estado = {
		superior: [],
		pie: [],
	}

	ZONAS.forEach(function (zona) {
		;(Array.isArray(leido[zona]) ? leido[zona] : []).forEach(function (item) {
			if (estado[zona].length >= limites.max_items_por_zona) {
				return
			}
			if (!item || typeof item != 'object' || typeof item.tipo != 'string') {
				return
			}
			if (item.tipo === TIPO_CAJA) {
				estado[zona].push(armar_caja(item, limites, ids, keys))
				return
			}
			if (item.tipo === TIPO_SALTO_DE_FILA) {
				estado[zona].push({
					tipo: TIPO_SALTO_DE_FILA,
					id: id_valido(item.id, 'salto', ids),
				})
				return
			}
			if (item.tipo === TIPO_FIJO) {
				let fijo = armar_fijo(zona, item, zona_del_fijo, keys)
				if (fijo) {
					estado[zona].push(fijo)
				}
			}
		})
	})

	return asegurar_fijos(estado, catalogo.fijos)
}

/**
 * Garantiza los bloques fijos del catálogo, como DisenoDePaginaPdf::asegurar_fijos(): saca los
 * fijos que el catálogo no pide (o que están en otra zona) y agrega los que faltan, el de la
 * zona superior al principio y el del pie al final. Devuelve listas nuevas (los ítems son los
 * mismos objetos).
 *
 * @param {Object} estado {superior, pie}
 * @param {Array} fijos `fijos` del catálogo
 * @returns {{superior: Array, pie: Array}}
 */
export function asegurar_fijos(estado, fijos) {
	let zona_del_fijo = zonas_de_los_fijos(fijos)
	let resultado = {}

	ZONAS.forEach(function (zona) {
		resultado[zona] = ((estado && estado[zona]) || []).filter(function (item) {
			return !(item.tipo === TIPO_FIJO && zona_del_fijo[item.key] !== zona)
		})
	})

	;(fijos || []).forEach(function (fijo) {
		let zona = zona_del_fijo[fijo.key]
		if (!zona) {
			return
		}

		let ya_esta = resultado[zona].some(function (item) {
			return item.tipo === TIPO_FIJO && item.key === fijo.key
		})
		if (ya_esta) {
			return
		}

		let nuevo = {
			tipo: TIPO_FIJO,
			key: fijo.key,
		}
		if (fijo.key === FIJO_AFIP_PIE) {
			nuevo.importes = true
		}

		if (zona === 'superior') {
			resultado[zona].unshift(nuevo)
		} else {
			resultado[zona].push(nuevo)
		}
	})

	return resultado
}

/**
 * Un campo listo para guardar: sin `ui_id` y con los textos como los deja la API. El orden de
 * las claves es el de DisenoDePaginaPdf::normalizar_campo(), así el JSON de un diseño que vino
 * de la API y no se tocó es idéntico al que se manda.
 *
 * @param {Object} campo
 * @param {Object} limites
 * @returns {Object}
 */
function serializar_campo(campo, limites) {
	let serializado = {
		key: campo.key,
		etiqueta: campo.etiqueta === null || typeof campo.etiqueta == 'undefined' ? null : texto_de_un_renglon(campo.etiqueta, limites.max_etiqueta),
		tamano: campo.tamano === null || typeof campo.tamano == 'undefined' ? null : acotar_entero(campo.tamano, limites.tamano_min, limites.tamano_max, limites.tamano_min),
		negrita: campo.negrita === null || typeof campo.negrita == 'undefined' ? null : !!campo.negrita,
		cursiva: campo.cursiva === null || typeof campo.cursiva == 'undefined' ? null : !!campo.cursiva,
		alineacion: campo.alineacion === null || typeof campo.alineacion == 'undefined' ? null : campo.alineacion,
	}

	if (campo.key === KEY_TEXTO_LIBRE) {
		serializado.id = campo.id
		serializado.texto = texto_libre_acotado(campo.texto, limites.max_texto_libre)
	}

	return serializado
}

/**
 * El diseño listo para mandar a la API como `page_layout`: la forma de DisenoDePaginaPdf, sin
 * nada de interfaz. Lo que la API normalizaría (textos con espacios de más, títulos largos) ya va
 * normalizado, así lo que se guarda es lo que el diseñador mostró.
 *
 * @param {Object} estado {superior, pie}
 * @param {Object} limites `limites` del catálogo
 * @returns {{version: number, superior: Array, pie: Array}}
 */
export function serializar(estado, limites) {
	let diseno = {
		version: VERSION_DEL_DISENO,
		superior: [],
		pie: [],
	}

	ZONAS.forEach(function (zona) {
		;((estado && estado[zona]) || []).forEach(function (item) {
			if (item.tipo === TIPO_CAJA) {
				let campos = []
				item.campos.forEach(function (campo) {
					campos.push(serializar_campo(campo, limites))
				})
				diseno[zona].push({
					tipo: TIPO_CAJA,
					id: item.id,
					cols: acotar_entero(item.cols, 1, 12, COLS_DE_CAJA_COMPLETA),
					titulo: texto_de_un_renglon(item.titulo, limites.max_titulo),
					estilo: item.estilo,
					campos: campos,
				})
				return
			}

			if (item.tipo === TIPO_SALTO_DE_FILA) {
				diseno[zona].push({
					tipo: TIPO_SALTO_DE_FILA,
					id: item.id,
				})
				return
			}

			if (item.tipo === TIPO_FIJO) {
				let fijo = {
					tipo: TIPO_FIJO,
					key: item.key,
				}
				if (item.key === FIJO_AFIP_PIE) {
					fijo.importes = !!item.importes
				}
				diseno[zona].push(fijo)
			}
		})
	})

	return diseno
}

/**
 * Huella del lienzo y la hoja: si cambia respecto de la base, el diseño "se tocó" (es lo que
 * decide si al guardar viaja `page_layout`).
 *
 * @param {Object} estado {superior, pie}
 * @param {Object} hoja {ancho, alto, margen}
 * @param {Object} limites
 * @returns {string}
 */
export function huella_del_diseno(estado, hoja, limites) {
	return JSON.stringify({
		lienzo: serializar(estado, limites),
		hoja: {
			ancho: Number(hoja.ancho),
			alto: Number(hoja.alto),
			margen: Number(hoja.margen),
		},
	})
}

/**
 * Las keys de los campos que ya están en el diseño (el texto libre no cuenta: se repite).
 *
 * @param {Object} estado {superior, pie}
 * @returns {Object} {key: true}
 */
export function keys_en_uso(estado) {
	let usadas = {}
	ZONAS.forEach(function (zona) {
		;((estado && estado[zona]) || []).forEach(function (item) {
			if (item.tipo !== TIPO_CAJA) {
				return
			}
			item.campos.forEach(function (campo) {
				if (campo.key !== KEY_TEXTO_LIBRE) {
					usadas[campo.key] = true
				}
			})
		})
	})
	return usadas
}

/**
 * Dónde está un ítem o un campo dentro del estado.
 *
 * @param {Object} estado {superior, pie}
 * @param {Object} objeto un ítem de una zona o un campo de una caja
 * @returns {{zona: string, caja: Object|null, indice: number}|null}
 */
export function ubicar(estado, objeto) {
	let ubicacion = null

	ZONAS.forEach(function (zona) {
		if (ubicacion) {
			return
		}
		;((estado && estado[zona]) || []).forEach(function (item, indice) {
			if (ubicacion) {
				return
			}
			if (item === objeto) {
				ubicacion = {
					zona: zona,
					caja: null,
					indice: indice,
				}
				return
			}
			if (item.tipo === TIPO_CAJA) {
				let en_la_caja = item.campos.indexOf(objeto)
				if (en_la_caja !== -1) {
					ubicacion = {
						zona: zona,
						caja: item,
						indice: en_la_caja,
					}
				}
			}
		})
	})

	return ubicacion
}

/**
 * Una caja nueva, vacía y sin título.
 *
 * @param {Object} ids ids en uso (se modifica)
 * @param {number} cols
 * @param {string} estilo
 * @returns {Object}
 */
export function caja_nueva(ids, cols, estilo) {
	return {
		tipo: TIPO_CAJA,
		id: nuevo_id('caja', ids),
		cols: cols,
		titulo: '',
		estilo: estilo,
		campos: [],
	}
}

/**
 * Un salto de fila nuevo.
 *
 * @param {Object} ids ids en uso (se modifica)
 * @returns {Object}
 */
export function salto_nuevo(ids) {
	return {
		tipo: TIPO_SALTO_DE_FILA,
		id: nuevo_id('salto', ids),
	}
}

/**
 * Un campo nuevo a partir de su definición del catálogo, con el estilo en null (el del catálogo).
 * El texto libre nace con su id propio y sin texto.
 *
 * @param {Object} definicion campo del catálogo
 * @param {Object} ids ids en uso (se modifica)
 * @returns {Object}
 */
export function campo_nuevo(definicion, ids) {
	let campo = {
		ui_id: nuevo_ui_id(),
		key: definicion.key,
		etiqueta: null,
		tamano: null,
		negrita: null,
		cursiva: null,
		alineacion: null,
	}

	if (definicion.key === KEY_TEXTO_LIBRE) {
		campo.id = nuevo_id('texto', ids)
		campo.texto = ''
	}

	return campo
}

/**
 * El estilo con que se imprime un campo: el suyo donde no es null, si no el del catálogo.
 *
 * @param {Object} campo
 * @param {Object|null} definicion campo del catálogo (null si la key ya no existe)
 * @returns {{tamano: number|null, negrita: boolean, cursiva: boolean, alineacion: string|null}}
 */
export function estilo_efectivo(campo, definicion) {
	let base = definicion && definicion.estilo ? definicion.estilo : {}

	return {
		tamano: campo.tamano !== null && typeof campo.tamano != 'undefined' ? campo.tamano : (typeof base.tamano != 'undefined' ? base.tamano : null),
		negrita: campo.negrita !== null && typeof campo.negrita != 'undefined' ? !!campo.negrita : !!base.negrita,
		cursiva: campo.cursiva !== null && typeof campo.cursiva != 'undefined' ? !!campo.cursiva : !!base.cursiva,
		alineacion: campo.alineacion ? campo.alineacion : (base.alineacion || null),
	}
}

/**
 * Si el campo tiene algún estilo propio (algo distinto de null): habilita "Volver al estilo del campo".
 *
 * @param {Object} campo
 * @returns {boolean}
 */
export function tiene_estilo_propio(campo) {
	return ['tamano', 'negrita', 'cursiva', 'alineacion'].some(function (clave) {
		return campo[clave] !== null && typeof campo[clave] != 'undefined'
	})
}

/**
 * El rótulo que se imprime delante del valor: null = el del catálogo, '' = sin rótulo, otro
 * texto = ese.
 *
 * @param {Object} campo
 * @param {Object|null} definicion
 * @returns {string}
 */
export function etiqueta_efectiva(campo, definicion) {
	if (campo.etiqueta !== null && typeof campo.etiqueta != 'undefined') {
		return texto_de_un_renglon(campo.etiqueta)
	}
	return definicion && typeof definicion.etiqueta == 'string' ? definicion.etiqueta : ''
}

/**
 * El formato de hoja que coincide con un ancho y un alto, o null (hoja personalizada).
 *
 * @param {Array} formatos `formatos_de_hoja` del catálogo
 * @param {number} ancho mm
 * @param {number} alto mm
 * @returns {Object|null}
 */
export function formato_de_hoja(formatos, ancho, alto) {
	let encontrado = null
	;(formatos || []).forEach(function (formato) {
		if (!encontrado && Number(formato.ancho_mm) === Number(ancho) && Number(formato.alto_mm) === Number(alto)) {
			encontrado = formato
		}
	})
	return encontrado
}

/**
 * Si una hoja es la A5 del catálogo (por sus medidas: la hoja se guarda como ancho y alto).
 *
 * @param {Array} formatos `formatos_de_hoja` del catálogo
 * @param {Object} hoja {ancho, alto}
 * @returns {boolean}
 */
export function es_hoja_a5(formatos, hoja) {
	let formato = hoja ? formato_de_hoja(formatos, hoja.ancho, hoja.alto) : null
	return !!(formato && formato.key === KEY_HOJA_A5)
}

/**
 * La hoja con que abre el diseñador.
 *
 * - Perfil con diseño: la que tiene guardada (paper_width_mm, paper_height_mm o 297, margin_mm
 *   acotado al rango del catálogo), que es la que usa su PDF con cajas.
 * - Perfil de siempre: HOJA_DE_SIEMPRE, porque es la que su PDF imprime de verdad (ver la
 *   constante): mostrar los 297/277 que algunos tienen guardados dibujaría una hoja que no existe.
 *
 * @param {Object} perfil el pdf_column_profile del formulario
 * @param {boolean} con_diseno si el perfil tiene page_layout
 * @param {Object} limites `limites` del catálogo (margen_min / margen_max)
 * @returns {{ancho: number, alto: number, margen: number}}
 */
export function hoja_del_perfil(perfil, con_diseno, limites) {
	if (!con_diseno || !perfil) {
		return {
			ancho: HOJA_DE_SIEMPRE.ancho,
			alto: HOJA_DE_SIEMPRE.alto,
			margen: HOJA_DE_SIEMPRE.margen,
		}
	}

	let ancho = parseInt(perfil.paper_width_mm, 10)
	let alto = parseInt(perfil.paper_height_mm, 10)
	let margen_vacio = perfil.margin_mm === null || typeof perfil.margin_mm == 'undefined' || perfil.margin_mm === ''

	return {
		ancho: ancho > 0 ? ancho : ANCHO_DE_HOJA_POR_DEFECTO,
		alto: alto > 0 ? alto : ALTO_DE_HOJA_POR_DEFECTO,
		margen: margen_vacio ? MARGEN_POR_DEFECTO : acotar_entero(perfil.margin_mm, limites.margen_min, limites.margen_max, MARGEN_POR_DEFECTO),
	}
}

/**
 * Ancho útil de la hoja para la tabla y las cajas (mm): el ancho menos un margen de cada lado
 * (el diseñador guarda printable_width_mm igual al ancho de la hoja).
 *
 * @param {Object} hoja {ancho, margen}
 * @returns {number}
 */
export function ancho_util(hoja) {
	let util = Number(hoja.ancho) - (2 * Number(hoja.margen))
	return util > 0 ? util : 0
}

/**
 * Si el pivot de una columna cuenta como visible para sumar anchos: el mismo criterio que la API
 * (PdfColumnProfileController::is_request_pivot_visible_for_width_sum: sin `visible`, visible).
 *
 * @param {Object|null} pivot
 * @returns {boolean}
 */
function pivot_visible(pivot) {
	if (!pivot || !Object.prototype.hasOwnProperty.call(pivot, 'visible')) {
		return true
	}
	let visible = pivot.visible
	if (visible === true || visible === 1 || visible === '1') {
		return true
	}
	if (visible === false || visible === 0 || visible === '0' || visible === '' || visible === null) {
		return false
	}
	return !!visible
}

/**
 * Las columnas visibles de la tabla del perfil, en su orden, con su rótulo y su ancho (mm).
 *
 * @param {Array} opciones model.pdf_column_options (cada una con su `pivot`)
 * @returns {Array<{id: *, rotulo: string, ancho: number}>}
 */
export function columnas_visibles(opciones) {
	let columnas = []

	;(Array.isArray(opciones) ? opciones : []).forEach(function (opcion, indice) {
		if (!opcion) {
			return
		}
		let pivot = opcion.pivot || null
		if (!pivot_visible(pivot)) {
			return
		}
		let orden = pivot ? parseInt(pivot.order, 10) : NaN
		columnas.push({
			id: opcion.id,
			rotulo: String(opcion.label || opcion.name || ''),
			ancho: pivot ? (parseInt(pivot.width, 10) || 0) : 0,
			orden: isNaN(orden) ? indice : orden,
			indice: indice,
		})
	})

	columnas.sort(function (a, b) {
		return a.orden - b.orden || a.indice - b.indice
	})

	return columnas
}

/**
 * Suma de los anchos (mm) de las columnas visibles de la tabla.
 *
 * @param {Array} opciones model.pdf_column_options
 * @returns {number}
 */
export function suma_de_columnas_visibles(opciones) {
	let suma = 0
	columnas_visibles(opciones).forEach(function (columna) {
		suma += columna.ancho
	})
	return suma
}
