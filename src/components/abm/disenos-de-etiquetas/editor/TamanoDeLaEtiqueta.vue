<template>
	<!--
		El tamaño de la etiqueta, arriba del lienzo (mision disenos-etiquetas-gondola, 29/9/2026):

		- "Etiquetas por fila": 1, 2, 3 o 4 a lo ancho de la hoja A4, con un dibujito de la hoja.
		- "Filas por hoja": cuantas a lo alto; el alto se calcula solo.
		- "Alto": el ajuste fino en mm; cuantas filas entran se recalcula y se muestra.
		- "Marco": la linea alrededor de cada etiqueta.
		- La hoja A4 en chiquito y "Entran 3 × 7 = 21 por hoja".

		Solo avisa (columnas, filas, alto, marco): el editor aplica el cambio y escala los campos para
		que ninguno quede afuera.
	-->
	<section
	class="tamano-etiqueta"
	aria-label="Tamaño de la etiqueta">

		<div class="tamano-etiqueta__grupo">
			<span
			id="tamano-etiqueta-columnas"
			class="tamano-etiqueta__titulo">Etiquetas por fila</span>
			<div
			class="tamano-etiqueta__columnas"
			role="radiogroup"
			aria-labelledby="tamano-etiqueta-columnas">
				<button
				v-for="columnas in OPCIONES_DE_COLUMNAS"
				:key="columnas"
				type="button"
				class="tamano-etiqueta__columna"
				:class="{ 'tamano-etiqueta__columna--activa': diseno.columnas === columnas }"
				role="radio"
				:aria-checked="diseno.columnas === columnas ? 'true' : 'false'"
				:title="columnas === 1 ? 'Una etiqueta a lo ancho de la hoja' : columnas + ' etiquetas a lo ancho de la hoja'"
				@click="$emit('columnas', columnas)">
					<span
					class="tamano-etiqueta__dibujito"
					aria-hidden="true">
						<span
						v-for="indice in columnas"
						:key="indice"></span>
					</span>
					<span class="tamano-etiqueta__numero">{{ columnas }}</span>
				</button>
			</div>
		</div>

		<div class="tamano-etiqueta__grupo">
			<label
			class="tamano-etiqueta__titulo"
			for="tamano-etiqueta-filas">Filas por hoja</label>
			<div class="tamano-etiqueta__contador">
				<button
				type="button"
				class="tamano-etiqueta__paso"
				aria-label="Una fila menos"
				:disabled="filas_del_contador <= FILAS_MINIMO"
				@click="$emit('filas', filas_del_contador - 1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<b-form-input
				id="tamano-etiqueta-filas"
				:key="'filas-' + version"
				class="tamano-etiqueta__numero-input"
				size="sm"
				type="number"
				:min="FILAS_MINIMO"
				:max="FILAS_MAXIMO"
				:value="filas_del_contador"
				@change="poner_filas"></b-form-input>
				<button
				type="button"
				class="tamano-etiqueta__paso"
				aria-label="Una fila más"
				:disabled="filas_del_contador >= FILAS_MAXIMO"
				@click="$emit('filas', filas_del_contador + 1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</div>
		</div>

		<div class="tamano-etiqueta__grupo">
			<label
			class="tamano-etiqueta__titulo"
			for="tamano-etiqueta-alto">Alto (mm)</label>
			<b-form-input
			id="tamano-etiqueta-alto"
			:key="'alto-' + version"
			class="tamano-etiqueta__alto"
			size="sm"
			type="number"
			step="0.1"
			:min="ALTO_MINIMO_MM"
			:max="ALTO_MAXIMO_MM"
			:value="diseno.alto_mm"
			@change="poner_alto"></b-form-input>
		</div>

		<div class="tamano-etiqueta__grupo tamano-etiqueta__grupo--marco">
			<interruptor
			id="tamano-etiqueta-marco"
			:value="diseno.marco"
			@input="$emit('marco', $event)">Marco</interruptor>
		</div>

		<div class="tamano-etiqueta__resumen">
			<hoja-a4
			:columnas="diseno.columnas"
			:alto_mm="diseno.alto_mm"
			:ancho_px="40"></hoja-a4>
			<div class="tamano-etiqueta__cuentas">
				<span>Entran {{ diseno.columnas }} × {{ filas }} = <strong>{{ diseno.columnas * filas }}</strong> por hoja</span>
				<span class="tamano-etiqueta__medida">Cada una: {{ medida }}</span>
			</div>
		</div>
	</section>
</template>
<script>
import HojaA4 from '../HojaA4'
import Interruptor from './Interruptor'
import {
	FILAS_MINIMO,
	FILAS_MAXIMO,
	ALTO_MINIMO_MM,
	ALTO_MAXIMO_MM,
	ancho_de_etiqueta,
	filas_por_hoja,
	redondear,
} from '../geometria'

/**
 * Tamaño de la etiqueta.
 */
export default {
	name: 'TamanoDeLaEtiqueta',
	components: {
		HojaA4,
		Interruptor,
	},
	props: {
		/* El diseño que se edita */
		diseno: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			OPCIONES_DE_COLUMNAS: [1, 2, 3, 4],
			FILAS_MINIMO: FILAS_MINIMO,
			FILAS_MAXIMO: FILAS_MAXIMO,
			ALTO_MINIMO_MM: ALTO_MINIMO_MM,
			ALTO_MAXIMO_MM: ALTO_MAXIMO_MM,
			/* Se incrementa para redibujar los inputs cuando lo escrito se acota (ver poner_alto) */
			version: 0,
		}
	},
	computed: {
		/**
		 * Filas que entran de verdad con el alto elegido (lo que usa el PDF).
		 *
		 * @returns {number}
		 */
		filas() {
			return filas_por_hoja(this.diseno.alto_mm)
		},
		/**
		 * Lo que muestra el contador "Filas por hoja": las que entran, con tope en su maximo (20, el
		 * del contrato). Con 10 mm de alto entran 28 y el contador dice 20; "Entran …" dice las 28.
		 *
		 * @returns {number}
		 */
		filas_del_contador() {
			return Math.min(FILAS_MAXIMO, this.filas)
		},
		/**
		 * "66,7 × 40 mm".
		 *
		 * @returns {string}
		 */
		medida() {
			let ancho = String(ancho_de_etiqueta(this.diseno.columnas)).replace('.', ',')
			let alto = String(redondear(this.diseno.alto_mm)).replace('.', ',')
			return ancho + ' × ' + alto + ' mm'
		},
	},
	methods: {
		/**
		 * Filas escritas a mano.
		 *
		 * @param {string} valor
		 * @returns {void}
		 */
		poner_filas(valor) {
			let numero = Math.round(Number(valor))
			if (valor !== '' && !isNaN(numero)) {
				this.$emit('filas', Math.min(FILAS_MAXIMO, Math.max(FILAS_MINIMO, numero)))
			}
			this.version++
		},
		/**
		 * Alto escrito a mano (al salir del campo o con Enter; no con cada tecla, porque cada cambio
		 * de alto escala los campos).
		 *
		 * @param {string} valor
		 * @returns {void}
		 */
		poner_alto(valor) {
			let numero = Number(String(valor).replace(',', '.'))
			if (valor !== '' && !isNaN(numero)) {
				this.$emit('alto', redondear(Math.min(ALTO_MAXIMO_MM, Math.max(ALTO_MINIMO_MM, numero))))
			}
			this.version++
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token
.tamano-etiqueta
	display: flex
	flex-wrap: wrap
	align-items: flex-end
	gap: 12px 20px
	padding: 12px 14px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	text-align: left

	.form-control
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.tamano-etiqueta__grupo
	display: flex
	flex-direction: column
	gap: 5px

.tamano-etiqueta__grupo--marco
	padding-bottom: 4px

.tamano-etiqueta__titulo
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.02em

.tamano-etiqueta__columnas
	display: inline-flex
	gap: 6px

// Cada opcion de "Etiquetas por fila": la hojita con N columnas y el numero
.tamano-etiqueta__columna
	display: inline-flex
	align-items: center
	gap: 6px
	height: 34px
	padding: 0 9px 0 7px
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-weight: 700
	cursor: pointer
	transition: border-color .15s ease, background .15s ease

	&:hover
		border-color: var(--color-primary)
		background: var(--bg-hover)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.tamano-etiqueta__columna--activa
	border-color: var(--color-primary)
	background: var(--bg-nav-hover)
	color: var(--color-primary)

	&:hover
		background: var(--bg-nav-hover)

.tamano-etiqueta__dibujito
	display: inline-flex
	gap: 1px
	width: 16px
	height: 22px
	padding: 2px
	border: 1px solid currentColor
	border-radius: 2px

	span
		flex: 1 1 0
		border-radius: 1px
		background: currentColor
		opacity: .45

.tamano-etiqueta__numero
	font-size: 0.85rem

.tamano-etiqueta__contador
	display: inline-flex
	align-items: center
	gap: 6px

.tamano-etiqueta__paso
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 32px
	width: 32px
	height: 32px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	cursor: pointer

	&:hover:not(:disabled)
		border-color: var(--color-primary)
		background: var(--bg-hover)

	&:disabled
		opacity: .4
		cursor: default

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.tamano-etiqueta__numero-input
	width: 58px
	text-align: center

.tamano-etiqueta__alto
	width: 84px

.tamano-etiqueta__resumen
	display: flex
	align-items: center
	gap: 10px
	margin-left: auto

.tamano-etiqueta__cuentas
	display: flex
	flex-direction: column
	gap: 2px
	color: var(--color-text-primary)
	font-size: 0.8rem

	strong
		font-weight: 700

.tamano-etiqueta__medida
	color: var(--color-text-secondary)
	font-size: 0.75rem

@media (max-width: 575.98px)
	.tamano-etiqueta
		.tamano-etiqueta__resumen
			margin-left: 0
</style>
