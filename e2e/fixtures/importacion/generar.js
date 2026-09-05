// Generador de los Excel de la exploración de importación (2/9/2026, slot s8).
//
// Como script (para inspección manual, escribe en esta misma carpeta, sin sufijo):
//
//     node e2e/fixtures/importacion/generar.js
//
// Como módulo (lo usan los specs de exploración):
//
//     const { generar } = require('../fixtures/importacion/generar')
//     const archivos = generar(String(Date.now()), carpeta_destino)
//
// 🔴 El sufijo es lo que hace RE-EJECUTABLE la exploración sobre la base acumulada del slot:
// cada corrida importa bar_codes, códigos de proveedor, nombres y categoría nueva PROPIOS, así
// "6 creados" es verdad en la corrida uno y en la cincuenta. Lo único fijo es el bar_code
// 30000001: son los dos artículos "heredados" con el código duplicado que siembra
// TestingImportListasSeeder (data sucia deliberada, como A7/A8 del tenant 900 de tests/Import),
// contra los que se afirma la ambigüedad.
//
// Este archivo es la documentación viva de qué hay en cada celda, igual que
// tests/Import/fixtures/generar.php en empresa-api. Los specs afirman números calculados A MANO
// a partir de estas celdas: si cambiás un costo acá, los esperados de los specs dejan de cerrar.
//
// Tipos de celda: un string de JS queda como celda de TEXTO (pasa por el parseo de
// identificadores del backend), un number queda como celda NUMÉRICA. Los códigos de barras y de
// proveedor van SIEMPRE como texto: es la forma real de una lista de proveedor.
//
// La cuenta destino es la de TestingImportListasSeeder (doc 5678): listas Mayorista 20% /
// Minorista 40%, sucursales "Sucursal Centro" y "Sucursal Norte", categoría "Herramientas"
// pre-existente, SIN IIBB, artículos con IVA 21% por default de la base.

const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

/** Bar_code de los dos artículos heredados del seeder. NO lleva sufijo. */
const BAR_CODE_HEREDADO_DUPLICADO = '30000001'

function escribir(carpeta, nombre, filas) {
	const ws = XLSX.utils.aoa_to_sheet(filas)
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'Lista')
	const destino = path.join(carpeta, nombre)
	XLSX.writeFile(wb, destino)
	return destino
}

/**
 * Genera los seis Excel de la exploración con identificadores propios de la corrida.
 *
 * @param {string} sufijo   Distintivo de la corrida ('' para los archivos de muestra).
 * @param {string} carpeta  Carpeta destino (se crea si no existe).
 * @returns {{archivos: Object, datos: Object}} Rutas por clave y los identificadores usados.
 */
function generar(sufijo, carpeta) {
	fs.mkdirSync(carpeta, { recursive: true })

	const s = sufijo === '' ? '' : ' ' + sufijo

	// Identificadores de la corrida. Los bar_codes son numéricos puros (así una celda de texto
	// con contenido numérico ejercita el mismo parseo que una lista real de proveedor).
	const datos = {
		bar_taladro: '2' + sufijo + '01',
		bar_lija: '2' + sufijo + '02',
		bar_pintura: '2' + sufijo + '03',
		bar_rodillo: '2' + sufijo + '04',
		bar_cinta: '2' + sufijo + '05',
		bar_sierra: '2' + sufijo + '10',
		bar_heredado: BAR_CODE_HEREDADO_DUPLICADO,
		pc_taladro: 'PA-100' + (sufijo ? '-' + sufijo : ''),
		pc_lija: 'PA-101' + (sufijo ? '-' + sufijo : ''),
		pc_pintura: 'PA-102' + (sufijo ? '-' + sufijo : ''),
		pc_rodillo: 'PA-103' + (sufijo ? '-' + sufijo : ''),
		pc_cinta: 'PA-104' + (sufijo ? '-' + sufijo : ''),
		pc_martillo: 'PA-105' + (sufijo ? '-' + sufijo : ''),
		pc_repetido: 'PC-REP' + (sufijo ? '-' + sufijo : ''),
		nombre_taladro: 'Taladro Exploracion' + s,
		nombre_lija: 'Lija Exploracion' + s,
		nombre_pintura: 'Pintura Latex Exploracion' + s,
		nombre_rodillo: 'Rodillo Exploracion' + s,
		nombre_cinta: 'Cinta Metrica Exploracion' + s,
		nombre_martillo: 'Martillo Exploracion' + s,
		nombre_sierra: 'Sierra Exploracion' + s,
		nombre_sierra_bis: 'Sierra Exploracion Bis' + s,
		categoria_nueva: 'Pintureria' + s,
	}

	const archivos = {}

	// ── 01: alta de 6 artículos ─────────────────────────────────────────────────────────────
	//
	// Predicciones (PREDICCIONES-importacion-excel.md, P1-P7): 6 creados; finales únicos
	// 1210/605/2420/968/363/726; pivots por defecto de lista (Mayorista 20 → ×1.2×1.21,
	// Minorista 40 → ×1.4×1.21); la Lija con Minorista FIJADA en 1210 (margen derivado 100%);
	// la categoría nueva se crea UNA vez; 'herramientas' minúscula matchea la existente; stock
	// inicial absoluto con movimientos por sucursal (+100 Centro y +50 Norte el Taladro).
	archivos.alta = escribir(carpeta, '01-alta-articulos.xlsx', [
		['Nombre', 'Codigo de barras', 'Codigo proveedor', 'Costo', 'Categoria', 'Stock Centro', 'Stock Norte', 'Fijar precio Minorista', 'Precio final Minorista'],
		[datos.nombre_taladro,  datos.bar_taladro, datos.pc_taladro, 1000, 'Herramientas',        100, 50, '',   ''],
		[datos.nombre_lija,     datos.bar_lija,    datos.pc_lija,     500, 'Herramientas',         10, '', 'Si', 1210],
		[datos.nombre_pintura,  datos.bar_pintura, datos.pc_pintura, 2000, datos.categoria_nueva,  '', '', '',   ''],
		[datos.nombre_rodillo,  datos.bar_rodillo, datos.pc_rodillo,  800, datos.categoria_nueva,  '', '', '',   ''],
		[datos.nombre_cinta,    datos.bar_cinta,   datos.pc_cinta,    300, 'herramientas',         '', 20, '',   ''],
		[datos.nombre_martillo, '',                datos.pc_martillo, 600, 'Herramientas',         '', '', '',   ''],
	])

	// ── 00: alta mínima (solo el Taladro) ───────────────────────────────────────────────────
	//
	// Para el spec de códigos repetidos, que necesita UN artículo pre-existente propio (su fila
	// de "bar_code que ya existe" apunta a este Taladro) sin pagar el alta completa de 6 filas.
	archivos.alta_minima = escribir(carpeta, '00-alta-taladro-solo.xlsx', [
		['Nombre', 'Codigo de barras', 'Codigo proveedor', 'Costo'],
		[datos.nombre_taladro, datos.bar_taladro, datos.pc_taladro, 1200],
	])

	// ── 02: actualización de costos y stock (por bar_code) ──────────────────────────────────
	//
	// P8: Taladro costo 1000→1200 ⇒ Mayorista 1452→1742.40 y Minorista 1694→2032.80 (+20%).
	// P9: Lija costo 500→600 ⇒ Minorista fijada QUEDA en 1210, margen 100→66.67; Mayorista 726→871.20.
	// P10: Centro 100→120 ⇒ UN movimiento +20 a Sucursal Centro; global 150→170; Norte intacto.
	// P11: Cinta igual en todo ⇒ cero cambios, cero movimientos.
	archivos.costos = escribir(carpeta, '02-costos-y-stock.xlsx', [
		['Codigo de barras', 'Costo', 'Stock Centro', 'Stock Norte'],
		[datos.bar_taladro, 1200, 120, ''],
		[datos.bar_lija,     600,  '', ''],
		[datos.bar_cinta,    300,  '', 20],
	])

	// ── 03: códigos de barras repetidos ─────────────────────────────────────────────────────
	//
	// P13: filas 1+2 (mismo bar_code nuevo) ⇒ merge última gana ⇒ UN creado, costo 950.
	// P14: fila 3 matchea el Taladro ⇒ costo 1300, listas 1887.60 / 2200.20.
	// P15: fila 4 (bar_code 30000001, duplicado en base ×2 por el seeder) ⇒ AmbiguousMatch ⇒
	//      fila salteada + conflicto; ninguno de los dos heredados cambia.
	archivos.barcodes = escribir(carpeta, '03-barcodes-repetidos.xlsx', [
		['Nombre', 'Codigo de barras', 'Costo'],
		[datos.nombre_sierra,     datos.bar_sierra,   900],
		[datos.nombre_sierra_bis, datos.bar_sierra,   950],
		[datos.nombre_taladro,    datos.bar_taladro, 1300],
		['Ambiguo Exploracion' + s, datos.bar_heredado, 700],
	])

	// ── 04: código de proveedor repetido DENTRO del archivo (dos corridas) ──────────────────
	//
	// 4a (política intra 'ultima_gana'): 1 creado con costo 120.
	// 4b (política intra 'productos_distintos' + colisión 'crear_nuevo'): 2 creados más.
	archivos.provider_repetido = escribir(carpeta, '04-provider-code-repetido.xlsx', [
		['Nombre', 'Codigo proveedor', 'Costo'],
		['Repetido X' + s, datos.pc_repetido, 100],
		['Repetido Y' + s, datos.pc_repetido, 120],
	])

	// ── 05: una fila con el código ya multiplicado en base ──────────────────────────────────
	//
	// 4c (colisión 'actualizar_todos'): los 3 artículos PC-REP pasan a costo 200.
	archivos.provider_actualizar = escribir(carpeta, '05-provider-code-actualizar-todos.xlsx', [
		['Nombre', 'Codigo proveedor', 'Costo'],
		['Repetido actualizado' + s, datos.pc_repetido, 200],
	])

	// ── 06: la misma fila, para saltear ─────────────────────────────────────────────────────
	//
	// 4d (colisión 'saltear_y_reportar'): nada cambia (los 3 siguen en 200) y queda el conflicto.
	archivos.provider_saltear = escribir(carpeta, '06-provider-code-saltear.xlsx', [
		['Nombre', 'Codigo proveedor', 'Costo'],
		['Repetido salteado' + s, datos.pc_repetido, 250],
	])

	return { archivos, datos }
}

module.exports = { generar, BAR_CODE_HEREDADO_DUPLICADO }

if (require.main === module) {
	const { archivos } = generar('', __dirname)
	Object.keys(archivos).forEach(clave => console.log('escrito', archivos[clave]))
}
