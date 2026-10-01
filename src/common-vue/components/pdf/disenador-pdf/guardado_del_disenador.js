/*
	Guardado del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).

	Mixin de componente de disenador-pdf/Index.vue (no es global): "Volver al diseño de siempre",
	qué viaja al guardar (y qué no: page_layout solo si el lienzo o la hoja se tocaron, plan §8.3),
	el PUT, lo que se copia al formulario después y "Ver un PDF de prueba". Usa los datos y los
	computeds de Index.vue (estado_de_trabajo, hoja, sigue_de_siempre, diseno_tocado...).

	Los nombres se chequearon contra los mixins globales: ninguno pisa a uno de ellos.
*/
import {
	HOJA_DE_SIEMPRE,
	MOTIVO_A5_EN_ARCA,
	armar_estado,
	serializar,
	tiene_diseno,
	ancho_util,
	hoja_del_perfil,
} from './estado_del_disenador'
import { guardar_diseno, mensaje_de_error } from './api_del_disenador'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'
import { env } from '@/runtime_config'

/* Lo que el diseñador guarda del perfil: lo único que copia al formulario después de guardar */
const CLAVES_DEL_DISENO = ['page_layout', 'paper_width_mm', 'printable_width_mm', 'margin_mm', 'paper_height_mm', 'header_layout', 'logo_size_mm']

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

			this.$bvModal.msgBoxConfirm('Las cajas, el pie y la hoja vuelven a como imprime el PDF de siempre (hoja A4, margen de 5 mm). El encabezado no cambia, y nada se guarda hasta que toques Guardar.', {
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
		 * Lo que viaja al guardar, o null si no se puede guardar (ya se avisó por qué).
		 *
		 * 🔴 `page_layout` viaja SOLO si el lienzo o la hoja se tocaron, o `null` al volver al
		 * diseño de siempre (plan §8.3). Con solo el encabezado tocado en un perfil de siempre, no
		 * viaja: cambiar el encabezado no puede pasar un perfil al dibujo con cajas (mismo criterio
		 * que "renombrar no congela" de Diseños de Vender). La hoja viaja junto con el diseño
		 * (printable = ancho de la hoja), y antes se chequea que las columnas entren (la API lo
		 * valida igual, con un 422).
		 *
		 * @returns {Object|null}
		 */
		datos_para_guardar() {
			let datos = {}
			let hoja = null

			if (this.sigue_de_siempre) {
				if (this.restablecido && this.tenia_diseno) {
					datos.page_layout = null
					hoja = {
						ancho: HOJA_DE_SIEMPRE.ancho,
						alto: null,
						margen: HOJA_DE_SIEMPRE.margen,
					}
				}
			} else if (this.diseno_tocado) {
				datos.page_layout = serializar(this.estado_de_trabajo, this.limites)
				hoja = {
					ancho: this.hoja.ancho,
					alto: this.hoja.alto,
					margen: this.hoja.margen,
				}
			}

			if (hoja) {
				let util = ancho_util({ ancho: hoja.ancho, margen: hoja.margen })
				if (this.suma_de_columnas_mm > util) {
					/* Volviendo al diseño de siempre la hoja es fija (A4): solo queda achicar columnas */
					let que_hacer = datos.page_layout === null
						? 'Achicá columnas en "Columnas del PDF" antes de volver al diseño de siempre (A4 con 5 mm de margen).'
						: 'Achicá columnas en "Columnas del PDF", o elegí una hoja más ancha o menos margen.'
					avisar(this, 'error', 'Las columnas de la tabla suman ' + this.suma_de_columnas_mm + ' mm y en esta hoja entran ' + util + ' mm. ' + que_hacer)
					return null
				}
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

			if (!this.model.id) {
				Object.keys(datos).forEach(function (clave) {
					self.$set(self.model, clave, datos[clave])
				})
				avisar(this, 'success', 'Diseño aplicado. Guardá el diseño de PDF para que quede.')
				this.cerrar(true)
				return
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
				avisar(self, 'success', self.se_puede_probar ? 'Diseño guardado. Ya podés verlo con «Ver un PDF de prueba».' : 'Diseño guardado.')
			})
			.catch(function (error) {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(error)
				avisar(self, 'error', mensaje_de_error(error, 'No se pudo guardar el diseño. Revisá tu conexión y volvé a intentar.'))
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

			this.hoja = hoja_del_perfil(this.model, this.tenia_diseno, this.limites)
			this.armar_encabezado()

			this.base_es_de_siempre = !this.tenia_diseno
			this.restablecido = false
			this.tomar_bases()
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
