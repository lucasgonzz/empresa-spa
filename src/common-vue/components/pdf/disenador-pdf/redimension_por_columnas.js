/*
	Cambiar el ancho de algo de una grilla de columnas del diseñador de PDF (misión
	diseno-pdf-configurable, 1/10/2026): tirando de sus bordes o con − / +. Mixin de componente (no
	es global) que comparten la caja (CajaDelDisenador.vue), el bloque del cliente de la factura de
	ARCA (BloqueFijo.vue) y, desde la misión diseno-ticket-comandera (9/10/2026), cada columna de la
	tabla (ColumnaDeLaTabla.vue): las mismas manijas, el mismo salto de a una columna y la misma
	insignia N/total. Es la lógica de ElementoDelEditor.vue del editor de Diseños de Vender.

	El componente que lo usa declara dos computeds:
	- item_redimensionable: el objeto de la lista de trabajo cuyo `cols` se cambia. 🔴 Se muta EN EL
	  LUGAR, a propósito: es el mismo objeto que vuedraggable mueve por referencia, y el diseñador ve
	  el cambio sin eventos (patrón de Vender).
	- cols_minimo: el ancho mínimo (1 para una caja; para un bloque fijo, el `cols_min` del catálogo).
	Y escucha 'redimension' (true / false) en la zona, que resalta las guías mientras se tira.

	Puede declarar además (si no, valen los de acá, que son los de las zonas):
	- total_de_columnas: las columnas de la grilla (12 en las zonas; 24 medias columnas en la tabla).
	- cols_maximo: hasta dónde puede crecer (en la tabla, sus columnas más las libres de la fila: la
	  suma nunca pasa de 24).
	- avisar_tope_de_ancho(): qué hacer cuando se pide más que cols_maximo y cols_maximo es menor que
	  la grilla (la tabla avisa que no hay lugar). Se llama una sola vez por tirón.

	El ancho se cambia de dos formas, igual que en Vender:
	- Tirando de un borde (pointer events + setPointerCapture: los movimientos le siguen llegando a la
	  manija aunque el puntero se salga de ella). Salta de a una columna:
	  cols = redondear(cols_inicial + Δx·signo / (anchoDeLaLista / total)), acotado a
	  cols_minimo..cols_maximo. Borde derecho hacia la derecha agranda; borde izquierdo hacia la
	  izquierda TAMBIÉN agranda.
	- Con los botones − / +, que además son el camino por teclado.

	Los nombres se chequearon contra los mixins globales: ninguno pisa a uno de ellos.
*/
import { acotar_entero } from './estado_del_disenador'

/* Columnas de la grilla de las zonas (cajas y bloques fijos) */
const COLUMNAS_DE_LAS_ZONAS = 12

export default {
	data() {
		return {
			/* true mientras se tira de una de las dos manijas */
			redimensionando: false,
			/* 'izquierda' | 'derecha': de qué borde se está tirando */
			lado: null,
			/* Posición X del puntero al empezar a tirar */
			x_inicial: 0,
			/* Ancho (en columnas) que tenía al empezar a tirar */
			cols_inicial: 0,
			/* Ancho en px de UNA columna de la lista, medido al empezar a tirar */
			ancho_de_columna: 0,
			/* Puntero que está tirando (con dos dedos en una tablet solo cuenta el primero) */
			id_de_puntero: null,
			/* true si en el tirón en curso ya se avisó que no hay lugar (el pointermove llega muchas veces) */
			tope_de_ancho_avisado: false,
		}
	},
	computed: {
		/**
		 * Columnas de la grilla donde vive el ítem: 12 en las zonas. La tabla lo redefine (24).
		 *
		 * @returns {number}
		 */
		total_de_columnas() {
			return COLUMNAS_DE_LAS_ZONAS
		},
		/**
		 * Hasta dónde puede crecer: toda la grilla. La tabla lo redefine (lo libre de su fila).
		 *
		 * @returns {number}
		 */
		cols_maximo() {
			return this.total_de_columnas
		},
	},
	beforeDestroy() {
		/* Si se destruye a mitad de un tirón (p. ej. se cerró el modal), avisar igual */
		if (this.redimensionando) {
			this.redimensionando = false
			this.$emit('redimension', false)
		}
	},
	methods: {
		/**
		 * Cambia el ancho una columna con los botones − / +, acotado a cols_minimo..cols_maximo. Si
		 * se pide agrandar y no hay lugar (el tope es menor que la grilla), avisa.
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_cols(paso) {
			let item = this.item_redimensionable
			if (paso > 0 && item.cols >= this.cols_maximo) {
				this.topar_el_ancho()
				return
			}
			item.cols = acotar_entero(item.cols + paso, this.cols_minimo, this.cols_maximo, item.cols)
		},
		/**
		 * Se pidió más ancho que el tope: si el tope no es la grilla entera (o sea, falta lugar en la
		 * fila), el componente avisa con su avisar_tope_de_ancho(), si lo tiene.
		 *
		 * @returns {void}
		 */
		topar_el_ancho() {
			if (this.cols_maximo >= this.total_de_columnas) {
				return
			}
			if (typeof this.avisar_tope_de_ancho == 'function') {
				this.avisar_tope_de_ancho()
			}
		},
		/**
		 * Empieza a tirar de un borde: mide la lista, toma el puntero y avisa a la zona (que resalta
		 * las guías de las columnas). El ancho de UNA columna sale del ancho de la lista (el padre de
		 * este ítem): los ítems ocupan calc(100% * N / total) de esa lista.
		 *
		 * @param {PointerEvent} evento pointerdown sobre la manija
		 * @param {string} lado 'izquierda' | 'derecha'
		 * @returns {void}
		 */
		iniciar_redimension(evento, lado) {
			/* Solo el botón principal del mouse (o un dedo, o el lápiz) */
			if (evento.button !== undefined && evento.button !== 0) {
				return
			}
			if (this.redimensionando) {
				return
			}

			let lista = this.$el.parentElement
			let ancho_de_la_lista = lista ? lista.getBoundingClientRect().width : 0

			if (!ancho_de_la_lista) {
				return
			}

			/* Sin esto el navegador empieza a seleccionar texto (mouse) o a scrollear (táctil) */
			evento.preventDefault()

			this.lado = lado
			this.x_inicial = evento.clientX
			this.cols_inicial = this.item_redimensionable.cols
			this.ancho_de_columna = ancho_de_la_lista / this.total_de_columnas
			this.id_de_puntero = evento.pointerId
			this.tope_de_ancho_avisado = false
			this.redimensionando = true

			/* Con la captura, los pointermove siguen llegando a la manija aunque el puntero salga de ella */
			try {
				evento.currentTarget.setPointerCapture(evento.pointerId)
			} catch (e) {
				console.log('diseño de PDF: no se pudo capturar el puntero', e)
			}

			this.$emit('redimension', true)
		},
		/**
		 * Recalcula el ancho mientras se tira: salta de a una columna, nunca por píxeles. Si el
		 * puntero pide más que el tope, se queda en el tope y avisa (una vez por tirón).
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		mover_redimension(evento) {
			if (!this.redimensionando || evento.pointerId !== this.id_de_puntero) {
				return
			}

			/* Hacia afuera siempre agranda: a la derecha en el borde derecho, a la izquierda en el izquierdo */
			let signo = this.lado === 'derecha' ? 1 : -1
			let desplazamiento = (evento.clientX - this.x_inicial) * signo
			let pedidas = Math.round(this.cols_inicial + desplazamiento / this.ancho_de_columna)
			let cols = acotar_entero(pedidas, this.cols_minimo, this.cols_maximo, this.cols_inicial)

			if (pedidas > this.cols_maximo && !this.tope_de_ancho_avisado) {
				this.tope_de_ancho_avisado = true
				this.topar_el_ancho()
			}

			if (cols !== this.item_redimensionable.cols) {
				this.item_redimensionable.cols = cols
			}
		},
		/**
		 * Termina de tirar (se soltó, se canceló el gesto o se perdió la captura). Puede llegar dos
		 * veces seguidas (pointerup y después lostpointercapture): la segunda no hace nada.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		terminar_redimension(evento) {
			if (!this.redimensionando) {
				return
			}
			if (evento && evento.pointerId !== undefined && evento.pointerId !== this.id_de_puntero) {
				return
			}

			this.redimensionando = false

			try {
				if (evento && evento.currentTarget && evento.currentTarget.hasPointerCapture && evento.currentTarget.hasPointerCapture(this.id_de_puntero)) {
					evento.currentTarget.releasePointerCapture(this.id_de_puntero)
				}
			} catch (e) {
				console.log('diseño de PDF: no se pudo soltar el puntero', e)
			}

			this.id_de_puntero = null
			this.$emit('redimension', false)
		},
	},
}
