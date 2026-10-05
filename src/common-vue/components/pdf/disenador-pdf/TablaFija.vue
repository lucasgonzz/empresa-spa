<template>
	<!--
		La tabla de artículos en la hoja del diseñador de PDF: fija, entre la zona de arriba y el pie
		(plan §4.2). Sus columnas NO se editan acá -- se eligen en el formulario del diseño, "Columnas
		del PDF" (decisión de Lucas) --; acá se ven las visibles, cada una del ancho proporcional a sus
		mm sobre el ancho útil de la hoja, para que se entienda si entran en la hoja elegida.
	-->
	<section
	class="dpdf-tabla"
	:class="{ 'dpdf-tabla--se-pasa': sobra_mm > 0 }"
	aria-label="Tabla de artículos (fija)"
	data-testid="tabla-disenador-pdf">

		<header class="dpdf-tabla__cabecera">
			<i
			class="bi bi-lock-fill dpdf-tabla__candado"
			aria-hidden="true"></i>
			<span class="dpdf-tabla__titulo">Tabla de artículos</span>
			<span class="dpdf-tabla__nota">Las columnas se eligen en el formulario del diseño (Columnas del PDF).</span>
		</header>

		<div
		v-if="columnas.length"
		class="dpdf-tabla__marco">
			<!-- Encabezado gris con los rótulos, como el de la tabla del PDF -->
			<div class="dpdf-tabla__fila dpdf-tabla__fila--encabezado">
				<span
				v-for="columna in columnas"
				:key="'encabezado-' + columna.id"
				class="dpdf-tabla__celda"
				:style="estilo_de_la_celda(columna)"
				:title="columna.rotulo + ' · ' + columna.ancho + ' mm'">{{ columna.rotulo }}</span>
			</div>
			<!-- Dos renglones de muestra, vacíos: lo que importa es el ancho de cada columna -->
			<div
			v-for="renglon in 2"
			:key="'renglon-' + renglon"
			class="dpdf-tabla__fila"
			aria-hidden="true">
				<span
				v-for="columna in columnas"
				:key="'renglon-' + renglon + '-' + columna.id"
				class="dpdf-tabla__celda"
				:style="estilo_de_la_celda(columna)">
					<span class="dpdf-tabla__raya"></span>
				</span>
			</div>
		</div>

		<p
		v-else
		class="dpdf-tabla__vacia">
			Todavía no hay columnas visibles: elegilas en "Columnas del PDF".
		</p>

		<p
		v-if="sobra_mm > 0"
		class="dpdf-tabla__sobra"
		role="status">
			<i
			class="bi bi-exclamation-triangle"
			aria-hidden="true"></i>
			Las columnas suman {{ suma_mm }} mm y en esta hoja entran {{ util_mm }} mm: sobran {{ sobra_mm }} mm.
			Achicá columnas en el formulario o elegí una hoja más ancha o menos margen.
		</p>
	</section>
</template>
<script>
/**
 * Tabla fija de la hoja del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Lee las columnas visibles, su suma y el ancho útil de la hoja del diseñador (que llega por
 * `inject`): las columnas salen de `model.pdf_column_options` del formulario, así refleja también
 * los cambios de columnas todavía sin guardar.
 */
export default {
	name: 'TablaFija',
	inject: ['disenador'],
	computed: {
		/**
		 * Columnas visibles, en su orden ({id, rotulo, ancho}).
		 *
		 * @returns {Array}
		 */
		columnas() {
			return this.disenador.columnas_de_la_tabla
		},
		/**
		 * Suma de los anchos de las columnas visibles (mm).
		 *
		 * @returns {number}
		 */
		suma_mm() {
			return this.disenador.suma_de_columnas_mm
		},
		/**
		 * Ancho útil de la hoja elegida (mm).
		 *
		 * @returns {number}
		 */
		util_mm() {
			return this.disenador.ancho_util_mm
		},
		/**
		 * Cuánto se pasan las columnas del ancho útil (mm), o 0.
		 *
		 * @returns {number}
		 */
		sobra_mm() {
			let sobra = this.suma_mm - this.util_mm
			return sobra > 0 ? sobra : 0
		},
	},
	methods: {
		/**
		 * Ancho de una celda: sus mm sobre el ancho útil (si las columnas se pasan, la fila se corta
		 * en el borde de la hoja, como se saldría del papel).
		 *
		 * @param {Object} columna
		 * @returns {Object}
		 */
		estilo_de_la_celda(columna) {
			let porcentaje = this.util_mm > 0 ? (columna.ancho / this.util_mm) * 100 : 0
			return {
				flex: '0 0 ' + porcentaje.toFixed(3) + '%',
				maxWidth: porcentaje.toFixed(3) + '%',
			}
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token. La tabla se ve como la del PDF: encabezado gris y renglones con una
// línea fina, sobre el papel.
.dpdf-tabla
	margin: 4px 0 6px

.dpdf-tabla__cabecera
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 4px 8px
	margin-bottom: 6px
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.3

.dpdf-tabla__candado
	flex: 0 0 auto

.dpdf-tabla__titulo
	font-weight: 700
	text-transform: uppercase
	letter-spacing: 0.03em
	color: var(--color-text-primary)

.dpdf-tabla__nota
	flex: 1 1 220px
	min-width: 0

// El marco corta lo que se pasa del ancho útil (overflow hidden): así se ve que no entra
.dpdf-tabla__marco
	overflow: hidden
	border: 1px solid var(--color-border)
	border-radius: 4px

.dpdf-tabla__fila
	display: flex
	min-width: 0
	border-top: 1px solid var(--color-border-secondary)

	&:first-child
		border-top: 0

.dpdf-tabla__fila--encabezado
	background: var(--bg-section)

	.dpdf-tabla__celda
		padding: 4px 5px
		color: var(--color-text-primary)
		font-family: Arial, Helvetica, sans-serif
		font-size: 0.7rem
		font-weight: 700

.dpdf-tabla__celda
	min-width: 0
	padding: 6px 5px
	border-left: 1px solid var(--color-border-secondary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

	&:first-child
		border-left: 0

.dpdf-tabla__raya
	display: block
	height: 5px
	width: 70%
	border-radius: 3px
	background: var(--bg-section)

.dpdf-tabla__vacia
	margin: 0
	padding: 10px 12px
	border: 1.5px dashed var(--color-border)
	border-radius: 6px
	color: var(--color-text-secondary)
	font-size: 0.78rem
	text-align: center

// Las columnas no entran: el borde y el aviso en rojo
.dpdf-tabla--se-pasa .dpdf-tabla__marco
	border-color: var(--color-text-danger-strong, var(--danger))

.dpdf-tabla__sobra
	display: flex
	align-items: flex-start
	gap: 6px
	margin: 6px 0 0
	color: var(--color-text-danger-strong, var(--danger))
	font-size: 0.76rem
	font-weight: 600
	line-height: 1.35

	i
		flex: 0 0 auto
		margin-top: 1px
</style>
