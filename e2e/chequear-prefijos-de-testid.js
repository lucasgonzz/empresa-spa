// Deteccion de una clase de error concreta: "un data-testid nuevo que empieza igual que uno viejo".
//
// De donde sale. El 19/8/2026 se agrego el data-testid generico de las celdas de tabla
// (display/table/Tr.vue) con la forma `<model>-<key>-<id>-celda`. Parecia inofensivo y dejo un spec
// en rojo: alta-articulo-desde-buscador.spec.js ubica la fila recien agregada con
// `[data-testid^="article-amount-"]` --prefijo, porque no conoce el id de antemano-- y
// `article-amount-11-celda` TAMBIEN empieza con `article-amount-`. El selector paso a ver 2
// elementos donde habia 1, y el mensaje del fallo ("Expected: 1, Received: 2") no apunta ni de
// casualidad al testid nuevo.
//
// La regla que quedo: **un data-testid nuevo nunca puede compartir el comienzo con uno existente**,
// porque los selectores de prefijo son la forma estandar de este harness de encontrar una fila sin
// saber su id. El discriminante va adelante (`celda-article-cost-11`), no atras.
//
// Esto es la parte de "deteccion" de esa regla: se corre y devuelve una lista, no un consejo.
//
//     node e2e/chequear-prefijos-de-testid.js
//
// Que hace: junta los prefijos que los specs usan con `^=`, junta los data-testid literales que
// declaran las plantillas de src/, y lista los que caen adentro de algun prefijo. Un resultado con
// varias entradas bajo el mismo prefijo NO es necesariamente un bug --posicion-fiscal-* es a
// proposito, el helper las enumera todas-- pero es la lista corta que hay que mirar cuando se
// agrega un testid o cuando un `toHaveCount` empieza a contar de mas.
//
// Limitacion conocida: solo ve testids ESCRITOS COMO LITERAL en la plantilla. Los que se arman
// concatenando (`model_name + '-' + prop.key + ...`) no aparecen, asi que para los genericos hay
// que razonarlos a mano. Es igual la red mas barata que existe para esto.
const fs = require('fs')
const path = require('path')

/**
 * Junta recursivamente los archivos de `dir` con alguna de las extensiones pedidas.
 *
 * @param {string} dir
 * @param {string[]} extensiones
 * @param {string[]} [salida]
 * @returns {string[]}
 */
function archivos(dir, extensiones, salida = []) {
	for (const nombre of fs.readdirSync(dir)) {
		const completo = path.join(dir, nombre)
		if (fs.statSync(completo).isDirectory()) {
			if (nombre !== 'node_modules') {
				archivos(completo, extensiones, salida)
			}
		} else if (extensiones.some(extension => nombre.endsWith(extension))) {
			salida.push(completo)
		}
	}
	return salida
}

const raiz = path.join(__dirname, '..')

const prefijos = new Set()
for (const archivo of archivos(path.join(raiz, 'e2e'), ['.js'])) {
	const contenido = fs.readFileSync(archivo, 'utf8')
	for (const encontrado of contenido.matchAll(/data-testid\^="([^"]+)"/g)) {
		prefijos.add(encontrado[1])
	}
}

const declarados = []
for (const archivo of archivos(path.join(raiz, 'src'), ['.vue'])) {
	const contenido = fs.readFileSync(archivo, 'utf8')
	for (const encontrado of contenido.matchAll(/:?data-testid="([^"]+)"/g)) {
		declarados.push({ expresion: encontrado[1], archivo: path.relative(raiz, archivo) })
	}
}

console.log('Prefijos que los specs usan con ^= :')
console.log('  ' + [...prefijos].join('\n  '))
console.log('')

let hubo_alguno = false
for (const prefijo of prefijos) {
	const base = prefijo.replace(/-$/, '')
	const caen_adentro = declarados.filter(declarado =>
		declarado.expresion.includes("'" + base) ||
		declarado.expresion.includes('"' + base) ||
		declarado.expresion.includes(base + "-'")
	)

	if (caen_adentro.length) {
		hubo_alguno = true
		console.log('[' + prefijo + ']  ' + caen_adentro.length + ' testid(s) literales caen adentro:')
		caen_adentro.forEach(declarado => console.log('   ' + declarado.expresion + '   ' + declarado.archivo))
		console.log('')
	}
}

if (!hubo_alguno) {
	console.log('Ningun data-testid literal cae adentro de un prefijo usado por los specs.')
}
