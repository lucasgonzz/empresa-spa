<template>
	<!--
		Tarjeta del Diseño de PDF en el formulario del ABM (misión diseno-ticket-comandera, 9/10/2026;
		plan §7.1 y D13): en el lugar donde estaba la tabla de "Columnas del PDF" (venta, presupuesto y
		pedido online), la miniatura del diseño como se va a imprimir, su nombre, si imprime con el
		diseño de siempre o con cajas, y "Tocá para diseñarlo". Como las tarjetas de Diseños de Vender.

		Toda la parte de arriba (miniatura + textos) es UN botón (role="button", con tabindex): un
		clic, Enter o Espacio abre el diseñador. El botón "Diseñar PDF" de abajo hace lo mismo y queda
		por compatibilidad (data-testid="abrir-disenador-pdf"); va fuera del botón de arriba para no
		anidar controles.

		La tarjeta pide ella misma el catálogo del diseñador (page-layout-catalog) para dibujar el
		diseño derivado de un perfil que todavía no se diseñó: una vez al montarse y de nuevo cuando
		cambian el Modelo, el perfil, "Es factura de ARCA" o el tipo de hoja del formulario. Lo demás
		(page_layout, columnas, hoja) lo lee del `model` del formulario, así se redibuja sola cuando el
		diseñador guarda.
	-->
	<div
	class="tarjeta-pdf"
	:class="{ 'tarjeta-pdf--rollo': es_rollo }"
	data-testid="tarjeta-disenador-pdf">
		<div
		class="tarjeta-pdf__abrir"
		role="button"
		tabindex="0"
		:aria-label="'Diseñar el PDF ' + nombre + '. ' + estado + '.'"
		@click="abrir"
		@keydown.enter.prevent="abrir"
		@keydown.space.prevent="abrir">
			<div class="tarjeta-pdf__vista">
				<miniatura-pdf
				:page_layout="model.page_layout"
				:pdf_column_options="opciones_del_perfil"
				:catalogo="catalogo"
				:hoja="hoja"
				:rollo="es_rollo"></miniatura-pdf>
			</div>

			<div class="tarjeta-pdf__cuerpo">
				<span class="tarjeta-pdf__tipo">{{ tipo }}</span>
				<span
				class="tarjeta-pdf__nombre"
				:title="nombre">{{ nombre }}</span>
				<span
				class="tarjeta-pdf__estado"
				:class="{ 'tarjeta-pdf__estado--cajas': con_cajas }">
					<i
					class="bi"
					:class="con_cajas ? 'bi-grid-1x2' : 'bi-file-earmark-text'"
					aria-hidden="true"></i>
					{{ estado }}
				</span>
				<span class="tarjeta-pdf__detalle">{{ detalle }}</span>
				<span class="tarjeta-pdf__accion">
					<i
					class="bi bi-hand-index-thumb"
					aria-hidden="true"></i>
					Tocá para diseñarlo
				</span>
			</div>
		</div>

		<div class="tarjeta-pdf__pie">
			<b-button
			size="sm"
			variant="outline-primary"
			class="tarjeta-pdf__boton"
			data-testid="abrir-disenador-pdf"
			@click="abrir">
				<i class="icon-configuration"></i>
				Diseñar PDF
			</b-button>
		</div>
	</div>
</template>
<script>
import MiniaturaPdf from './Index.vue'
import { traer_catalogo } from '../disenador-pdf/api_del_disenador'
import {
	catalogo_valido,
	tiene_diseno,
	hoja_del_perfil,
	formato_de_hoja,
	es_verdadero,
} from '../disenador-pdf/estado_del_disenador'
import { pivot_es_visible } from '../disenador-pdf/tabla_del_disenador'

/* Los modelos que se diseñan con el diseñador de PDF (los demás no tienen catálogo de cajas) */
const MODELOS_CON_DISENADOR = ['sale', 'budget', 'order']

/* Límites del margen mientras el catálogo no llegó (los mismos de DisenoDePaginaPdf) */
const LIMITES_POR_DEFECTO = {
	margen_min: 0,
	margen_max: 20,
}

/**
 * Tarjeta del Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026). Emite `abrir` (el editor del
 * formulario abre el diseñador). Ofrece `recargar()` para volver a pedir el catálogo.
 */
export default {
	name: 'TarjetaDelPdf',
	components: {
		MiniaturaPdf,
	},
	props: {
		/* El pdf_column_profile del formulario del ABM (el mismo objeto que edita el diseñador) */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/* Respuesta de page-layout-catalog, o null mientras no llegó (o si falló) */
			catalogo: null,
			/* Número del último pedido: una respuesta de un pedido viejo se ignora */
			pedido_en_curso: 0,
		}
	},
	computed: {
		/**
		 * Lo que se le pide al catálogo: el Modelo, el perfil (si ya existe), "Es factura de ARCA" y
		 * el tipo de hoja del formulario si lo tiene (contrato §3.3: puede no estar guardado).
		 *
		 * @returns {Object|null} null si el Modelo no se diseña con cajas
		 */
		parametros_del_catalogo() {
			let modelo = this.model ? this.model.model_name : null
			if (MODELOS_CON_DISENADOR.indexOf(modelo) === -1) {
				return null
			}
			let parametros = {
				model_name: modelo,
				is_afip_ticket: es_verdadero(this.model.is_afip_ticket) ? 1 : 0,
			}
			if (this.model.id) {
				parametros.profile_id = this.model.id
			}
			if (this.model.sheet_type_id) {
				parametros.sheet_type_id = this.model.sheet_type_id
			}
			return parametros
		},
		/**
		 * Clave de los parámetros: si cambia, se vuelve a pedir el catálogo.
		 *
		 * @returns {string}
		 */
		clave_del_catalogo() {
			return JSON.stringify(this.parametros_del_catalogo)
		},
		/**
		 * Si el perfil es un ticket de comandera (lo dice el catálogo: contrato §3.3). Con una API
		 * vieja o sin catálogo, hoja.
		 *
		 * @returns {boolean}
		 */
		es_rollo() {
			return !!(this.catalogo && this.catalogo.es_ticket)
		},
		/**
		 * Si el perfil imprime con cajas (tiene page_layout).
		 *
		 * @returns {boolean}
		 */
		con_cajas() {
			return tiene_diseno(this.model.page_layout)
		},
		/**
		 * La hoja que se dibuja: la del diseñador (la guardada si tiene diseño, la A4 de siempre si
		 * no); en un ticket, el ancho del rollo.
		 *
		 * @returns {{ancho: number, alto: number, margen: number}}
		 */
		hoja() {
			if (this.es_rollo) {
				let ancho = parseInt(this.catalogo.ancho_mm, 10) || 80
				return {
					ancho: ancho,
					alto: 0,
					margen: 0,
				}
			}
			let limites = this.catalogo && this.catalogo.limites ? this.catalogo.limites : LIMITES_POR_DEFECTO
			return hoja_del_perfil(this.model, this.con_cajas, limites)
		},
		/**
		 * Las columnas del perfil (las del formulario: si el diseñador las cambió, ya están acá).
		 *
		 * @returns {Array}
		 */
		opciones_del_perfil() {
			return Array.isArray(this.model.pdf_column_options) ? this.model.pdf_column_options : []
		},
		/**
		 * El nombre del diseño, o "Diseño nuevo".
		 *
		 * @returns {string}
		 */
		nombre() {
			let nombre = String(this.model.name || '').trim()
			return nombre || 'Diseño nuevo'
		},
		/**
		 * Qué comprobante es (la línea chica de arriba del nombre).
		 *
		 * @returns {string}
		 */
		tipo() {
			let modelo = this.model.model_name
			if (modelo === 'budget') {
				return 'PDF de presupuesto'
			}
			if (modelo === 'order') {
				return 'PDF de pedido online'
			}
			let cual = es_verdadero(this.model.is_afip_ticket) ? 'factura de ARCA' : 'remito'
			return (this.es_rollo ? 'Ticket de venta · ' : 'PDF de venta · ') + cual
		},
		/**
		 * Si imprime con el diseño de siempre o con cajas (el texto de siempre del editor).
		 *
		 * @returns {string}
		 */
		estado() {
			return this.con_cajas ? 'Diseño armado con cajas' : 'Diseño de siempre'
		},
		/**
		 * La hoja (o el rollo) y cuántas columnas tiene la tabla.
		 *
		 * @returns {string}
		 */
		detalle() {
			let partes = []
			if (this.es_rollo) {
				partes.push('Comandera de ' + this.hoja.ancho + ' mm')
			} else {
				let formato = this.catalogo ? formato_de_hoja(this.catalogo.formatos_de_hoja, this.hoja.ancho, this.hoja.alto) : null
				partes.push(formato ? formato.nombre : 'Hoja de ' + this.hoja.ancho + ' × ' + this.hoja.alto + ' mm')
			}
			let columnas = this.opciones_del_perfil.filter(function (opcion) {
				return opcion && pivot_es_visible(opcion.pivot)
			}).length
			partes.push(columnas + (columnas === 1 ? ' columna en la tabla' : ' columnas en la tabla'))
			return partes.join(' · ')
		},
	},
	watch: {
		/**
		 * Cambiaron el Modelo, el perfil, "Es factura de ARCA" o el tipo de hoja: se vuelve a pedir el
		 * catálogo (al montarse también, por el immediate).
		 */
		clave_del_catalogo: {
			immediate: true,
			handler() {
				this.recargar()
			},
		},
	},
	methods: {
		/**
		 * Pide el catálogo del diseñador para dibujar. Es decorativo: si falla (API vieja, sin
		 * conexión), la miniatura dibuja lo que pueda (el diseño del perfil, la tabla y el
		 * encabezado) y nadie ve un error. Una respuesta de un pedido viejo se ignora.
		 *
		 * @returns {void}
		 */
		recargar() {
			let self = this
			let parametros = this.parametros_del_catalogo

			if (!parametros) {
				this.catalogo = null
				return
			}

			let pedido = this.pedido_en_curso + 1
			this.pedido_en_curso = pedido

			traer_catalogo(this, parametros)
			.then(function (respuesta) {
				if (pedido !== self.pedido_en_curso) {
					return
				}
				let catalogo = respuesta ? respuesta.data : null
				self.catalogo = catalogo_valido(catalogo) ? catalogo : null
			})
			.catch(function (error) {
				if (pedido !== self.pedido_en_curso) {
					return
				}
				console.log('tarjeta del diseño de PDF: no se pudo leer el catálogo', error)
				self.catalogo = null
			})
		},
		/**
		 * Abre el diseñador (lo hace el editor del formulario, que tiene el modal).
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$emit('abrir')
		},
	},
}
</script>
<style lang="sass">
// Tarjeta calma, como las de Diseños de Vender: borde sutil por token, radio de 12px y sin sombra en
// reposo. Colores solo por token.
.tarjeta-pdf
	display: flex
	flex-direction: column
	width: 100%
	max-width: 560px
	min-width: 0
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	overflow: hidden
	transition: border-color .15s ease, box-shadow .15s ease

	&:hover
		border-color: var(--color-border-tertiary, var(--color-border))
		box-shadow: 0 4px 14px var(--shadow-color)

// La parte que abre el diseñador: la miniatura a la izquierda y los textos a la derecha
.tarjeta-pdf__abrir
	display: flex
	align-items: stretch
	min-width: 0
	cursor: pointer

	&:focus
		outline: none

	&:focus-visible
		box-shadow: inset 0 0 0 2px var(--color-primary)

	&:hover .tarjeta-pdf__accion
		color: var(--color-primary)

.tarjeta-pdf__vista
	display: flex
	align-items: flex-start
	justify-content: center
	flex: 0 0 150px
	padding: 14px 16px
	border-right: 1px solid var(--color-border-secondary)
	background: var(--bg-section)

.tarjeta-pdf__cuerpo
	display: flex
	flex-direction: column
	gap: 4px
	flex: 1 1 auto
	min-width: 0
	padding: 14px 16px

.tarjeta-pdf__tipo
	color: var(--color-text-secondary)
	font-size: 0.7rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.03em

.tarjeta-pdf__nombre
	color: var(--color-text-primary)
	font-size: 0.95rem
	font-weight: 600
	line-height: 1.3
	overflow-wrap: anywhere

// "Diseño de siempre" / "Diseño armado con cajas": pastilla suave
.tarjeta-pdf__estado
	display: inline-flex
	align-items: center
	align-self: flex-start
	gap: 5px
	margin-top: 2px
	padding: 2px 10px
	border-radius: 999px
	background: var(--bg-section)
	color: var(--color-text-secondary)
	font-size: 0.74rem
	font-weight: 600

.tarjeta-pdf__estado--cajas
	background: var(--bg-nav-hover)
	color: var(--color-primary)

.tarjeta-pdf__detalle
	color: var(--color-text-secondary)
	font-size: 0.76rem
	line-height: 1.35

.tarjeta-pdf__accion
	display: inline-flex
	align-items: center
	gap: 6px
	margin-top: auto
	padding-top: 8px
	color: var(--color-text-secondary)
	font-size: 0.78rem
	font-weight: 600
	transition: color .15s ease

.tarjeta-pdf__pie
	display: flex
	justify-content: flex-end
	padding: 8px 16px
	border-top: 1px solid var(--color-border-secondary)

.tarjeta-pdf__boton.btn
	display: inline-flex
	align-items: center
	gap: 6px
	border-radius: 8px
	white-space: nowrap

// Teléfono: la miniatura más chica, los textos al lado igual
@media (max-width: 575.98px)
	.tarjeta-pdf__vista
		flex-basis: 112px
		padding: 12px

	.tarjeta-pdf__cuerpo
		padding: 12px
</style>
