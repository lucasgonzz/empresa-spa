/*
	Acciones de la tabla de artículos del diseñador de PDF (misión diseno-ticket-comandera,
	9/10/2026; plan §7.2).

	Mixin de componente de disenador-pdf/Index.vue (no es global), hermano de acciones_del_disenador.js:
	lo que la tabla, sus columnas, el panel de la columna y la bandeja le piden al diseñador por
	`inject` -- armar la tabla al abrir, poner las sugeridas, agregar, quitar, cambiar el ancho y el
	salto, mostrar una columna y hacerle lugar a la que entra arrastrando --. Usa los datos y los
	computeds de Index.vue (tabla, opciones_de_columnas, ancho_util_de_la_tabla_mm, total_de_la_tabla,
	catalogo, modelo_del_perfil) y las funciones puras de tabla_del_disenador.js.

	La tabla de trabajo vive en `this.tabla`:
	- columnas: TODAS las opciones del catálogo de columnas, como columnas de trabajo (ver la forma en
	  tabla_del_disenador.js), en el orden del catálogo. Es el registro: una columna es siempre el
	  mismo objeto, esté en la tabla o en la bandeja.
	- visibles: las que están en la tabla, en su orden. Es la lista que muta vuedraggable (`:list`) al
	  reordenar o al soltar una columna de la bandeja.
	Las ocultas no se guardan aparte: son `columnas − visibles` (computed `columnas_ocultas`), así no
	hay dos listas que mantener de acuerdo.

	Los nombres se chequearon contra los mixins globales: ninguno pisa a uno de ellos.
*/
import {
	armar_tabla,
	poner_sugeridas,
	columnas_sugeridas,
	hacer_lugar,
	cols_maximo_de,
	columnas_a_mm,
} from './tabla_del_disenador'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'

/* Lo que se dice cuando se pide agrandar una columna y la fila ya está completa */
const AVISO_DE_TABLA_COMPLETA = 'La tabla ya ocupa todo el ancho. Achicá otra columna para agrandar esta.'

/* Lo que se dice cuando una columna no entra ni achicando a las demás (todas en lo mínimo) */
const AVISO_DE_TABLA_SIN_LUGAR = 'La tabla no tiene lugar para otra columna. Quitá una o achicá alguna y volvé a probar.'

export default {
	methods: {
		/**
		 * Arma la tabla de trabajo con el catálogo de columnas (GET pdf-column-options) y los pivots
		 * del formulario (`model.pdf_column_options`), contra el ancho útil de ahora. Anota cuánto
		 * suman hoy en milímetros las visibles (lo guardado): si la hoja que se guarde no las deja
		 * entrar, la tabla viaja igual (ver datos_para_guardar).
		 *
		 * @param {Array|null} opciones_del_catalogo los `models` del catálogo de columnas (null si no llegó)
		 * @returns {void}
		 */
		armar_la_tabla(opciones_del_catalogo) {
			let armada = armar_tabla(
				opciones_del_catalogo || [],
				this.model.pdf_column_options,
				this.ancho_util_de_la_tabla_mm,
				this.total_de_la_tabla
			)
			this.tabla = {
				columnas: armada.columnas,
				visibles: armada.visibles,
			}
			this.suma_mm_de_la_base = armada.suma_mm_visible
			this.columnas_sugeridas_puestas = false
		},
		/**
		 * Si la tabla quedó sin columnas visibles, pone las sugeridas (`columnas_sugeridas` del
		 * catálogo, o el respaldo local). Se llama DESPUÉS de tomar las bases: ponerlas es un cambio
		 * sin guardar, así un perfil sin columnas no muestra una tabla que no imprime.
		 *
		 * @returns {void}
		 */
		poner_columnas_sugeridas() {
			if (this.tabla.visibles.length || !this.tabla.columnas.length) {
				return
			}
			let resolvers = columnas_sugeridas(this.modelo_del_perfil, this.catalogo)
			let entraron = poner_sugeridas(this.tabla.columnas, this.tabla.visibles, resolvers, this.total_de_la_tabla)
			this.columnas_sugeridas_puestas = entraron > 0
		},
		/**
		 * "Agregar" de la bandeja (o Enter sobre una columna de la bandeja): la columna va al final de
		 * la tabla con su ancho, haciéndole lugar si no entra (hacer_lugar: se le saca a la más ancha
		 * con más de 2). Queda seleccionada y resaltada.
		 *
		 * @param {Object} columna columna de trabajo oculta
		 * @returns {void}
		 */
		agregar_columna(columna) {
			if (!columna || this.tabla.visibles.indexOf(columna) !== -1) {
				return
			}
			this.tabla.visibles.push(columna)
			if (!this.hacerle_lugar(columna)) {
				return
			}
			this.seleccionar('columna', columna)
			this.destacar(columna.ui_id)
			this.llevar_a_la_vista('[data-ui="' + columna.ui_id + '"]')
		},
		/**
		 * Le hace lugar a una columna que ya está en `visibles` (recién agregada o soltada). Si ni
		 * achicando a las demás entra, la saca y avisa.
		 *
		 * @param {Object} columna
		 * @returns {boolean} si quedó en la tabla
		 */
		hacerle_lugar(columna) {
			if (hacer_lugar(this.tabla.visibles, columna, this.total_de_la_tabla)) {
				return true
			}
			let indice = this.tabla.visibles.indexOf(columna)
			if (indice !== -1) {
				this.tabla.visibles.splice(indice, 1)
			}
			avisar(this, 'warning', AVISO_DE_TABLA_SIN_LUGAR)
			return false
		},
		/**
		 * Una columna que entró a la tabla arrastrándola desde la bandeja (la llama
		 * al_terminar_arrastre con el índice donde cayó): se le hace lugar, se resalta y se
		 * selecciona.
		 *
		 * @param {number} indice
		 * @returns {void}
		 */
		columna_soltada_en_la_tabla(indice) {
			let columna = this.tabla.visibles[indice]
			if (!columna) {
				return
			}
			/*
				Por las dudas: si quedó dos veces (no debería: la bandeja solo deja arrastrar las que no
				están en la tabla), queda la de donde se soltó. Se recorre de atrás para adelante, así
				sacar una no corre las posiciones que faltan mirar.
			*/
			for (let posicion = this.tabla.visibles.length - 1; posicion >= 0; posicion--) {
				if (posicion !== indice && this.tabla.visibles[posicion] === columna) {
					this.tabla.visibles.splice(posicion, 1)
				}
			}
			if (!this.hacerle_lugar(columna)) {
				return
			}
			this.seleccionar('columna', columna)
			this.destacar(columna.ui_id)
		},
		/**
		 * "Quitar de la tabla" (panel de la columna o su ✕): vuelve a la bandeja con el ancho que
		 * tenía, así si se la vuelve a poner entra igual.
		 *
		 * @param {Object} columna
		 * @returns {void}
		 */
		quitar_columna(columna) {
			let indice = this.tabla.visibles.indexOf(columna)
			if (indice === -1) {
				return
			}
			this.tabla.visibles.splice(indice, 1)
			if (this.seleccion && this.seleccion.item === columna) {
				this.seleccionar(null, null)
			}
		},
		/**
		 * Cambia el ancho de una columna media columna (− / + del panel). Agrandar sin lugar en la
		 * fila no hace nada y avisa (el tope: la suma nunca pasa de la grilla). La columna de la hoja
		 * usa su propio − / + (mixin redimension_por_columnas), con el mismo tope y el mismo aviso.
		 *
		 * @param {Object} columna
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_ancho_de_columna(columna, paso) {
			if (paso > 0) {
				if (columna.cols >= this.cols_maximo_de_columna(columna)) {
					this.avisar_tabla_completa()
					return
				}
				columna.cols = columna.cols + 1
				return
			}
			if (columna.cols > 1) {
				columna.cols = columna.cols - 1
			}
		},
		/**
		 * Hasta cuántas medias columnas puede crecer una columna de la tabla (las suyas más las libres).
		 *
		 * @param {Object} columna
		 * @returns {number}
		 */
		cols_maximo_de_columna(columna) {
			return cols_maximo_de(columna, this.tabla.visibles, this.total_de_la_tabla)
		},
		/**
		 * Cuánto mide una columna en milímetros en la hoja de ahora (D9: lo que se va a guardar, salvo
		 * el recorte de un milímetro si la fila entera se pasa del ancho útil al redondear).
		 *
		 * @param {Object} columna
		 * @returns {number}
		 */
		mm_de_columna(columna) {
			return columnas_a_mm(columna.cols, this.ancho_util_de_la_tabla_mm, this.total_de_la_tabla)
		},
		/**
		 * El aviso de "la tabla ya ocupa todo el ancho" (como el tope de las cajas).
		 *
		 * @returns {void}
		 */
		avisar_tabla_completa() {
			avisar(this, 'warning', AVISO_DE_TABLA_COMPLETA)
		},
		/**
		 * Prende o apaga el salto de línea de una columna (solo si la opción lo permite).
		 *
		 * @param {Object} columna
		 * @returns {void}
		 */
		alternar_salto_de_columna(columna) {
			if (!columna.permite_salto) {
				return
			}
			columna.salto = !columna.salto
		},
		/**
		 * "En la tabla" de la bandeja: selecciona esa columna en la hoja y la lleva a la vista.
		 *
		 * @param {Object} columna
		 * @returns {void}
		 */
		mostrar_columna(columna) {
			if (this.tabla.visibles.indexOf(columna) === -1) {
				return
			}
			this.seleccionar('columna', columna)
			this.destacar(columna.ui_id)
			this.llevar_a_la_vista('[data-ui="' + columna.ui_id + '"]')
		},
		/**
		 * "+ Agregar columna" de la tabla: abre "Columnas de la tabla" en la bandeja (la bandeja mira
		 * `pedido_de_columnas`) y la lleva a la vista (en tablet y teléfono la bandeja queda abajo).
		 *
		 * @returns {void}
		 */
		mostrar_columnas_en_la_bandeja() {
			this.pedido_de_columnas = this.pedido_de_columnas + 1
			this.llevar_a_la_vista('[data-testid="categoria-columnas-disenador-pdf"]')
		},
	},
}
