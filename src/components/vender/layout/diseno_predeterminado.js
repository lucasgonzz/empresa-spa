/*
	El diseño predeterminado de Vender: el que tenia el modulo antes de que existieran los diseños
	(mision diseno-vender-configurable, 28/9/2026).

	🔴 NO ESTA DUPLICADO EN EL BACKEND, Y ES A PROPOSITO.

	El "Diseño predeterminado" que el seeder le crea a cada dueño se guarda con `layout = NULL`, y
	NULL significa "este archivo". Si el default viviera tambien en PHP, cada campo nuevo de Vender
	obligaria a tocar dos lugares y tarde o temprano se desincronizarian. Asi, un cliente que nunca
	abrio el editor sigue viendo exactamente lo mismo que antes de la mision, incluido el ancho del
	buscador, que depende de sus extensiones y de si el usuario pide la cantidad al vender (ver
	`cols` del buscador en elementos.js). Recien al guardar desde el editor el diseño queda explicito.

	El orden sale del catalogo (elementos.js). Lo unico que agrega este archivo son los marcadores,
	que reproducen como se partian las filas antes:
	- un separador (la linea) antes de los campos del cliente, en la etapa 1;
	- un salto de fila (invisible) antes de IVA/stock/observaciones, en la etapa 3: antes iban en
	  una fila propia (IvaYStock.vue), debajo de estado, fecha de entrega, orden de compra y empleado;
	- un separador antes de los paneles de descuentos y recargos, en la etapa 3.
*/
import { ELEMENTOS, ETAPAS, KEY_SEPARADOR, KEY_SALTO_DE_FILA, cols_por_defecto } from './elementos'
import { disposicion_predeterminada, meta_por_defecto } from './secciones'

/*
	Version del formato del JSON de `vender_layouts.layout`. La 2 (mision
	vender-secciones-personalizables, 22/11/2026) suma `secciones` (metadatos de cada seccion) y
	`disposicion` (bandas y columnas); las claves de la version 1 siguen igual.
*/
export const VERSION_DEL_FORMATO = 2

/*
	Marcadores del diseño predeterminado: key del elemento ANTES del cual va. Los ids son fijos para
	que dos resoluciones del default den exactamente el mismo JSON.
*/
const MARCADORES_PREDETERMINADOS = [
	{ antes_de: 'cliente', key: KEY_SEPARADOR, id: 'separador_1' },
	{ antes_de: 'precios_con_iva', key: KEY_SALTO_DE_FILA, id: 'salto_de_fila_1' },
	{ antes_de: 'descuentos', key: KEY_SEPARADOR, id: 'separador_2' },
]

/**
 * Arma el diseño predeterminado para este negocio/usuario.
 *
 * Incluye TODOS los elementos del catalogo, esten disponibles o no: la disponibilidad se aplica al
 * dibujar, no al resolver, asi un elemento de una extension apagada ya tiene su lugar el dia que se
 * prende.
 *
 * La disposicion es la de siempre (una banda, una columna con las tres etapas apiladas) y los
 * metadatos de cada seccion son los de fabrica: titulos, colores azul/verde/naranja, alto
 * automatico y plegado de la etapa 1 y la etapa 3 de antes de las secciones configurables.
 *
 * @param {Object} vm componente de la SPA (para las cuentas de ancho que dependen de extensiones)
 * @returns {{version: number, etapas: Object, sacados: Array, secciones: Object, disposicion: Array}}
 */
export default function diseno_predeterminado(vm) {
	let etapas = {}
	let secciones = {}

	ETAPAS.forEach(function (etapa) {
		etapas[etapa] = []
		secciones[etapa] = meta_por_defecto(etapa)
	})

	ELEMENTOS.forEach(function (elemento) {
		MARCADORES_PREDETERMINADOS.forEach(function (marcador) {
			if (marcador.antes_de === elemento.key) {
				etapas[elemento.etapa].push({
					key: marcador.key,
					id: marcador.id,
					cols: 12,
				})
			}
		})

		etapas[elemento.etapa].push({
			key: elemento.key,
			cols: cols_por_defecto(elemento.key, vm),
		})
	})

	return {
		version: VERSION_DEL_FORMATO,
		etapas: etapas,
		sacados: [],
		secciones: secciones,
		disposicion: disposicion_predeterminada(),
	}
}
