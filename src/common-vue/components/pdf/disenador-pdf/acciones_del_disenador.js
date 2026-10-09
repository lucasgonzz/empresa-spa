/*
	Acciones de la hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	Mixin de componente de disenador-pdf/Index.vue (no es global): lo que las piezas de la hoja y de
	la bandeja le piden al diseñador por `inject` -- las reglas del arrastre (`move`), agregar,
	quitar, seleccionar, clonar lo que se suelta, cambiar la hoja, la escala y el logo, y resaltar
	lo recién agregado. Vive aparte para que Index.vue quede en el ciclo del modal (abrir, cargar,
	guardar, cerrar); usa sus datos y computeds (superior, pie, hoja, limites, seleccion_actual...).

	Los nombres se chequearon contra los mixins globales: ninguno pisa a uno de ellos.
*/
import {
	ZONAS,
	TIPO_CAJA,
	TIPO_FIJO,
	TIPO_SALTO_DE_FILA,
	KEY_TEXTO_LIBRE,
	COLS_DE_CAJA_NUEVA,
	COLS_DE_CAJA_COMPLETA,
	KEY_HOJA_A5,
	MOTIVO_A5_EN_ARCA,
	ids_en_uso,
	identidad,
	ubicar,
	indice_para_agregar,
	caja_nueva,
	salto_nuevo,
	campo_nuevo,
	acotar_entero,
} from './estado_del_disenador'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'

/* Cuánto dura el resaltado de algo recién agregado o movido con un botón (ms), como en Vender */
const DURACION_DEL_DESTACADO = 1600

/* Los tipos de los ítems de una zona (los campos no son ninguno de estos) */
const TIPOS_DE_ITEM_DE_ZONA = [TIPO_CAJA, TIPO_SALTO_DE_FILA, TIPO_FIJO]

export default {
	methods: {
		/**
		 * `move` de vuedraggable para todas las listas del diseñador.
		 *
		 * - Una caja, un salto de fila o un bloque fijo solo entran a una zona; un campo nunca entra a
		 *   una zona (ver el comentario de adentro: `put: true` de Sortable no mira el grupo).
		 * - Un bloque fijo solo se mueve dentro de su zona (decisión 4 del plan).
		 * - A la bandeja (zona para sacar o una categoría) va cualquier campo de una caja; lo que
		 *   sale de la bandeja no vuelve a la bandeja.
		 * - Lo que ENTRA a una zona o a una caja (nuevo, o traído de otra) se rechaza si ya tiene el
		 *   tope del catálogo (24 ítems por zona, 30 campos por caja), con un aviso. Reordenar dentro
		 *   de la misma lista siempre se puede.
		 * - La tabla va aparte (misión diseno-ticket-comandera): una columna solo se mueve dentro de
		 *   la tabla, entra desde "Columnas de la tabla" de la bandeja o vuelve ahí (sale de la
		 *   tabla); y a la tabla solo entran columnas.
		 *
		 * @param {Object} evento evento de vuedraggable (to, from, draggedContext, relatedContext)
		 * @returns {boolean} false cancela el movimiento
		 */
		permitir_movimiento(evento) {
			let destino = evento && evento.to && evento.to.getAttribute ? evento.to.getAttribute('data-lista') : null
			let origen = evento && evento.from && evento.from.getAttribute ? evento.from.getAttribute('data-lista') : null
			let arrastrado = evento && evento.draggedContext ? evento.draggedContext.element : null
			let lista_destino = evento && evento.relatedContext ? evento.relatedContext.list : null

			/*
				Las columnas de la tabla tienen su propio grupo (pdf-columnas) y no se mezclan con cajas
				ni campos: es la segunda red, como la de abajo para las zonas.
			*/
			let sale_de_columnas = origen === 'tabla' || origen === 'columnas'
			let va_a_columnas = destino === 'tabla' || destino === 'columnas'
			if (sale_de_columnas || va_a_columnas) {
				if (!sale_de_columnas || !va_a_columnas) {
					return false
				}
				/* A la bandeja solo vuelve lo que sale de la tabla (no se reordena la bandeja) */
				if (destino === 'columnas') {
					return origen === 'tabla'
				}
				return true
			}

			/*
				🔴 Cada cosa en su lista. En SortableJS `put: true` acepta elementos de CUALQUIER grupo
				(toFn: value === true → true sin mirar el nombre), y así una "Caja nueva" soltada sobre la
				parte de abajo de una caja del pie terminaba ADENTRO de sus campos ("Este campo ya no
				existe (undefined)"). Los grupos ya declaran `put` con la lista de grupos que aceptan; esto
				es la segunda red: un ítem de zona (caja, salto de fila o bloque fijo, también la fuente)
				solo entra a una zona, y un campo nunca entra a una zona. Se mira de dónde sale (la lista)
				y qué es (el `tipo` de los ítems de zona; los campos del catálogo traen otro `tipo`:
				texto, texto_largo o lista).
			*/
			let es_item_de_zona = origen === 'zona'
				|| origen === 'fuente'
				|| !!(arrastrado && TIPOS_DE_ITEM_DE_ZONA.indexOf(arrastrado.tipo) !== -1)

			if (es_item_de_zona && destino !== 'zona') {
				return false
			}
			if (!es_item_de_zona && destino === 'zona') {
				return false
			}

			if (arrastrado && arrastrado.tipo === TIPO_FIJO) {
				return evento.to === evento.from
			}

			if (destino === 'papelera' || destino === 'categoria') {
				return origen === 'campos'
			}

			if (evento.to !== evento.from && Array.isArray(lista_destino)) {
				if (destino === 'zona' && lista_destino.length >= this.limites.max_items_por_zona) {
					this.avisar_tope('Cada zona admite hasta ' + this.limites.max_items_por_zona + ' cajas y saltos de fila. Quitá alguno para poner otro.')
					return false
				}
				if (destino === 'campos' && lista_destino.length >= this.limites.max_campos_por_caja) {
					this.avisar_tope('Cada caja admite hasta ' + this.limites.max_campos_por_caja + ' campos. Usá otra caja para este.')
					return false
				}
			}

			return true
		},
		/**
		 * Avisa un tope, una sola vez por arrastre.
		 *
		 * @param {string} mensaje
		 * @returns {void}
		 */
		avisar_tope(mensaje) {
			if (this.tope_avisado) {
				return
			}
			this.tope_avisado = true
			avisar(this, 'warning', mensaje)
		},
		/**
		 * Empieza un arrastre: se anota qué se arrastra y desde dónde (la bandeja se ofrece para
		 * sacar un campo, las zonas para recibir una caja).
		 *
		 * @param {Object} evento evento `start` de Sortable
		 * @returns {void}
		 */
		al_empezar_arrastre(evento) {
			let item = evento ? evento.item : null
			this.arrastrando = {
				tipo: item && item.getAttribute ? item.getAttribute('data-tipo') : null,
				desde: evento && evento.from && evento.from.getAttribute ? evento.from.getAttribute('data-lista') : null,
			}
			this.tope_avisado = false
		},
		/**
		 * Termina un arrastre. Si se soltó algo NUEVO (una caja de la fuente en una zona, o un campo
		 * de la bandeja en una caja), se lo resalta; una caja nueva y un texto libre quedan además
		 * seleccionados, para ponerles título o escribir el texto.
		 *
		 * @param {Object} evento evento `end` de Sortable (to, from, newIndex)
		 * @returns {void}
		 */
		al_terminar_arrastre(evento) {
			this.arrastrando = null

			let desde = evento && evento.from && evento.from.getAttribute ? evento.from.getAttribute('data-lista') : null
			let hacia = evento && evento.to && evento.to.getAttribute ? evento.to.getAttribute('data-lista') : null
			let indice = evento ? evento.newIndex : null

			if (desde === 'fuente' && hacia === 'zona') {
				let lista = this[evento.to.getAttribute('data-zona')]
				let nuevo = Array.isArray(lista) ? lista[indice] : null
				if (nuevo) {
					this.destacar(identidad(nuevo))
					if (nuevo.tipo === TIPO_CAJA) {
						this.seleccionar('caja', nuevo)
					}
				}
				return
			}

			if (desde === 'categoria' && hacia === 'campos') {
				let caja = this.caja_por_id(evento.to.getAttribute('data-caja'))
				let campo = caja ? caja.campos[indice] : null
				if (campo) {
					this.destacar(campo.ui_id)
					if (campo.key === KEY_TEXTO_LIBRE) {
						this.seleccionar('campo', campo)
					}
				}
				return
			}

			/*
				Una columna de la bandeja soltada en la tabla: se le hace lugar (si no entra, se le saca a
				la más ancha) y queda seleccionada (acciones_de_la_tabla.js). Una columna de la tabla
				soltada en la bandeja ya salió de la tabla (vuedraggable la sacó de `tabla.visibles`) y
				vuelve a ofrecerse ahí sola: no hay nada más que hacer.
			*/
			if (desde === 'columnas' && hacia === 'tabla') {
				this.columna_soltada_en_la_tabla(indice)
			}
		},
		/**
		 * La caja con ese id, en cualquiera de las dos zonas.
		 *
		 * @param {string} id
		 * @returns {Object|null}
		 */
		caja_por_id(id) {
			let encontrada = null
			let self = this
			ZONAS.forEach(function (zona) {
				self[zona].forEach(function (item) {
					if (!encontrada && item.tipo === TIPO_CAJA && item.id === id) {
						encontrada = item
					}
				})
			})
			return encontrada
		},
		/**
		 * Selecciona algo de la hoja (o nada, con tipo null).
		 *
		 * @param {string|null} tipo 'caja' | 'campo' | 'fijo'
		 * @param {Object|null} item
		 * @returns {void}
		 */
		seleccionar(tipo, item) {
			this.seleccion = tipo && item ? { tipo: tipo, item: item } : null
		},
		/**
		 * La ✕ de una caja o de un salto de fila (un bloque fijo no se quita). Una caja con campos
		 * pregunta antes: sus campos vuelven a quedar libres en la bandeja.
		 *
		 * @param {string} zona
		 * @param {Object} item
		 * @returns {void}
		 */
		quitar_item(zona, item) {
			let self = this

			if (!item || item.tipo === TIPO_FIJO) {
				return
			}

			let ubicacion = ubicar(this.estado_de_trabajo, item)
			if (!ubicacion) {
				return
			}

			let sacar = function () {
				let lista = self[ubicacion.zona]
				let indice = lista.indexOf(item)
				if (indice !== -1) {
					lista.splice(indice, 1)
				}
			}

			if (item.tipo !== TIPO_CAJA || !item.campos.length) {
				sacar()
				return
			}

			let titulo = String(item.titulo || '').trim()
			let cantidad = item.campos.length

			this.$bvModal.msgBoxConfirm('Sus ' + cantidad + (cantidad === 1 ? ' campo vuelve' : ' campos vuelven') + ' a quedar libres en la bandeja. Nada se guarda hasta que toques Guardar.', {
				title: titulo ? '¿Quitar la caja «' + titulo + '»?' : '¿Quitar esta caja?',
				okTitle: 'Quitar la caja',
				okVariant: 'danger',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (confirmado) {
					sacar()
				}
			})
			.catch(function () {})
		},
		/**
		 * La ✕ de un campo: lo saca de su caja (vuelve a quedar libre en la bandeja).
		 *
		 * @param {Object} campo
		 * @returns {void}
		 */
		quitar_campo(campo) {
			let ubicacion = ubicar(this.estado_de_trabajo, campo)
			if (ubicacion && ubicacion.caja) {
				ubicacion.caja.campos.splice(ubicacion.indice, 1)
			}
		},
		/**
		 * "+ Agregar caja" de una zona: una caja de 6 columnas, sin título y con el primer estilo
		 * del catálogo (el de borde), al final de la zona -- antes del bloque de ARCA del pie, si la
		 * zona lo tiene --, seleccionada para ponerle título.
		 *
		 * @param {string} zona
		 * @returns {void}
		 */
		agregar_caja(zona) {
			let lista = this[zona]

			if (lista.length >= this.limites.max_items_por_zona) {
				avisar(this, 'warning', 'Cada zona admite hasta ' + this.limites.max_items_por_zona + ' cajas y saltos de fila. Quitá alguno para poner otra caja.')
				return
			}

			let caja = caja_nueva(ids_en_uso(this.estado_de_trabajo), COLS_DE_CAJA_NUEVA, this.limites.estilos_de_caja[0])
			/* Al final de la zona, pero ANTES del bloque de ARCA del pie (no debajo del cuadro de ARCA) */
			lista.splice(indice_para_agregar(lista), 0, caja)
			this.seleccionar('caja', caja)
			this.destacar(identidad(caja))
			this.llevar_a_la_vista('.dpdf-caja[data-id="' + caja.id + '"]')
		},
		/**
		 * "Agregar" de la bandeja: el campo va a la caja seleccionada (o a la del campo
		 * seleccionado); si no hay, a la última caja de su zona sugerida que esté ANTES del bloque de
		 * ARCA del pie; si no hay ninguna, a una nueva de 12 columnas puesta antes de ese bloque (plan
		 * §8.3; en una factura, lo que se agrega al pie no cae debajo del cuadro de ARCA).
		 *
		 * @param {Object} definicion campo del catálogo
		 * @returns {void}
		 */
		agregar_campo(definicion) {
			if (!definicion) {
				return
			}
			if (definicion.key !== KEY_TEXTO_LIBRE && this.keys_en_uso[definicion.key]) {
				return
			}

			let destino = null
			let seleccion = this.seleccion_actual

			if (seleccion && seleccion.tipo === 'caja') {
				destino = seleccion.item
			} else if (seleccion && seleccion.tipo === 'campo') {
				destino = seleccion.caja
			}

			if (!destino) {
				let zona = ZONAS.indexOf(definicion.zona_sugerida) !== -1 ? definicion.zona_sugerida : ZONAS[0]
				let lista = this[zona]
				/*
					Solo cuentan las cajas que están ANTES del bloque de ARCA del pie: lo que se agrega al pie
					de una factura no cae debajo del cuadro de ARCA (y una caja nueva va antes de él)
				*/
				let limite = indice_para_agregar(lista)
				let cajas = lista.slice(0, limite).filter(function (item) {
					return item.tipo === TIPO_CAJA
				})
				destino = cajas.length ? cajas[cajas.length - 1] : null

				if (!destino) {
					if (lista.length >= this.limites.max_items_por_zona) {
						avisar(this, 'warning', 'La zona ya tiene ' + this.limites.max_items_por_zona + ' cajas y saltos de fila: elegí una caja para agregarle el campo.')
						return
					}
					destino = caja_nueva(ids_en_uso(this.estado_de_trabajo), COLS_DE_CAJA_COMPLETA, this.limites.estilos_de_caja[0])
					lista.splice(limite, 0, destino)
				}
			}

			if (destino.campos.length >= this.limites.max_campos_por_caja) {
				avisar(this, 'warning', 'Esa caja ya tiene ' + this.limites.max_campos_por_caja + ' campos. Elegí otra caja para agregarle este.')
				return
			}

			let campo = campo_nuevo(definicion, ids_en_uso(this.estado_de_trabajo))
			destino.campos.push(campo)

			if (campo.key === KEY_TEXTO_LIBRE) {
				this.seleccionar('campo', campo)
			}
			this.destacar(campo.ui_id)
			this.llevar_a_la_vista('[data-ui="' + campo.ui_id + '"]')
		},
		/**
		 * "En uso" de la bandeja: selecciona ese campo en la hoja y lo lleva a la vista.
		 *
		 * @param {string} key
		 * @returns {void}
		 */
		mostrar_campo(key) {
			let encontrado = null
			let self = this

			ZONAS.forEach(function (zona) {
				self[zona].forEach(function (item) {
					if (item.tipo !== TIPO_CAJA) {
						return
					}
					item.campos.forEach(function (campo) {
						if (!encontrado && campo.key === key) {
							encontrado = campo
						}
					})
				})
			})

			if (!encontrado) {
				return
			}

			this.seleccionar('campo', encontrado)
			this.destacar(encontrado.ui_id)
			this.llevar_a_la_vista('[data-ui="' + encontrado.ui_id + '"]')
		},
		/**
		 * Lo que vuedraggable inserta en una caja al soltar un campo de la bandeja.
		 *
		 * @param {Object} definicion campo del catálogo
		 * @returns {Object}
		 */
		clonar_campo(definicion) {
			return campo_nuevo(definicion, ids_en_uso(this.estado_de_trabajo))
		},
		/**
		 * Lo que vuedraggable inserta en una zona al soltar "Caja nueva" o "Salto de fila".
		 *
		 * @param {Object} item ítem de la fuente ({tipo})
		 * @returns {Object}
		 */
		clonar_de_la_fuente(item) {
			let ids = ids_en_uso(this.estado_de_trabajo)
			if (item && item.tipo === TIPO_SALTO_DE_FILA) {
				return salto_nuevo(ids)
			}
			return caja_nueva(ids, COLS_DE_CAJA_NUEVA, this.limites.estilos_de_caja[0])
		},
		/**
		 * "Volver al estilo del campo": el tamaño, la negrita, la cursiva y la alineación vuelven a
		 * null (los del catálogo). El rótulo no se toca.
		 *
		 * @param {Object} campo
		 * @returns {void}
		 */
		restablecer_estilo(campo) {
			campo.tamano = null
			campo.negrita = null
			campo.cursiva = null
			campo.alineacion = null
		},
		/**
		 * Elige un formato de hoja (siempre vertical). El margen no cambia.
		 *
		 * @param {Object} formato {key, nombre, ancho_mm, alto_mm}
		 * @returns {void}
		 */
		elegir_formato(formato) {
			/* Una factura de ARCA no va en A5 (el botón ya viene deshabilitado; esto es por las dudas) */
			if (this.es_factura_de_arca && formato.key === KEY_HOJA_A5) {
				avisar(this, 'warning', MOTIVO_A5_EN_ARCA)
				return
			}
			this.hoja = {
				ancho: Number(formato.ancho_mm),
				alto: Number(formato.alto_mm),
				margen: this.hoja.margen,
			}
		},
		/**
		 * Cambia el margen 1 mm, dentro de los límites del catálogo.
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_margen(paso) {
			this.hoja = {
				ancho: this.hoja.ancho,
				alto: this.hoja.alto,
				margen: acotar_entero(this.hoja.margen + paso, this.limites.margen_min, this.limites.margen_max, this.hoja.margen),
			}
		},
		/**
		 * La escala que midió la hoja (px por mm). Se redondea para no re-dibujar por décimas.
		 *
		 * @param {number} valor
		 * @returns {void}
		 */
		cambiar_escala(valor) {
			let redondeado = Math.round(valor * 100) / 100
			if (redondeado > 0 && Math.abs(redondeado - this.escala) >= 0.01) {
				this.escala = redondeado
			}
		},
		/**
		 * El tamaño del logo que se cambió con la manija del encabezado (mm, ya acotado).
		 *
		 * @param {number} milimetros
		 * @returns {void}
		 */
		cambiar_logo(milimetros) {
			this.logo_size_mm = Number(milimetros)
		},
		/**
		 * Resalta algo un momento (lo que se acaba de agregar o de mostrar).
		 *
		 * @param {string} cual identidad de una caja/salto/fijo o ui_id de un campo
		 * @returns {void}
		 */
		destacar(cual) {
			let self = this
			clearTimeout(this.timer_del_destacado)
			/* Se apaga y se vuelve a prender en el próximo tick para que la animación corra de nuevo */
			this.destacado = null
			this.$nextTick(function () {
				self.destacado = cual
				self.timer_del_destacado = setTimeout(function () {
					self.destacado = null
				}, DURACION_DEL_DESTACADO)
			})
		},
		/**
		 * Scrollea hasta algo recién agregado (puede haber caído fuera de la vista, sobre todo en el
		 * teléfono, donde la bandeja queda debajo de la hoja).
		 *
		 * @param {string} selector
		 * @returns {void}
		 */
		llevar_a_la_vista(selector) {
			let self = this
			this.$nextTick(function () {
				/* El b-modal se monta colgando de <body>: se lo busca por su id, no dentro de this.$el */
				let modal = document.getElementById(self.id_del_modal)
				let elemento = modal ? modal.querySelector(selector) : null
				if (elemento && typeof elemento.scrollIntoView == 'function') {
					elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
				}
			})
		},
	},
}
