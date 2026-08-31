// Genera al vuelo los archivos .xlsx que los specs suben a las pantallas de importacion.
//
// Por que se GENERA y no se commitea un archivo fijo: los articulos que un spec crea tienen que
// tener un nombre unico por corrida (si no, la segunda corrida encontraria el de la primera y
// estaria probando otra cosa). Un archivo estatico no puede llevar un nombre que cambia, asi que
// tendria que existir un articulo "de importacion" precargado en el fixture --y entonces el spec
// ya no probaria el alta desde el Excel, que es justo lo que vino a probar--.
//
// Usa `xlsx`, que ya es dependencia de empresa-spa (package.json: "xlsx": "^0.18.5"): no se agrega
// ninguna libreria al repo para esto.
const fs = require('fs')
const os = require('os')
const path = require('path')
const XLSX = require('xlsx')

/**
 * Encabezado del Excel de articulos de una COMPRA, en el orden exacto en que lo espera el modal de
 * importacion (`components/provider/modals/orders/Import.vue`).
 *
 * 🔴 El orden no es decorativo: el importador ubica cada dato por POSICION de columna, no por el
 * texto del encabezado. La cuarta columna es "Cantidad" cuando el tipo de importacion es `pedido`
 * y "Cantidad recibida" cuando es `recibido`; es la misma posicion en los dos casos.
 */
const COLUMNAS_COMPRA = [
	'Codigo de barras',
	'Codigo de proveedor',
	'Nombre',
	'Cantidad',
	'Costo',
	'Notas',
]

/**
 * Escribe un .xlsx de articulos de compra en un archivo temporal y devuelve su ruta absoluta.
 *
 * La primera fila es el encabezado, asi que los datos arrancan en la fila 2: es lo que hay que
 * declararle al modal de importacion en "Fila desde".
 *
 * 🔴 Como matchea el importador (`app/Imports/ProviderOrderArticleImport.php`), y en este orden:
 * primero por `bar_code`, si viene vacio por `provider_code`, y si tambien viene vacio por `name`.
 * Si no encuentra ninguno, CREA el articulo. O sea que una fila con solo el nombre de un articulo
 * que ya existe lo ACTUALIZA, y una con un nombre que no existe lo DA DE ALTA. Es exactamente la
 * palanca que necesita un spec para probar las dos cosas en el mismo archivo.
 *
 * @param {Array<{name: string, cantidad: number, costo: number, bar_code?: string, provider_code?: string, notas?: string}>} filas
 * @param {string} nombre_archivo Nombre del archivo (sin ruta). Conviene que lleve un timestamp.
 * @returns {string} Ruta absoluta del archivo escrito.
 */
function escribir_excel_de_compra(filas, nombre_archivo) {
	const datos = filas.map(fila => [
		fila.bar_code || '',
		fila.provider_code || '',
		fila.name,
		fila.cantidad,
		fila.costo,
		fila.notas || '',
	])

	const hoja = XLSX.utils.aoa_to_sheet([COLUMNAS_COMPRA].concat(datos))
	const libro = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(libro, hoja, 'Articulos')

	// Los archivos van a la carpeta temporal del sistema y no al repo: son basura de una corrida.
	const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-excel-'))
	const ruta = path.join(carpeta, nombre_archivo)

	XLSX.writeFile(libro, ruta)

	return ruta
}

module.exports = {
	COLUMNAS_COMPRA,
	escribir_excel_de_compra,
}
