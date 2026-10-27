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
const compiler = require('vue-template-compiler')

const raiz = path.resolve(__dirname, '..', '..')
const cache = new Map()

/**
 * @param {string} ruta Ruta relativa a src/ con la extensión ('utils/medidas_de_catalogo.js').
 * @param {object} [mocks] Módulos de reemplazo por nombre de import ({'axios': falso}). Con mocks el
 *        módulo se carga SIEMPRE de nuevo (sin cache) y solo ese módulo los ve; los que importa
 *        siguen siendo los reales. Sirve para probar un store sin red.
 * @returns {object} Los exports del módulo.
 */
function cargar(ruta, mocks) {
	if (!mocks && cache.has(ruta)) {
		return cache.get(ruta)
	}
	const archivo = path.join(raiz, 'src', ruta)
	let fuente = fs.readFileSync(archivo, 'utf8')
	let plantilla = null
	if (ruta.endsWith('.vue')) {
		// Un componente de un solo archivo: se toma el <script> y se compila el <template>.
		const sfc = compiler.parseComponent(fuente)
		fuente = sfc.script ? sfc.script.content : 'export default {}'
		plantilla = sfc.template ? sfc.template.content : null
	}
	const codigo = babel.transformSync(fuente, {
		babelrc: false,
		configFile: false,
		plugins: ['@babel/plugin-transform-modules-commonjs'],
	}).code
	const exports = {}
	if (!mocks) {
		cache.set(ruta, exports)
	}
	// Se ejecuta en el contexto principal (no en uno nuevo): los objetos y arreglos que crea el módulo
	// tienen que compartir prototipos con los del test, o deepStrictEqual los da por distintos.
	const envoltura = vm.runInThisContext('(function (exports, require) {' + codigo + '\n})', { filename: archivo })
	envoltura(exports, nombre => {
		if (mocks && Object.prototype.hasOwnProperty.call(mocks, nombre)) {
			return mocks[nombre]
		}
		if (nombre.startsWith('@/')) {
			return cargar(agregar_extension(nombre.slice(2)))
		}
		if (nombre.startsWith('./') || nombre.startsWith('../')) {
			return cargar(agregar_extension(path.posix.normalize(path.posix.join(path.posix.dirname(ruta), nombre))))
		}
		throw new Error('El test no resuelve el import "' + nombre + '" (' + ruta + ')')
	})
	if (plantilla !== null && exports.default) {
		// Mismo criterio de espacios que vue-cli (whitespace: 'condense').
		const compilado = compiler.compile(plantilla, { whitespace: 'condense' })
		if (compilado.errors.length) {
			throw new Error('El template de ' + ruta + ' no compila: ' + compilado.errors.join(' | '))
		}
		exports.default.render = new Function(compilado.render)
		exports.default.staticRenderFns = compilado.staticRenderFns.map(codigo_estatico => new Function(codigo_estatico))
	}
	return exports
}

/**
 * Agrega la extensión que webpack resolvería: .js, o .vue si no hay un .js con ese nombre.
 *
 * @param {string} ruta Ruta relativa a src/, con o sin extensión.
 * @returns {string}
 */
function agregar_extension(ruta) {
	if (/\.(js|vue)$/.test(ruta)) {
		return ruta
	}
	return fs.existsSync(path.join(raiz, 'src', ruta + '.js')) ? ruta + '.js' : ruta + '.vue'
}

module.exports = { cargar }
