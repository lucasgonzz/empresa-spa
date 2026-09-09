// Deteccion de una clase de error concreta: "el min-width de una tabla puesto en el contenedor del
// scroll en vez de en la tabla".
//
// De donde sale. La pantalla de Potencial de armado (produccionV2) necesita que sus seis columnas
// no se espichen en tablet ni en telefono, y para eso le puso `min-width: 820px` a la clase que le
// pasaba al `<b-table responsive>` por el atributo `class`. Parecia lo obvio y hacia exactamente lo
// contrario de lo que buscaba:
//
//   🔴 CON `responsive`, BOOTSTRAP-VUE PONE LO QUE VENGA EN `class` SOBRE EL DIV `.table-responsive`
//      --EL CONTENEDOR DEL SCROLL-- Y NO SOBRE LA <table>.
//
// Con el min-width ahi, el contenedor tiene PROHIBIDO achicarse: media 820px fijos adentro de un
// viewport de 375, y el que terminaba scrolleando horizontal era la PAGINA entera. O sea que el
// min-width, puesto para evitar el scroll horizontal de la pagina, era el que lo causaba. Medido el
// 8/9/2026: a 820px la pagina daba scrollWidth 891 sobre 805, y a 375px el contenedor seguia
// midiendo 820. En escritorio no se nota, que es el motivo por el que habia pasado.
//
// La forma correcta es `table-class`, que baja la clase a la <table> de adentro: la tabla es la que
// tiene que ser ancha, y el contenedor la scrollea.
//
// Que hace este chequeo: busca todos los `<b-table>` de src/ que tengan `responsive`, se fija que
// clases les llegan por `class` (no por `table-class`), y avisa si alguna de esas clases tiene un
// `min-width` declarado en el <style> del mismo archivo. Es exactamente el bug, y no tiene falsos
// positivos conocidos: una clase con min-width sobre el contenedor de un scroll horizontal no tiene
// ningun uso legitimo.
//
//     node e2e/chequear-min-width-en-tablas-responsive.js
//
// Sale con codigo 1 y lista los archivos si encuentra alguno, asi que sirve tal cual en un hook o
// en CI. Con 0 y una linea de OK si esta limpio.
//
// Limitacion conocida: mira el <style> del MISMO archivo. Una clase definida en un sass global no
// la ve. Es igual la red mas barata que existe para esto, y cubre el patron real del repo, que es
// declarar los estilos de un componente adentro del componente.
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')

/**
 * Junta recursivamente los `.vue` que cuelgan de `dir`.
 *
 * @param {string} dir
 * @returns {string[]} rutas absolutas.
 */
function juntar_vues(dir) {
	let encontrados = []

	fs.readdirSync(dir, { withFileTypes: true }).forEach(entrada => {

		const completa = path.join(dir, entrada.name)

		if (entrada.isDirectory()) {
			encontrados = encontrados.concat(juntar_vues(completa))
			return
		}

		if (entrada.name.endsWith('.vue')) {
			encontrados.push(completa)
		}
	})

	return encontrados
}

/**
 * Los bloques `<b-table ...>` de un contenido, con sus atributos en crudo.
 *
 * Se corta en el primer `>` que cierra la etiqueta de apertura. Alcanza porque los atributos de
 * este repo no traen `>` adentro de sus valores.
 *
 * @param {string} contenido
 * @returns {string[]} el texto de los atributos de cada b-table.
 */
function etiquetas_b_table(contenido) {
	const encontradas = []
	const regex = /<b-table\b([^>]*)>/g

	let match = regex.exec(contenido)

	while (match !== null) {
		encontradas.push(match[1])
		match = regex.exec(contenido)
	}

	return encontradas
}

/**
 * Las clases que la etiqueta pasa por `class` (el atributo estatico, no `:class` ni `table-class`).
 *
 * @param {string} atributos
 * @returns {string[]}
 */
function clases_del_atributo_class(atributos) {
	// El `(?<!-)` evita que `table-class="x"` matchee como si fuera `class="x"`.
	const match = /(?<![-:\w])class\s*=\s*"([^"]*)"/.exec(atributos)

	if (match === null) {
		return []
	}

	return match[1].split(/\s+/).filter(clase => clase.length > 0)
}

/**
 * Si el <style> del archivo le declara un `min-width` a esa clase.
 *
 * Contempla las dos formas en que el repo la puede escribir: el selector completo
 * (`.potencial-de-armado__tabla`) y el anidado de sass con `&__tabla` adentro del bloque del
 * bloque padre.
 *
 * @param {string} contenido
 * @param {string} clase
 * @returns {boolean}
 */
function tiene_min_width(contenido, clase) {
	const bloque_style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(contenido)

	if (bloque_style === null) {
		return false
	}

	const style = bloque_style[1]

	// El nombre tal cual (`.la-clase`) y el sufijo del anidado sass (`&__tabla` para
	// `bloque__tabla`). En los dos casos se mira hasta el proximo selector de la misma altura.
	const partes = clase.split('__')
	const sufijo = partes.length > 1 ? '&__' + partes.slice(1).join('__') : null

	const anclas = ['.' + clase]

	if (sufijo !== null) {
		anclas.push(sufijo)
	}

	return anclas.some(ancla => {

		const desde = style.indexOf(ancla)

		if (desde === -1) {
			return false
		}

		// Desde el ancla hasta el proximo selector que arranca en la misma columna, o el final.
		const resto = style.slice(desde + ancla.length)
		const corte = /\n\t?[.&#a-zA-Z]/.exec(resto)
		const bloque = corte === null ? resto : resto.slice(0, corte.index)

		return /min-width\s*:/.test(bloque)
	})
}

const hallazgos = []

juntar_vues(SRC).forEach(archivo => {

	const contenido = fs.readFileSync(archivo, 'utf8')

	etiquetas_b_table(contenido).forEach(atributos => {

		if (!/\bresponsive\b/.test(atributos)) {
			return
		}

		clases_del_atributo_class(atributos).forEach(clase => {

			if (tiene_min_width(contenido, clase)) {

				hallazgos.push({
					archivo: path.relative(path.join(__dirname, '..'), archivo),
					clase: clase,
				})
			}
		})
	})
})

if (hallazgos.length === 0) {
	console.log('OK: ningun <b-table responsive> le pasa por `class` una clase con min-width.')
	process.exit(0)
}

console.log('Estas tablas le ponen el min-width al CONTENEDOR del scroll, no a la tabla.')
console.log('Con `responsive`, lo que va en `class` aterriza en el div .table-responsive: el')
console.log('contenedor no puede achicarse y el scroll horizontal se lo come la pagina entera.')
console.log('Se arregla pasando esa clase por `table-class` en vez de por `class`.')
console.log('')

hallazgos.forEach(hallazgo => {
	console.log('  ' + hallazgo.archivo + '  ->  class="' + hallazgo.clase + '"')
})

process.exit(1)
