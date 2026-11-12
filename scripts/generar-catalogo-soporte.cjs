// Genera src/tours/catalogo-soporte.json: las rutas y anclas que un recorrido de Robotito puede usar.
//
// Sale del código, no se escribe a mano: los grupos y solapas del ABM se leen de src/mixins/abm.js y
// de src/models/*.js (el plural del modelo es el nombre visible y el segmento de la URL), y las
// pantallas y controles de src/tours/soporte-dinamico.js.
//
//   node scripts/generar-catalogo-soporte.cjs                      -> reescribe el JSON del SPA
//   node scripts/generar-catalogo-soporte.cjs --api ../empresa-api -> además deja la copia de la API
//
// 🔴 empresa-api tiene una COPIA en resources/soporte/catalogo-soporte.json: con ella arma el catálogo
// que el Admin le pasa al planificador. Si agregás o renombrás una solapa del ABM, corré esto con
// --api y commiteá los dos repos. tests/robotito-tour-guiado.test.cjs falla si el JSON quedó viejo.
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('../tests/helpers/cargar_modulo_esm.cjs')

const raiz = path.resolve(__dirname, '..')
const DESTINO = path.join(raiz, 'src', 'tours', 'catalogo-soporte.json')
const COPIA_API = path.join('resources', 'soporte', 'catalogo-soporte.json')

function capitalizar(texto) {
	return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Se lee con una expresión y no ejecutando el modelo: varios modelos importan cosas que un script no resuelve.
function plural_de(modelo) {
	const fuente = fs.readFileSync(path.join(raiz, 'src', 'models', modelo + '.js'), 'utf8')
	const coincidencia = fuente.match(/plural_model_name_spanish\s*:\s*(['"])(.*?)\1/)
	if (!coincidencia) {
		throw new Error('El modelo ' + modelo + ' no declara plural_model_name_spanish')
	}
	return coincidencia[2]
}

function solapas_del_abm() {
	const { clave_grupo_abm, clave_solapa_abm, segmento_abm } = cargar('tours/claves-abm.js')
	// Sin dueño: quedan afuera las solapas que dependen de un dato del comercio (el PDF a medida).
	const grupos = cargar('mixins/abm.js').default.computed.abm_views.call({ owner: null })
	const entradas = []

	grupos.forEach(function (grupo) {
		// Un grupo que depende de la configuración del dueño no se ofrece: la API no replica esa regla.
		if (grupo.if_config_del_dueno) {
			return
		}
		const extenciones_del_grupo = grupo.if_has_extencion ? [grupo.if_has_extencion] : []
		const plurales = grupo.models.map(plural_de)
		const texto_grupo = capitalizar(grupo.view)
		const view = segmento_abm(grupo.view)

		entradas.push({
			clave: clave_grupo_abm(grupo.view),
			tipo: 'grupo',
			texto: texto_grupo,
			view: view,
			sub_view: segmento_abm(plurales[0]),
			extenciones: extenciones_del_grupo,
		})

		grupo.models.forEach(function (modelo, i) {
			const propia = grupo.models_if_has_extencion && grupo.models_if_has_extencion[modelo]
			entradas.push({
				clave: clave_solapa_abm(grupo.view, plurales[i]),
				tipo: 'solapa',
				grupo: texto_grupo,
				texto: (grupo.nombres && grupo.nombres[modelo]) || plurales[i],
				view: view,
				sub_view: segmento_abm(plurales[i]),
				// La solapa con la que abre el grupo: para mostrar cualquier otra hay que estar en esta.
				sub_view_inicial: segmento_abm(plurales[0]),
				extenciones: extenciones_del_grupo.concat(propia ? [propia] : []),
			})
		})
	})

	return entradas
}

function generar() {
	const abm = solapas_del_abm()
	const local = cargar('tours/soporte-dinamico.js', { './catalogo-soporte.json': { abm: abm } }).catalogo_local()

	return { version: 1, abm: abm, pantallas: local.pantallas, controles: local.controles }
}

function serializar(catalogo) {
	return JSON.stringify(catalogo, null, '\t') + '\n'
}

module.exports = { generar, serializar, DESTINO }

if (require.main === module) {
	const texto = serializar(generar())
	fs.writeFileSync(DESTINO, texto)
	console.log('Escrito ' + path.relative(raiz, DESTINO))

	const i = process.argv.indexOf('--api')
	if (i !== -1 && process.argv[i + 1]) {
		const copia = path.resolve(process.argv[i + 1], COPIA_API)
		fs.mkdirSync(path.dirname(copia), { recursive: true })
		fs.writeFileSync(copia, texto)
		console.log('Escrito ' + copia)
	}
}
