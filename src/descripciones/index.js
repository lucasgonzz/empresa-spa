/**
 * Diccionario de descripciones de controles, indexado por `data-testid`.
 *
 * QUE ES
 * Cada boton, input, toggle o celda del sistema puede tener aca una descripcion de
 * que hace y --sobre todo-- en que repercute. `DescripcionDeControl.vue` la muestra
 * en un popover cuando el mouse se queda 2 segundos encima del control.
 *
 * POR QUE INDEXADO POR data-testid Y NO ESCRITO EN CADA COMPONENTE
 * Tres razones, en orden de importancia:
 *   1. Es LEGIBLE POR UNA MAQUINA. Los agentes del admin leen este archivo como datos;
 *      no podrian leer un texto suelto repartido en mil componentes .vue.
 *   2. No hay que tocar el componente dueño del boton para documentarlo. Agregar una
 *      descripcion es agregar una entrada acá, y nada mas.
 *   3. El testid ya existe: se lo pone el trabajo de e2e cuando necesita accionar el
 *      control. O sea que documentar y automatizar comparten la misma llave, y el
 *      diccionario crece al ritmo de la exploracion en vez de por un censo aparte.
 *
 * FORMA DE UNA ENTRADA
 *   'btn-guardar-venta': {
 *       titulo:    'Guardar la venta',            // encabezado del popover
 *       que_hace:  'Una frase. Que pasa al apretarlo.',
 *       repercute: ['Cada cosa que se mueve en OTRO lado'],   // opcional
 *       requiere:  'La precondicion que la pantalla no nombra', // opcional
 *       nota_interna: 'No se muestra. Para los agentes del admin.', // opcional
 *   }
 *
 * 🔴 `repercute` es el campo que justifica todo esto. `que_hace` se adivina mirando el
 * boton; en que repercute, no --y es justo lo que la exploracion mide por diferencia
 * (stock, caja, cuenta corriente, IVA). Una entrada sin `repercute` casi no agrega nada
 * sobre el propio texto del boton.
 *
 * 🔴 `nota_interna` NUNCA se muestra al operador. Es para lo que sabemos y no le sirve
 * a quien esta vendiendo: un defecto abierto, una deuda tecnica, el motivo de una
 * decision. Lo lee quien lea este archivo, no quien usa el sistema.
 *
 * CLAVES CON COMODIN
 * Muchos testids del sistema son dinamicos (`btn-guardar-article`, `btn-guardar-sale`,
 * `celda-article-name-42`). Una clave que termina en `*` matchea por prefijo, y entre
 * varias que matcheen gana LA MAS LARGA -- asi una entrada puntual siempre le gana a
 * la generica que la contiene.
 */

import vender from './vender'
import listado from './listado'
import importacion from './importacion'

/* Un objeto por modulo. El orden no importa: las claves no se pisan entre modulos. */
const modulos = {
	vender: vender,
	listado: listado,
	importacion: importacion,
}

/**
 * Junta todos los modulos en un solo mapa plano { testid: descripcion }.
 * Se arma una sola vez, al importar.
 */
function armar_indice() {
	let indice = {}
	Object.keys(modulos).forEach(nombre_modulo => {
		let entradas = modulos[nombre_modulo]
		Object.keys(entradas).forEach(clave => {
			/* Se guarda de que modulo salio: los agentes del admin lo usan para agrupar. */
			indice[clave] = Object.assign({ modulo: nombre_modulo }, entradas[clave])
		})
	})
	return indice
}

const indice = armar_indice()

/* Las claves con comodin, ordenadas de mas larga a mas corta (la mas especifica gana). */
const claves_con_comodin = Object.keys(indice)
	.filter(clave => clave.charAt(clave.length - 1) == '*')
	.sort((a, b) => b.length - a.length)

/**
 * Busca la descripcion de un control.
 *
 * @param {String} testid Valor del atributo data-testid del control.
 * @returns {Object|null} La descripcion, o null si ese control todavia no esta documentado.
 */
export function descripcion_de(testid) {
	if (!testid) {
		return null
	}
	/* Exacta primero: siempre le gana a cualquier comodin. */
	if (indice[testid]) {
		return indice[testid]
	}
	for (let i = 0; i < claves_con_comodin.length; i++) {
		let prefijo = claves_con_comodin[i].slice(0, -1)
		if (testid.indexOf(prefijo) === 0) {
			return indice[claves_con_comodin[i]]
		}
	}
	return null
}

/**
 * Devuelve el indice entero. Lo usa la herramienta que reporta cobertura
 * (cuantos controles con testid tienen descripcion y cuantos no).
 *
 * @returns {Object} Mapa { testid: descripcion }.
 */
export function todas_las_descripciones() {
	return indice
}

export default indice
