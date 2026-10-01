<template>
	<!--
		Hoja y margen del diseño, de la forma más simple (pedido de Lucas): el formato con un botón por
		cada uno de los que manda el catálogo (A4, Carta, Oficio, A5; siempre vertical) y el margen con
		− N mm +, el mismo para los cuatro lados. Un ancho/alto guardado que no coincide con ningún
		formato se muestra como "Hoja personalizada" hasta que se elija otro.
	-->
	<div
	class="dpdf-controles"
	role="group"
	aria-label="Hoja y margen">

		<div class="dpdf-controles__grupo">
			<span
			id="dpdf-controles-etiqueta-hoja"
			class="dpdf-controles__etiqueta">Hoja</span>
			<div
			class="dpdf-controles__formatos"
			role="group"
			aria-labelledby="dpdf-controles-etiqueta-hoja">
				<button
				v-for="formato in disenador.catalogo.formatos_de_hoja"
				:key="formato.key"
				type="button"
				class="dpdf-controles__formato"
				:class="{ 'dpdf-controles__formato--activo': es_el_formato(formato) }"
				:aria-pressed="es_el_formato(formato) ? 'true' : 'false'"
				:title="formato.nombre + ': ' + formato.ancho_mm + ' × ' + formato.alto_mm + ' mm, vertical'"
				:data-testid="'disenador-pdf-hoja-' + formato.key"
				@click="disenador.elegir_formato(formato)">
					{{ formato.nombre }}
				</button>
			</div>
			<span
			class="dpdf-controles__detalle"
			:class="{ 'dpdf-controles__detalle--personalizada': !formato_actual }">{{ detalle_de_la_hoja }}</span>
		</div>

		<div class="dpdf-controles__grupo">
			<span
			id="dpdf-controles-etiqueta-margen"
			class="dpdf-controles__etiqueta">Margen</span>
			<div
			class="dpdf-controles__paso"
			role="group"
			aria-labelledby="dpdf-controles-etiqueta-margen">
				<button
				type="button"
				class="dpdf-controles__boton"
				:disabled="disenador.hoja.margen <= disenador.limites.margen_min"
				title="Achicar el margen 1 mm"
				aria-label="Achicar el margen 1 milímetro"
				data-testid="disenador-pdf-margen-menos"
				@click="disenador.cambiar_margen(-1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span
				class="dpdf-controles__valor"
				aria-live="polite"
				data-testid="disenador-pdf-margen">{{ disenador.hoja.margen }} mm</span>
				<button
				type="button"
				class="dpdf-controles__boton"
				:disabled="disenador.hoja.margen >= disenador.limites.margen_max"
				title="Agrandar el margen 1 mm"
				aria-label="Agrandar el margen 1 milímetro"
				data-testid="disenador-pdf-margen-mas"
				@click="disenador.cambiar_margen(1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</div>
			<span class="dpdf-controles__detalle">en los cuatro lados · {{ disenador.ancho_util_mm }} mm de ancho útil</span>
		</div>
	</div>
</template>
<script>
import { formato_de_hoja } from './estado_del_disenador'

/**
 * Controles de la hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Presentacional: la hoja, los formatos y los límites del margen los tiene el diseñador (llega por
 * `inject`), que es quien cambia la hoja (elegir_formato, cambiar_margen).
 */
export default {
	name: 'ControlesDeHoja',
	inject: ['disenador'],
	computed: {
		/**
		 * El formato que coincide con la hoja de ahora, o null (hoja personalizada).
		 *
		 * @returns {Object|null}
		 */
		formato_actual() {
			let hoja = this.disenador.hoja
			return formato_de_hoja(this.disenador.catalogo.formatos_de_hoja, hoja.ancho, hoja.alto)
		},
		/**
		 * La línea debajo de los formatos: medidas del formato, o "Hoja personalizada (W × H mm)".
		 *
		 * @returns {string}
		 */
		detalle_de_la_hoja() {
			let hoja = this.disenador.hoja
			if (!this.formato_actual) {
				return 'Hoja personalizada (' + hoja.ancho + ' × ' + hoja.alto + ' mm)'
			}
			return this.formato_actual.ancho_mm + ' × ' + this.formato_actual.alto_mm + ' mm, vertical'
		},
	},
	methods: {
		/**
		 * Si un formato es el de la hoja de ahora.
		 *
		 * @param {Object} formato
		 * @returns {boolean}
		 */
		es_el_formato(formato) {
			return !!(this.formato_actual && this.formato_actual.key === formato.key)
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token
.dpdf-controles
	display: flex
	flex-wrap: wrap
	align-items: flex-start
	gap: 10px 28px

.dpdf-controles__grupo
	display: grid
	grid-template-columns: auto auto
	grid-template-areas: "etiqueta control" ". detalle"
	align-items: center
	gap: 4px 10px

.dpdf-controles__etiqueta
	grid-area: etiqueta
	color: var(--color-text-secondary)
	font-size: 0.78rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.02em

.dpdf-controles__formatos,
.dpdf-controles__paso
	grid-area: control

.dpdf-controles__detalle
	grid-area: detalle
	color: var(--color-text-secondary)
	font-size: 0.74rem
	line-height: 1.35

.dpdf-controles__detalle--personalizada
	color: var(--color-text-warning-strong, var(--orange))
	font-weight: 600

// Formatos: una pastilla segmentada, como el nav horizontal del sistema
.dpdf-controles__formatos
	display: inline-flex
	flex-wrap: wrap
	gap: 2px
	padding: 3px
	border-radius: 10px
	background: var(--bg-nav)

.dpdf-controles__formato
	min-width: 56px
	padding: 4px 12px
	border: 0
	border-radius: 8px
	background: transparent
	color: var(--color-text-primary)
	font-size: 0.82rem
	font-weight: 600
	line-height: 1.4
	cursor: pointer
	transition: background .15s ease, color .15s ease

	&:hover:not(.dpdf-controles__formato--activo)
		background: var(--bg-card)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.dpdf-controles__formato--activo
	background: var(--color-primary)
	color: var(--bg-card)

// Margen: − N mm +
.dpdf-controles__paso
	display: inline-flex
	align-items: center
	gap: 4px

.dpdf-controles__boton
	display: inline-flex
	align-items: center
	justify-content: center
	width: 30px
	height: 30px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 50%
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.8rem
	cursor: pointer
	transition: background .15s ease, border-color .15s ease

	&:hover:not(:disabled)
		background: var(--bg-nav-hover)
		border-color: var(--color-primary)

	&:disabled
		opacity: .4
		cursor: default

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)

.dpdf-controles__valor
	min-width: 52px
	color: var(--color-text-primary)
	font-size: 0.9rem
	font-weight: 700
	text-align: center
	font-variant-numeric: tabular-nums
</style>
