<template>
	<!--
		Panel de propiedades del diseñador de PDF: arriba de la bandeja, muestra lo seleccionado en la
		hoja (plan §8.3). La cabecera (qué es, cómo se llama y la ✕ para dejar de editarlo) es común; el
		cuerpo es de cada tipo: PanelDeCaja (título, estilo, ancho, quitar), PanelDeCampo (rótulo,
		texto, letra, alineación, volver al estilo del campo, sacar) y PanelDeFijo (el cuadro de
		importes del bloque de ARCA del pie). Sin nada seleccionado, una línea de ayuda.

		Todo se cambia EN EL LUGAR sobre el objeto seleccionado (el mismo de las listas de trabajo):
		la hoja lo ve al instante y el diseñador lo cuenta como cambio sin guardar.
	-->
	<section
	class="dpdf-panel"
	:class="{ 'dpdf-panel--vacio': !seleccion }"
	aria-label="Propiedades de lo seleccionado"
	data-testid="disenador-pdf-panel">

		<!-- Nada seleccionado: una línea de ayuda -->
		<div
		v-if="!seleccion"
		class="dpdf-panel__nada">
			<i
			class="bi bi-hand-index-thumb"
			aria-hidden="true"></i>
			<p>Tocá una caja o un campo de la hoja para cambiarle el título, el estilo o la letra.</p>
		</div>

		<template v-else>
			<header class="dpdf-panel__cabecera">
				<span class="dpdf-panel__textos">
					<span class="dpdf-panel__tipo">{{ tipo_de_lo_seleccionado }}</span>
					<span class="dpdf-panel__nombre">{{ nombre_de_lo_seleccionado }}</span>
				</span>
				<button
				type="button"
				class="dpdf-panel__cerrar"
				title="Dejar de editar"
				:aria-label="'Dejar de editar ' + nombre_de_lo_seleccionado"
				@click="disenador.seleccionar(null, null)">
					<i class="bi bi-x-lg"></i>
				</button>
			</header>

			<panel-de-caja
			v-if="seleccion.tipo === 'caja'"
			:key="'caja-' + seleccion.item.id"
			:caja="seleccion.item"
			:zona="seleccion.zona"></panel-de-caja>

			<panel-de-campo
			v-else-if="seleccion.tipo === 'campo'"
			:key="'campo-' + seleccion.item.ui_id"
			:campo="seleccion.item"></panel-de-campo>

			<panel-de-fijo
			v-else-if="seleccion.tipo === 'fijo'"
			:key="'fijo-' + seleccion.item.key"
			:fijo="seleccion.item"></panel-de-fijo>
		</template>
	</section>
</template>
<script>
import PanelDeCaja from './PanelDeCaja'
import PanelDeCampo from './PanelDeCampo'
import PanelDeFijo from './PanelDeFijo'

/* Cómo se nombra cada zona en la cabecera del panel */
const NOMBRES_DE_ZONAS = {
	superior: 'arriba de la tabla',
	pie: 'pie de página',
}

/**
 * Panel de propiedades del diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026).
 *
 * Lee la selección del diseñador (`seleccion_actual`: {tipo, item, caja, zona}, por `inject`), arma
 * la cabecera y le pasa lo seleccionado al panel de su tipo. Los estilos de todos los paneles
 * (clases dpdf-panel__* y dpdf-toggle) están acá.
 */
export default {
	name: 'PanelDePropiedades',
	inject: ['disenador'],
	components: {
		PanelDeCaja,
		PanelDeCampo,
		PanelDeFijo,
	},
	computed: {
		/**
		 * La selección vigente, o null.
		 *
		 * @returns {Object|null}
		 */
		seleccion() {
			return this.disenador.seleccion_actual
		},
		/**
		 * La primera línea de la cabecera: qué es lo seleccionado (y en qué zona está).
		 *
		 * @returns {string}
		 */
		tipo_de_lo_seleccionado() {
			let seleccion = this.seleccion
			if (!seleccion) {
				return ''
			}
			let zona = NOMBRES_DE_ZONAS[seleccion.zona] || ''
			if (seleccion.tipo === 'caja') {
				return 'Caja · ' + zona
			}
			if (seleccion.tipo === 'fijo') {
				return 'Bloque de ARCA · ' + zona
			}
			let definicion = this.disenador.definiciones[seleccion.item.key]
			let categoria = definicion ? this.disenador.categorias_por_key[definicion.categoria] : null
			return categoria ? categoria.nombre : 'Campo'
		},
		/**
		 * El nombre de lo seleccionado: el título de la caja, el nombre del campo o del bloque.
		 *
		 * @returns {string}
		 */
		nombre_de_lo_seleccionado() {
			let seleccion = this.seleccion
			if (!seleccion) {
				return ''
			}
			let item = seleccion.item
			if (seleccion.tipo === 'caja') {
				let titulo = String(item.titulo || '').trim()
				return titulo ? titulo : 'Caja sin título'
			}
			if (seleccion.tipo === 'fijo') {
				let fijo = this.disenador.fijos_por_key[item.key]
				return fijo ? fijo.nombre : item.key
			}
			let definicion = this.disenador.definiciones[item.key]
			return definicion ? definicion.nombre : item.key
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token. Los inputs toman el radio y el foco "nuevos" desde Index.vue (scopeado
// por el id del modal, patrón de contexto/estilo_interfaz_empresa.md).
.dpdf-panel
	display: flex
	flex-direction: column
	gap: 12px
	padding: 14px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	color: var(--color-text-primary)

.dpdf-panel--vacio
	border-style: dashed

// El cuerpo de cada sub-panel (PanelDeCaja, PanelDeCampo, PanelDeFijo): sus bloques, en columna
.dpdf-panel__cuerpo
	display: flex
	flex-direction: column
	gap: 12px

.dpdf-panel__nada
	display: flex
	align-items: flex-start
	gap: 10px
	color: var(--color-text-secondary)
	font-size: 0.8rem
	line-height: 1.4

	i
		flex: 0 0 auto
		margin-top: 1px
		color: var(--color-primary)
		font-size: 1rem

	p
		margin: 0

.dpdf-panel__cabecera
	display: flex
	align-items: flex-start
	gap: 8px

.dpdf-panel__textos
	display: flex
	flex-direction: column
	flex: 1 1 auto
	min-width: 0

.dpdf-panel__tipo
	color: var(--color-text-secondary)
	font-size: 0.7rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.03em

.dpdf-panel__nombre
	font-size: 0.92rem
	font-weight: 700
	line-height: 1.3
	overflow-wrap: anywhere

.dpdf-panel__cerrar
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 26px
	width: 26px
	height: 26px
	padding: 0
	border: 0
	border-radius: 50%
	background: transparent
	color: var(--color-text-secondary)
	font-size: 0.75rem
	cursor: pointer

	&:hover
		background: var(--bg-hover)
		color: var(--color-text-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 2px var(--color-primary)

.dpdf-panel__bloque
	display: flex
	flex-direction: column
	gap: 5px

.dpdf-panel__etiqueta
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.02em

.dpdf-panel__ayuda
	color: var(--color-text-secondary)
	font-size: 0.72rem
	line-height: 1.35

.dpdf-panel__ayuda--parrafo
	margin: 0

.dpdf-panel__aparece,
.dpdf-panel__perdido,
.dpdf-panel__nota
	display: flex
	align-items: flex-start
	gap: 6px
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.74rem
	line-height: 1.35

	i
		flex: 0 0 auto
		margin-top: 1px

.dpdf-panel__perdido
	color: var(--color-text-danger-strong, var(--danger))
	font-weight: 600

// Estilos de caja: tres opciones con una mini vista previa
.dpdf-panel__estilos
	display: grid
	grid-template-columns: repeat(3, minmax(0, 1fr))
	gap: 6px

.dpdf-panel__estilo
	display: flex
	flex-direction: column
	align-items: center
	gap: 5px
	min-width: 0
	padding: 6px 4px
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	cursor: pointer
	transition: border-color .15s ease, background .15s ease

	&:hover
		border-color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.dpdf-panel__estilo--activo
	border-color: var(--color-primary)
	background: var(--bg-nav-hover)

.dpdf-panel__estilo-nombre
	font-size: 0.7rem
	font-weight: 600
	line-height: 1.2
	text-align: center

.dpdf-panel__muestra
	display: flex
	flex-direction: column
	justify-content: center
	gap: 4px
	width: 46px
	height: 30px
	padding: 0 6px
	border-radius: 3px

.dpdf-panel__muestra--borde
	border: 1px solid var(--color-text-secondary)
	background: var(--bg-card)

.dpdf-panel__muestra--gris
	border: 1px solid var(--color-border)
	background: var(--bg-section)

.dpdf-panel__muestra--ninguno
	border: 1px dashed var(--color-border)
	background: var(--bg-card)

.dpdf-panel__muestra-linea
	display: block
	height: 3px
	border-radius: 2px
	background: var(--color-text-secondary)
	opacity: .55

.dpdf-panel__muestra-linea--corta
	width: 60%

// − N +
.dpdf-panel__paso
	display: inline-flex
	align-items: center
	gap: 4px

.dpdf-panel__boton
	display: inline-flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 50%
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.78rem
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

.dpdf-panel__valor
	min-width: 48px
	font-size: 0.86rem
	font-weight: 700
	text-align: center
	font-variant-numeric: tabular-nums

// Letra: tamaño + B + I en una fila
.dpdf-panel__letra
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 6px 10px

.dpdf-panel__alineaciones
	display: inline-flex
	gap: 4px

// Botones que se prenden y se apagan (B, I y las alineaciones)
.dpdf-panel__alternar
	display: inline-flex
	align-items: center
	justify-content: center
	width: 32px
	height: 30px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.9rem
	cursor: pointer
	transition: background .15s ease, border-color .15s ease, color .15s ease

	&:hover
		border-color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.dpdf-panel__alternar--activo
	border-color: var(--color-primary)
	background: var(--bg-nav-hover)
	color: var(--color-primary)

.dpdf-panel__sin-rotulo
	font-size: 0.78rem

.dpdf-panel__restablecer
	display: inline-flex
	align-items: center
	align-self: flex-start
	gap: 6px
	padding: 0
	border: 0
	background: transparent
	color: var(--color-primary)
	font-size: 0.78rem
	font-weight: 600
	cursor: pointer

	&:disabled
		color: var(--color-text-secondary)
		opacity: .6
		cursor: default

	&:focus
		outline: none

	&:focus-visible
		border-radius: 4px
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.dpdf-panel__quitar.btn
	display: inline-flex
	align-items: center
	align-self: flex-start
	gap: 6px
	border-radius: 8px

// El interruptor del cuadro de importes: el mismo dibujo que el "En uso" de Diseños de Vender
.dpdf-toggle
	display: inline-flex
	align-items: center
	gap: 10px
	margin: 0
	cursor: pointer
	user-select: none

	input
		position: absolute
		width: 0
		height: 0
		opacity: 0

	.dpdf-toggle__pista
		position: relative
		flex: 0 0 44px
		width: 44px
		height: 26px
		border-radius: 999px
		background: var(--toggle-track-off)
		border: 1px solid var(--color-border)
		transition: background .2s ease, border-color .2s ease

	.dpdf-toggle__perilla
		position: absolute
		top: 2px
		left: 2px
		width: 20px
		height: 20px
		border-radius: 50%
		background: var(--bg-card)
		box-shadow: 0 1px 4px var(--shadow-color)
		transition: transform .2s ease

	.dpdf-toggle__texto
		font-size: 0.85rem
		font-weight: 600
		color: var(--color-text-primary)

	input:checked ~ .dpdf-toggle__pista
		background: var(--color-primary)
		border-color: var(--color-primary)

		.dpdf-toggle__perilla
			transform: translateX(18px)

	input:focus-visible ~ .dpdf-toggle__pista
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

html.dark-mode .dpdf-toggle .dpdf-toggle__perilla
	background: var(--color-text-primary)
</style>
