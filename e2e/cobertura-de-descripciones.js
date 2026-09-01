// Cuantos controles del sistema tienen descripcion, y cuales no.
//
// De donde sale. El 1/9/2026 Lucas pidio que la exploracion, ademas de dejar tests y manual,
// vaya dejando en cada boton y cada input una descripcion de que hace y en que repercute, para
// que aparezca en un popover al dejarle el mouse encima. Esas descripciones viven en
// `src/descripciones/`, indexadas por `data-testid`.
//
// Para que sirve esto. Un diccionario asi se llena de a poco y por varias manos: sin una medicion,
// nadie sabe si va por el 5% o por el 80%, y la exploracion siguiente no sabe por donde seguir.
// Esto se corre y devuelve una lista, no un consejo:
//
//     node e2e/cobertura-de-descripciones.js
//
// Que hace: junta los data-testid que declaran las plantillas de src/, los cruza contra el
// diccionario, y lista los que todavia no tienen descripcion. Tambien avisa al reves --entradas
// del diccionario cuyo testid ya no existe en el codigo--, que es como se detecta una descripcion
// que quedo huerfana despues de renombrar un control.
//
// Limitacion conocida, la misma que `chequear-prefijos-de-testid.js`: solo ve testids ESCRITOS
// COMO LITERAL en la plantilla. Los que se arman concatenando (`'btn-guardar-'+model_name`) no se
// pueden enumerar sin ejecutar la aplicacion, asi que no entran en el total. Para esos el
// diccionario tiene claves con comodin (`'pago-monto-*'`), que este script reconoce pero no puede
// contar contra nada.

const fs = require('fs')
const path = require('path')

const RAIZ_SRC = path.join(__dirname, '..', 'src')
const RAIZ_DICCIONARIO = path.join(__dirname, '..', 'src', 'descripciones')

/**
 * Recorre un directorio y devuelve todos los archivos que terminan en alguna de las extensiones.
 *
 * @param {String} dir Directorio a recorrer.
 * @param {Array} extensiones Lista de extensiones, con el punto ('.vue').
 * @returns {Array} Rutas absolutas.
 */
function archivos_de(dir, extensiones) {
	let encontrados = []
	fs.readdirSync(dir, { withFileTypes: true }).forEach(entrada => {
		let completo = path.join(dir, entrada.name)
		if (entrada.isDirectory()) {
			encontrados = encontrados.concat(archivos_de(completo, extensiones))
			return
		}
		if (extensiones.some(ext => entrada.name.endsWith(ext))) {
			encontrados.push(completo)
		}
	})
	return encontrados
}

/* ----------------------------------------------------- testids literales declarados en src/ */

const testids_declarados = new Map()

archivos_de(RAIZ_SRC, ['.vue']).forEach(archivo => {
	let contenido = fs.readFileSync(archivo, 'utf8')
	/*
		Dos formas cuentan como literal, y las dos tienen que entrar o el total miente:

		  data-testid="algo"        -- el atributo plano
		  :data-testid="'algo'"     -- enlazado, pero con un literal adentro

		La segunda es como estan escritos los renglones de Posicion Fiscal. Dejarla afuera hacia
		que 12 controles no se contaran ni como cubiertos ni como faltantes: simplemente no
		existian para la medicion, y el porcentaje salia mas bajo de lo real.

		Lo que SI queda afuera es la expresion de verdad (`:data-testid="inputId(prop)"`,
		`'btn-guardar-'+model_name`): no se puede enumerar sin ejecutar la aplicacion, y para esos
		el diccionario tiene claves con comodin.
	*/
	let regex = /(?<![\w-]):?data-testid="'?([^"'{}+]*)'?"/g
	let match
	while ((match = regex.exec(contenido)) !== null) {
		let testid = match[1].trim()
		/* Los dinamicos quedan afuera: no se pueden enumerar sin ejecutar la aplicacion. */
		if (!testid || /[+()?\s]/.test(testid)) {
			continue
		}
		if (!testids_declarados.has(testid)) {
			testids_declarados.set(testid, path.relative(RAIZ_SRC, archivo))
		}
	}
})

/* --------------------------------------------------------- claves que declara el diccionario */

const claves_documentadas = new Set()
const claves_con_comodin = []

archivos_de(RAIZ_DICCIONARIO, ['.js'])
	.filter(archivo => path.basename(archivo) != 'index.js')
	.forEach(archivo => {
		let contenido = fs.readFileSync(archivo, 'utf8')
		/* Las claves son las de primer nivel del objeto exportado: `'algo': {`. */
		let regex = /^\t'([^']+)':\s*\{/gm
		let match
		while ((match = regex.exec(contenido)) !== null) {
			let clave = match[1]
			claves_documentadas.add(clave)
			if (clave.charAt(clave.length - 1) == '*') {
				claves_con_comodin.push(clave.slice(0, -1))
			}
		}
	})

/**
 * Indica si un testid tiene descripcion, sea por clave exacta o por comodin.
 *
 * @param {String} testid El testid a buscar.
 * @returns {Boolean}
 */
function esta_documentado(testid) {
	if (claves_documentadas.has(testid)) {
		return true
	}
	return claves_con_comodin.some(prefijo => testid.indexOf(prefijo) === 0)
}

/* --------------------------------------------------------------------------------- informe */

const sin_descripcion = []
testids_declarados.forEach((archivo, testid) => {
	if (!esta_documentado(testid)) {
		sin_descripcion.push({ testid: testid, archivo: archivo })
	}
})
sin_descripcion.sort((a, b) => a.testid.localeCompare(b.testid))

const total = testids_declarados.size
const documentados = total - sin_descripcion.length
const porcentaje = total ? Math.round((documentados / total) * 100) : 0

console.log('')
console.log('Cobertura de descripciones de controles')
console.log('=======================================')
console.log('')
console.log('  testids literales en src/ : ' + total)
console.log('  con descripcion           : ' + documentados + ' (' + porcentaje + '%)')
console.log('  sin descripcion           : ' + sin_descripcion.length)
console.log('  claves con comodin        : ' + claves_con_comodin.length + ' (cubren los testids dinamicos, no se cuentan arriba)')
console.log('')

if (sin_descripcion.length) {
	console.log('Sin descripcion todavia:')
	console.log('')
	sin_descripcion.forEach(item => {
		console.log('  ' + item.testid.padEnd(44) + ' ' + item.archivo)
	})
	console.log('')
}

/* Al reves: descripciones que quedaron sin control, tipicamente por un rename. */
const huerfanas = []
claves_documentadas.forEach(clave => {
	if (clave.charAt(clave.length - 1) == '*') {
		return
	}
	if (!testids_declarados.has(clave)) {
		huerfanas.push(clave)
	}
})

if (huerfanas.length) {
	console.log('Descripciones cuyo testid no aparece como literal en src/:')
	console.log('(puede ser un testid dinamico --normal-- o una descripcion huerfana por un rename)')
	console.log('')
	huerfanas.sort().forEach(clave => console.log('  ' + clave))
	console.log('')
}
