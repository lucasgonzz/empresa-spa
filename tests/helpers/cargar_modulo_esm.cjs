// Carga un módulo ES (.js de src/) en un test de node --test, sin webpack ni servidor.
//
// Transforma el archivo con babel (módulos -> commonjs) y lo ejecuta en un contexto aislado. Resuelve
// los imports `@/...` contra src/ y los relativos contra la carpeta del archivo; cualquier otro import
// (axios, vue...) falla a propósito: estos tests son de funciones puras y no deben depender de nada de
// afuera. Es el mismo mecanismo de tests/total-antes-de-guardar.test.cjs, generalizado.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const babel = require('@babel/core')

const raiz = path.resolve(__dirname, '..', '..')
const cache = new Map()

/**
 * @param {string} ruta Ruta relativa a src/ con la extensión ('utils/medidas_de_catalogo.js').
 * @returns {object} Los exports del módulo.
 */
function cargar(ruta) {
	if (cache.has(ruta)) {
		return cache.get(ruta)
	}
	const archivo = path.join(raiz, 'src', ruta)
	const codigo = babel.transformSync(fs.readFileSync(archivo, 'utf8'), {
		babelrc: false,
		configFile: false,
		plugins: ['@babel/plugin-transform-modules-commonjs'],
	}).code
	const exports = {}
	cache.set(ruta, exports)
	// Se ejecuta en el contexto principal (no en uno nuevo): los objetos y arreglos que crea el módulo
	// tienen que compartir prototipos con los del test, o deepStrictEqual los da por distintos.
	const envoltura = vm.runInThisContext('(function (exports, require) {' + codigo + '\n})', { filename: archivo })
	envoltura(exports, nombre => {
		if (nombre.startsWith('@/')) {
			return cargar(agregar_extension(nombre.slice(2)))
		}
		if (nombre.startsWith('./') || nombre.startsWith('../')) {
			return cargar(agregar_extension(path.posix.normalize(path.posix.join(path.posix.dirname(ruta), nombre))))
		}
		throw new Error('El test no resuelve el import "' + nombre + '" (' + ruta + ')')
	})
	return exports
}

function agregar_extension(ruta) {
	return /\.(js|vue)$/.test(ruta) ? ruta : ruta + '.js'
}

module.exports = { cargar }
