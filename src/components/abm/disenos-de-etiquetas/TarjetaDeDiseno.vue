<template>
	<!--
		Tarjeta de un Diseño de etiqueta en la solapa del ABM (mision disenos-etiquetas-gondola,
		29/9/2026): la etiqueta dibujada arriba, con datos de un articulo real, y abajo el nombre, el
		tamaño y las acciones. Mismo dibujo que las tarjetas de los Diseños de Vender.

		Un clic en cualquier parte abre el editor; las acciones frenan el clic para no abrirlo ademas de
		hacer lo suyo. Por teclado, el camino es el boton "Editar".
	-->
	<article
	class="tarjeta-de-etiqueta"
	@click="$emit('editar')">

		<div
		ref="vista"
		class="tarjeta-de-etiqueta__vista">
			<etiqueta-dibujada
			:diseno="diseno"
			:zoom="zoom"
			:muestra="muestra"
			:listas="listas"></etiqueta-dibujada>
		</div>

		<div class="tarjeta-de-etiqueta__cuerpo">
			<h3
			class="tarjeta-de-etiqueta__nombre"
			:title="modelo.name">{{ modelo.name }}</h3>

			<p class="tarjeta-de-etiqueta__detalle">{{ detalle }}</p>

			<div
			class="tarjeta-de-etiqueta__acciones"
			@click.stop>
				<b-button
				size="sm"
				variant="outline-secondary"
				class="tarjeta-de-etiqueta__boton"
				:aria-label="'Editar el diseño ' + modelo.name"
				@click="$emit('editar')">
					<i class="bi bi-pencil"></i>
					Editar
				</b-button>

				<span class="tarjeta-de-etiqueta__iconos">
					<button
					type="button"
					class="tarjeta-de-etiqueta__icono"
					title="Duplicar"
					:aria-label="'Duplicar el diseño ' + modelo.name"
					@click="$emit('duplicar')">
						<i class="bi bi-copy"></i>
					</button>
					<button
					type="button"
					class="tarjeta-de-etiqueta__icono tarjeta-de-etiqueta__icono--peligro"
					title="Eliminar"
					:aria-label="'Eliminar el diseño ' + modelo.name"
					@click="$emit('eliminar')">
						<i class="bi bi-trash3"></i>
					</button>
				</span>
			</div>
		</div>
	</article>
</template>
<script>
import EtiquetaDibujada from './EtiquetaDibujada'
import { normalizar_diseno } from './diseno'
import { ancho_de_etiqueta, filas_por_hoja } from './geometria'

/* Lugar que tiene la miniatura en la tarjeta (px) */
const ANCHO_DE_LA_VISTA = 248
const ALTO_DE_LA_VISTA = 118

/* Zoom maximo de la miniatura (px por mm): una etiqueta chica no se agranda de mas */
const ZOOM_MAXIMO = 3.6

/**
 * Tarjeta de un Diseño de etiqueta. Solo muestra y avisa (`editar`, `duplicar`, `eliminar`): los
 * pedidos los hace la solapa.
 */
export default {
	name: 'TarjetaDeDisenoDeEtiqueta',
	components: {
		EtiquetaDibujada,
	},
	props: {
		/* El article_ticket_design */
		modelo: {
			type: Object,
			required: true,
		},
		/* Datos del articulo de muestra (muestra.js) */
		muestra: {
			type: Object,
			required: true,
		},
		/* Listas de precios del negocio */
		listas: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	computed: {
		/**
		 * El diseño listo para dibujar.
		 *
		 * @returns {Object}
		 */
		diseno() {
			return normalizar_diseno(this.modelo.diseno, this.modelo.price_type_id)
		},
		/**
		 * Zoom para que la etiqueta entre en la tarjeta.
		 *
		 * @returns {number}
		 */
		zoom() {
			let ancho = ancho_de_etiqueta(this.diseno.columnas)
			return Math.min(ANCHO_DE_LA_VISTA / ancho, ALTO_DE_LA_VISTA / this.diseno.alto_mm, ZOOM_MAXIMO)
		},
		/**
		 * "3 por fila · 21 por hoja · 66,7 × 40 mm".
		 *
		 * @returns {string}
		 */
		detalle() {
			let columnas = this.diseno.columnas
			let por_hoja = columnas * filas_por_hoja(this.diseno.alto_mm)
			let medida = String(ancho_de_etiqueta(columnas)).replace('.', ',') + ' × ' + String(this.diseno.alto_mm).replace('.', ',') + ' mm'
			return columnas + ' por fila · ' + por_hoja + ' por hoja · ' + medida
		},
	},
}
</script>
<style lang="sass">
// Mismo trato que las tarjetas de los Diseños de Vender (TarjetaDeDiseno.vue de disenos-de-vender):
// borde sutil por token, radio de 12px, sin sombra en reposo.
.tarjeta-de-etiqueta
	display: flex
	flex-direction: column
	min-width: 0
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	overflow: hidden
	cursor: pointer
	transition: border-color .15s ease, box-shadow .15s ease

	&:hover
		border-color: var(--color-border-tertiary)
		box-shadow: 0 4px 14px var(--shadow-color)

// La "mesa" gris donde apoya la etiqueta, del mismo alto en todas las tarjetas
.tarjeta-de-etiqueta__vista
	display: flex
	align-items: center
	justify-content: center
	height: 150px
	padding: 16px
	border-bottom: 1px solid var(--color-border-secondary)
	background: var(--bg-section)
	overflow: hidden

.tarjeta-de-etiqueta__cuerpo
	display: flex
	flex-direction: column
	gap: 4px
	flex: 1 1 auto
	padding: 12px 16px 14px

.tarjeta-de-etiqueta__nombre
	margin: 0
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

.tarjeta-de-etiqueta__detalle
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.78rem

.tarjeta-de-etiqueta__acciones
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 8px
	margin-top: 10px
	cursor: default

.tarjeta-de-etiqueta__boton.btn
	display: inline-flex
	align-items: center
	gap: 6px
	border-radius: 8px
	white-space: nowrap

.tarjeta-de-etiqueta__iconos
	display: inline-flex
	align-items: center
	gap: 2px
	margin-left: auto

.tarjeta-de-etiqueta__icono
	display: inline-flex
	align-items: center
	justify-content: center
	width: 32px
	height: 32px
	padding: 0
	border: 0
	border-radius: 8px
	background: transparent
	color: var(--color-text-secondary)
	font-size: 0.9rem
	cursor: pointer
	transition: background .15s ease, color .15s ease

	&:hover
		background: var(--bg-hover)
		color: var(--color-text-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.tarjeta-de-etiqueta__icono--peligro:hover
	background: var(--btn-peligro-fondo)
	color: var(--btn-peligro-texto)
</style>
