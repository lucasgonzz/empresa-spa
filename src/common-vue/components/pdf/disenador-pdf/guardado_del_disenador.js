/*
	Guardado del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	Mixin de componente de disenador-pdf/Index.vue (no es global): "Volver al diseño de siempre",
	qué viaja al guardar (y qué no: page_layout solo si el lienzo o la hoja se tocaron, plan §8.3;
	pdf_column_options solo si la tabla o la hoja cambiaron, misión diseno-ticket-comandera §7.2),
	el PUT, lo que se copia al formulario después y "Ver un PDF de prueba". Usa los datos y los
	computeds de Index.vue (estado_de_trabajo, hoja, sigue_de_siempre, cambio_que_pasa_a_cajas,
	tabla, tabla_cambiada...).

	En un ticket de comandera (misión diseno-ticket-comandera, plan §7.3) cambia lo que viaja: ni la
	hoja ni el encabezado (la API fuerza papel, imprimible y margen del rollo, y el ticket no tiene
	encabezado aparte, D6); "Volver al ticket de siempre" no toca el ancho; y "Ver un PDF de prueba"
	pasa a "Ver cómo sale" (el ticket en texto que arma la API, en un modal).

	Los nombres se chequearon contra los mixins globales: ninguno pisa a uno de ellos.
*/
import {
	HOJA_DE_SIEMPRE,
	MOTIVO_A5_EN_ARCA,
	AVISO_MODELO_SIN_GUARDAR,
	es_verdadero,
	armar_estado,
	serializar,
	tiene_diseno,
	ancho_util,
} from './estado_del_disenador'
import { opciones_para_guardar, suma_mm_visible } from './tabla_del_disenador'
import { guardar_diseno, traer_ticket_en_texto, mensaje_de_error } from './api_del_disenador'
import { caracteres_por_renglon } from './vista_de_ticket'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'
import { env } from '@/runtime_config'

/*
	Lo que el diseñador guarda del perfil: lo único que copia al formulario después de guardar. La
	tabla (`pdf_column_options`) va aparte: se copia solo si viajó (ver aplicar_lo_guardado).
*/
const CLAVES_DEL_DISENO = ['page_layout', 'paper_width_mm', 'printable_width_mm', 'margin_mm', 'paper_height_mm', 'header_layout', 'logo_size_mm']

/* Comienzo del mensaje del 422 de columnas (PdfColumnProfileController::assert_sum_of_column_widths_not_exceeds_paper) */
const MENSAJE_DEL_422_DE_COLUMNAS = 'La suma de los anchos visibles'

/**
 * Si un error del guardado es el 422 de "la suma de los anchos visibles no puede superar el ancho
 * disponible": viene en `errors.pdf_column_options` (o, por las dudas, se reconoce por el texto).
 *
 * @param {Object} error error de axios
 * @param {string} mensaje el mensaje que ya se armó con mensaje_de_error()
 * @returns {boolean}
 */
function es_el_422_de_columnas(error, mensaje) {
	let respuesta = error && error.response ? error.response : null
	if (!respuesta || respuesta.status !== 422) {
		return false
	}
	let errores = respuesta.data && respuesta.data.errors ? respuesta.data.errors : null
	return !!(errores && errores.pdf_column_options) || String(mensaje || '').indexOf(MENSAJE_DEL_422_DE_COLUMNAS) !== -1
}

export default {
	methods: {
		/**
		 * "Volver al diseño de siempre": las cajas vuelven a lo que imprime el PDF de siempre (el
		 * diseño derivado del catálogo) y la hoja a A4 con 5 mm. Pregunta antes; nada se guarda hasta
		 * Guardar, y si se guarda sin tocar más, viaja `page_layout: null` (ver datos_para_guardar).
		 *
		 * @returns {void}
		 */
		volver_al_de_siempre() {
			let self = this

			if (this.es_ticket) {
				this.volver_al_ticket_de_siempre()
				return
			}

			this.$bvModal.msgBoxConfirm('Las cajas, el pie y la hoja vuelven a como imprime el PDF de siempre (hoja A4, margen de 5 mm). El encabezado y las columnas de la tabla no cambian, y nada se guarda hasta que toques Guardar.', {
				title: '¿Volver al diseño de siempre?',
				okTitle: 'Volver al de siempre',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (!confirmado || !self.catalogo) {
					return
				}
				let estado = armar_estado(self.catalogo.diseno_derivado, self.catalogo)
				self.superior = estado.superior
				self.pie = estado.pie
				self.hoja = {
					ancho: HOJA_DE_SIEMPRE.ancho,
					alto: HOJA_DE_SIEMPRE.alto,
					margen: HOJA_DE_SIEMPRE.margen,
				}
				self.seleccion = null
				self.base_es_de_siempre = true
				self.restablecido = true
				self.huella_base_del_diseno = self.huella_del_diseno_actual
			})
			.catch(function () {})
		},
		/**
		 * "Volver al ticket de siempre" (plan §7.3): las cajas vuelven al diseño derivado del catálogo
		 * (el equivalente al Ticket 2.0 de siempre), SIN tocar el ancho del rollo (se cambia en el
		 * formulario). Pregunta antes; nada se guarda hasta Guardar, y si se guarda sin tocar más,
		 * viaja `page_layout: null` (ver datos_para_guardar_del_ticket).
		 *
		 * Las columnas de la tabla no cambian, pero lo que se les haya tocado hasta acá deja de
		 * contar para pasar a cajas (D10): el ticket de siempre no las usa, así que se guardan igual
		 * sin volver a imprimir con cajas.
		 *
		 * @returns {void}
		 */
		volver_al_ticket_de_siempre() {
			let self = this

			this.$bvModal.msgBoxConfirm('Las cajas vuelven a como imprime el ticket de siempre. El ancho de la comandera y las columnas de la tabla no cambian, y nada se guarda hasta que toques Guardar.', {
				title: '¿Volver al ticket de siempre?',
				okTitle: 'Volver al de siempre',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (!confirmado || !self.catalogo) {
					return
				}
				let estado = armar_estado(self.catalogo.diseno_derivado, self.catalogo)
				self.superior = estado.superior
				self.pie = estado.pie
				self.seleccion = null
				self.base_es_de_siempre = true
				self.restablecido = true
				self.huella_base_del_diseno = self.huella_del_diseno_actual
				self.huella_de_la_tabla_para_cajas = self.huella_de_la_tabla_actual
			})
			.catch(function () {})
		},
		/**
		 * El ancho disponible para las columnas con la hoja GUARDADA, con la misma cuenta que la API
		 * (PdfColumnProfileHelper::ancho_disponible_mm: imprimible − 2 × margen, margen 5 si no hay).
		 * Es contra lo que la API compara la tabla cuando el PUT no trae hoja. Sin imprimible (0 o
		 * menos), la API no compara: Infinity.
		 *
		 * @returns {number}
		 */
		ancho_disponible_guardado() {
			let imprimible = parseInt(this.model.printable_width_mm, 10) || 0
			let margen_vacio = this.model.margin_mm === null || typeof this.model.margin_mm == 'undefined' || this.model.margin_mm === ''
			let margen = margen_vacio ? 5 : (parseInt(this.model.margin_mm, 10) || 0)
			let disponible = imprimible - (2 * margen)
			return disponible > 0 ? disponible : Infinity
		},
		/**
		 * Lo que viaja al guardar, o null si no se puede guardar (ya se avisó por qué).
		 *
		 * 🔴 `page_layout` viaja SOLO si lo que se tocó pasa el perfil a cajas (el lienzo o la hoja;
		 * la tabla solo donde eso cuenta, D10: ver cambio_que_pasa_a_cajas), o `null` al volver al
		 * diseño de siempre (plan §8.3). Con solo el encabezado tocado en un perfil de siempre, no
		 * viaja: cambiar el encabezado no puede pasar un perfil al dibujo con cajas (mismo criterio
		 * que "renombrar no congela" de Diseños de Vender). La hoja viaja junto con el diseño
		 * (printable = ancho de la hoja).
		 *
		 * La tabla (`pdf_column_options` completo, plan §7.2) viaja si cambió (columnas, orden,
		 * anchos, salto, o el ancho útil: cambiar la hoja recalcula los mm, D9), y también si la hoja
		 * que se guarda no deja entrar los mm que tiene guardados (la API rechazaría con 422; en la
		 * grilla las columnas siempre entran). Y al revés: si viaja la tabla sin hoja y en la hoja
		 * GUARDADA no entra (un perfil de siempre viejo con imprimible de comandera, por ejemplo),
		 * viaja también la hoja que se ve.
		 *
		 * @returns {Object|null}
		 */
		datos_para_guardar() {
			if (this.es_ticket) {
				return this.datos_para_guardar_del_ticket()
			}

			let datos = {}
			let hoja = null

			if (this.sigue_de_siempre) {
				if (this.restablecido && this.tenia_diseno) {
					datos.page_layout = null
					hoja = this.hoja_de_siempre_para_guardar()
				}
			} else if (this.cambio_que_pasa_a_cajas) {
				datos.page_layout = serializar(this.estado_de_trabajo, this.limites)
				hoja = {
					ancho: this.hoja.ancho,
					alto: this.hoja.alto,
					margen: this.hoja.margen,
				}
			}

			let util_que_queda = hoja ? ancho_util({ ancho: hoja.ancho, margen: hoja.margen }) : null
			let la_hoja_no_deja_entrar = util_que_queda !== null && this.suma_mm_de_la_base > util_que_queda
			let mandar_tabla = this.tabla.columnas.length > 0 && (this.tabla_cambiada || la_hoja_no_deja_entrar)

			if (mandar_tabla) {
				datos.pdf_column_options = opciones_para_guardar(this.tabla.columnas, this.tabla.visibles, this.ancho_util_de_la_tabla_mm, this.total_de_la_tabla)

				if (!hoja && suma_mm_visible(datos.pdf_column_options) > this.ancho_disponible_guardado()) {
					hoja = this.sigue_de_siempre ? this.hoja_de_siempre_para_guardar() : {
						ancho: this.hoja.ancho,
						alto: this.hoja.alto,
						margen: this.hoja.margen,
					}
				}
			}

			if (hoja) {
				datos.paper_width_mm = hoja.ancho
				datos.printable_width_mm = hoja.ancho
				datos.margin_mm = hoja.margen
				datos.paper_height_mm = hoja.alto
			}

			if (this.emisor_tocado) {
				datos.header_layout = {
					emisor: {
						izquierda: this.encabezado.emisor.izquierda.slice(),
						derecha: this.encabezado.emisor.derecha.slice(),
					},
					receptor: {
						izquierda: this.encabezado.receptor.izquierda.slice(),
					},
				}
			}

			if (this.logo_tocado) {
				datos.logo_size_mm = Number(this.logo_size_mm)
			}

			return datos
		},
		/**
		 * Lo que viaja al guardar un ticket de comandera (plan §7.3).
		 *
		 * - `page_layout`: igual que en la hoja (solo si lo tocado pasa el perfil a cajas, o null al
		 *   volver al ticket de siempre), con una diferencia: en el ticket tocar la tabla TAMBIÉN pasa
		 *   a cajas (D10, ver cambio_que_pasa_a_cajas).
		 * - La tabla (`pdf_column_options` completo) si cambió, con los milímetros contra el ancho del
		 *   rollo (D9: la "hoja" del ticket es {ancho del rollo, margen 0}).
		 * - NADA de la hoja (ni formatos ni margen: la API fuerza los del rollo) ni del encabezado
		 *   (`header_layout`, `logo_size_mm`: el ticket no tiene encabezado aparte, D6).
		 *
		 * @returns {Object}
		 */
		datos_para_guardar_del_ticket() {
			let datos = {}

			if (this.sigue_de_siempre) {
				if (this.restablecido && this.tenia_diseno) {
					datos.page_layout = null
				}
			} else if (this.cambio_que_pasa_a_cajas) {
				datos.page_layout = serializar(this.estado_de_trabajo, this.limites)
			}

			if (this.tabla.columnas.length && this.tabla_cambiada) {
				datos.pdf_column_options = opciones_para_guardar(this.tabla.columnas, this.tabla.visibles, this.ancho_util_de_la_tabla_mm, this.total_de_la_tabla)
			}

			return datos
		},
		/**
		 * Si el pedido de guardar tiene que llevar el `sheet_type_id` del formulario (solo venta): el
		 * formulario cambió "Hoja o comandera" y no lo guardó, así que el guardado no es el que se ve.
		 *
		 * Por qué: el lienzo se armó con el catálogo del tipo de hoja del FORMULARIO (hoja o ticket, y
		 * en el ticket los milímetros de las columnas se convierten contra ESE ancho), pero la API
		 * normaliza el diseño con el tipo de hoja del pedido o, si no viene, con el guardado. Sin
		 * mandarlo, un ticket se guardaría normalizado como hoja (o al revés) y, al guardar después el
		 * formulario con el cambio de clase y el mismo diseño, la API lo dejaría en null (contrato
		 * §3.2). Es el mismo criterio que `is_afip_ticket`.
		 *
		 * Si el guardado no se pudo leer: en un ticket va igual (es el que da sentido a los
		 * milímetros); en una hoja no (todo queda como antes de esta misión).
		 *
		 * @returns {boolean}
		 */
		hay_que_mandar_el_tipo_de_hoja() {
			if (this.modelo_del_perfil !== 'sale' || !Object.prototype.hasOwnProperty.call(this.model, 'sheet_type_id')) {
				return false
			}
			let del_formulario = this.model.sheet_type_id === null || typeof this.model.sheet_type_id == 'undefined' ? null : this.model.sheet_type_id
			if (typeof this.tipo_de_hoja_guardado == 'undefined') {
				return this.es_ticket && del_formulario !== null
			}
			return String(del_formulario) !== String(this.tipo_de_hoja_guardado)
		},
		/**
		 * La hoja que se guarda con un perfil de siempre: la A4 de 5 mm que imprime el PDF de siempre,
		 * con el alto en null (plan §8.3, como "Volver al diseño de siempre").
		 *
		 * @returns {{ancho: number, alto: null, margen: number}}
		 */
		hoja_de_siempre_para_guardar() {
			return {
				ancho: HOJA_DE_SIEMPRE.ancho,
				alto: null,
				margen: HOJA_DE_SIEMPRE.margen,
			}
		},
		/**
		 * Guardar diseño.
		 *
		 * - Sin cambios: cierra.
		 * - Perfil nuevo (sin id): lo deja en el formulario ($set) y avisa que falta guardar el diseño
		 *   de PDF (el POST del ABM lo lleva).
		 * - Perfil existente: PUT con lo que cambió, copia lo guardado al formulario y al store, y el
		 *   diseñador QUEDA ABIERTO sin cambios pendientes, para poder ver enseguida el PDF de prueba.
		 *
		 * @returns {void}
		 */
		guardar() {
			let self = this

			if (this.guardando || !this.catalogo) {
				return
			}

			/* El Modelo del formulario no es el guardado: primero se guarda el diseño de PDF */
			if (this.modelo_cambiado_sin_guardar) {
				avisar(this, 'error', AVISO_MODELO_SIN_GUARDAR)
				return
			}

			/* Una factura de ARCA que llegó guardada en A5 no se guarda hasta elegir otra hoja */
			if (this.arca_no_entra_en_la_hoja) {
				avisar(this, 'error', MOTIVO_A5_EN_ARCA + ' Elegí otra hoja para poder guardar.')
				return
			}

			if (!this.hay_cambios) {
				this.cerrar(true)
				return
			}

			let datos = this.datos_para_guardar()
			if (datos === null) {
				return
			}

			if (!Object.keys(datos).length) {
				this.cerrar(true)
				return
			}

			/*
				Perfil nuevo: todo lo que viaja (la tabla incluida) queda en el formulario con $set, y lo
				lleva el POST del ABM. El editor del formulario ve cambiar `pdf_column_options` y rearma
				sus filas desde ahí (PdfColumnProfileEditor.vue), así no pisa la tabla con las suyas.
			*/
			if (!this.model.id) {
				Object.keys(datos).forEach(function (clave) {
					self.$set(self.model, clave, datos[clave])
				})
				avisar(this, 'success', 'Diseño aplicado. Guardá el diseño de PDF para que quede.')
				this.cerrar(true)
				return
			}

			/*
				🔴 Guardar el diseño guarda también "Es factura de ARCA" del formulario (solo venta): el
				lienzo se armó con ese check -- los bloques fijos de ARCA y su cuadro de importes -- y la
				API normaliza el diseño con el `is_afip_ticket` del pedido si viene, si no con el guardado.
				Sin mandarlo, con el check cambiado y sin guardar, los bloques perdían su lugar y "sin
				cuadro de importes" se volvía a prender.
			*/
			if (this.modelo_del_perfil === 'sale') {
				datos.is_afip_ticket = es_verdadero(this.model.is_afip_ticket)
			}

			/* Y "Hoja o comandera" del formulario, si se cambió y no se guardó (ver hay_que_mandar_el_tipo_de_hoja) */
			if (this.hay_que_mandar_el_tipo_de_hoja()) {
				datos.sheet_type_id = this.model.sheet_type_id
			}

			this.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando el diseño de PDF')
			this.$store.commit('auth/setLoading', true)

			guardar_diseno(this, this.model.id, datos)
			.then(function (respuesta) {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let guardado = respuesta && respuesta.data ? respuesta.data.model : null
				self.aplicar_lo_guardado(datos, guardado)
				let como_verlo = self.es_ticket ? '«Ver cómo sale»' : '«Ver un PDF de prueba»'
				avisar(self, 'success', self.se_puede_probar ? 'Diseño guardado. Ya podés verlo con ' + como_verlo + '.' : 'Diseño guardado.')
			})
			.catch(function (error) {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(error)

				let mensaje = mensaje_de_error(error, 'No se pudo guardar el diseño. Revisá tu conexión y volvé a intentar.')
				/*
					El 422 de "La suma de los anchos visibles…": queda como red. En la grilla de medias
					columnas las columnas siempre entran en la hoja que se ve, y si la tabla viaja sin hoja
					contra una hoja guardada más angosta, viaja también la hoja (datos_para_guardar). Si
					igual llega, se dice dónde mirar.
				*/
				if (es_el_422_de_columnas(error, mensaje)) {
					mensaje += ' Achicá alguna columna de la tabla y volvé a guardar.'
				}
				avisar(self, 'error', mensaje)
			})
		},
		/**
		 * Después de un PUT: lo que devolvió la API es la verdad (pedido de la sesión madre): la API
		 * normaliza el diseño (recorta textos, acota tamaños, genera ids si faltan) y el encabezado.
		 *
		 * - Las claves del diseño (CLAVES_DEL_DISENO) se copian al formulario desde la respuesta
		 *   (`res.data.model`), y la respuesta va al store. Sin respuesta, lo que se mandó.
		 * - Si el `page_layout` guardado no es el mismo que se ve, el lienzo se rearma desde él (y se
		 *   pierde la selección); la hoja y el encabezado se vuelven a leer del perfil. Así la huella
		 *   de "sin cambios" se toma de lo que quedó guardado de verdad.
		 * - Si viajó la tabla, `pdf_column_options` también se copia de la respuesta (el editor del
		 *   formulario rearma sus filas al verlo cambiar) y la tabla se rearma desde ahí, contra la
		 *   hoja que quedó: lo guardado es la base.
		 *
		 * @param {Object} datos lo que se mandó
		 * @param {Object|null} guardado el `model` de la respuesta
		 * @returns {void}
		 */
		aplicar_lo_guardado(datos, guardado) {
			let self = this
			let fuente = guardado || datos

			CLAVES_DEL_DISENO.forEach(function (clave) {
				if (Object.prototype.hasOwnProperty.call(fuente, clave)) {
					self.$set(self.model, clave, fuente[clave])
				}
			})

			if (guardado) {
				this.$store.commit('pdf_column_profile/add', guardado)
			}

			/* Si viajó el tipo de hoja del formulario, ese es ahora el guardado */
			if (Object.prototype.hasOwnProperty.call(datos, 'sheet_type_id')) {
				this.tipo_de_hoja_guardado = guardado && Object.prototype.hasOwnProperty.call(guardado, 'sheet_type_id') ? guardado.sheet_type_id : datos.sheet_type_id
			}

			this.tenia_diseno = tiene_diseno(this.model.page_layout)

			/* El lienzo desde el diseño guardado, si difiere del que se ve (con null queda el derivado) */
			if (this.tenia_diseno) {
				let estado = armar_estado(this.model.page_layout, this.catalogo)
				if (JSON.stringify(serializar(estado, this.limites)) !== JSON.stringify(serializar(this.estado_de_trabajo, this.limites))) {
					this.superior = estado.superior
					this.pie = estado.pie
					this.seleccion = null
				}
			}

			/* En un ticket, el rollo del catálogo; en una hoja, la que quedó guardada */
			this.hoja = this.hoja_de_trabajo(this.tenia_diseno)
			this.armar_encabezado()

			/* La tabla: si viajó, lo que devolvió la API (con su pivot) es la verdad */
			if (Object.prototype.hasOwnProperty.call(datos, 'pdf_column_options')) {
				let opciones = guardado && Array.isArray(guardado.pdf_column_options) ? guardado.pdf_column_options : datos.pdf_column_options
				this.$set(this.model, 'pdf_column_options', opciones)
				this.armar_la_tabla(this.opciones_de_columnas)
				if (this.seleccion && this.seleccion.tipo === 'columna') {
					this.seleccion = null
				}
			}

			this.base_es_de_siempre = !this.tenia_diseno
			this.restablecido = false
			this.tomar_bases()
		},
		/**
		 * El botón de probar: "Ver cómo sale" en un ticket, "Ver un PDF de prueba" en una hoja.
		 *
		 * @returns {void}
		 */
		probar_el_diseno() {
			if (this.es_ticket) {
				this.ver_como_sale()
				return
			}
			this.ver_pdf_de_prueba()
		},
		/**
		 * "Ver cómo sale" (ticket de comandera, plan §7.3): con el perfil guardado y sin cambios
		 * pendientes (el botón se deshabilita con cambios), pide a la API el ticket de la venta de
		 * prueba del catálogo armado con este perfil, en texto (`formato=texto`), y lo muestra en un
		 * modal. Si el perfil todavía imprime el ticket de siempre, la API lo arma con el derivado y
		 * contesta `disenado: false` (el modal lo avisa).
		 *
		 * @returns {void}
		 */
		ver_como_sale() {
			let self = this
			let comprobante = this.catalogo ? this.catalogo.comprobante_de_prueba : null

			if (!comprobante || !comprobante.id || !this.model.id || this.hay_cambios) {
				return
			}

			this.como_sale = {
				cargando: true,
				error: null,
				disenado: false,
				ancho_mm: this.ancho_del_rollo_mm,
				caracteres: this.caracteres_del_rollo,
				lineas: [],
			}
			this.$refs.como_sale.show()

			traer_ticket_en_texto(this, comprobante.id, {
				pdf_column_profile_id: this.model.id,
				afip_ticket_id: comprobante.afip_ticket_id || null,
			})
			.then(function (respuesta) {
				let datos = respuesta && respuesta.data ? respuesta.data : null
				if (!datos || !Array.isArray(datos.lineas)) {
					self.como_sale.cargando = false
					self.como_sale.error = 'La respuesta del servidor no tiene la forma esperada. Probá de nuevo en un rato.'
					return
				}
				let ancho = parseInt(datos.ancho_mm, 10) > 0 ? parseInt(datos.ancho_mm, 10) : self.ancho_del_rollo_mm
				let caracteres = parseInt(datos.caracteres_por_renglon, 10) > 0 ? parseInt(datos.caracteres_por_renglon, 10) : caracteres_por_renglon(ancho)
				self.como_sale = {
					cargando: false,
					error: null,
					disenado: datos.disenado === true,
					ancho_mm: ancho,
					caracteres: caracteres,
					lineas: datos.lineas.filter(function (linea) {
						return typeof linea == 'string'
					}),
				}
			})
			.catch(function (error) {
				console.log(error)
				let estado = error && error.response ? error.response.status : null
				self.como_sale.cargando = false
				if (estado === 404) {
					self.como_sale.error = 'El servidor todavía no muestra cómo sale el ticket: se habilita cuando se actualice el sistema.'
					return
				}
				self.como_sale.error = mensaje_de_error(error, 'No se pudo armar el ticket. Revisá tu conexión y volvé a intentar.')
			})
		},
		/**
		 * "Ver un PDF de prueba": abre el PDF del último comprobante del negocio con este diseño (lo
		 * guardado). Las rutas son las de siempre de cada comprobante (plan §8.3).
		 *
		 * @returns {void}
		 */
		ver_pdf_de_prueba() {
			let comprobante = this.catalogo ? this.catalogo.comprobante_de_prueba : null
			if (!comprobante || !this.model.id) {
				return
			}

			let base = env('VUE_APP_API_URL')
			let perfil = 'pdf_column_profile_id=' + this.model.id
			let url = ''

			if (this.modelo_del_perfil === 'sale') {
				url = base + '/sale/pdf/' + comprobante.id + '?' + perfil
				if (comprobante.afip_ticket_id) {
					url += '&afip_ticket_id=' + comprobante.afip_ticket_id
				}
			} else if (this.modelo_del_perfil === 'budget') {
				url = base + '/budget/pdf/' + comprobante.id + '/1/0?' + perfil
			} else {
				url = base + '/order/pdf/' + comprobante.id + '?' + perfil
			}

			window.open(url)
		},
	},
}
