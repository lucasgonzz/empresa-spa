<template>
	<button
	type="button"
	class="carpeta"
	:class="clases"
	:title="'Abrir ' + nombre"
	@click="$emit('abrir', reporte)">

		<!--
			La carpetita con papeles, dibujada en CSS (sin imagen): la solapa y el
			cuerpo de atrás en el tono oscuro del tipo, dos o tres hojas asomando, y la
			tapa de adelante con el ícono. Al pasar el mouse las hojas suben 4px.
		-->
		<span
		class="carpeta__dibujo"
		aria-hidden="true">
			<span class="carpeta__atras"></span>
			<span class="carpeta__hojas">
				<span class="carpeta__hoja carpeta__hoja--1"></span>
				<span class="carpeta__hoja carpeta__hoja--2"></span>
				<span class="carpeta__hoja carpeta__hoja--3"></span>
			</span>
			<span class="carpeta__tapa">
				<i :class="'bi bi-' + icono"></i>
			</span>
		</span>

		<span class="carpeta__texto">
			<span class="carpeta__nombre">
				{{ nombre }}
				<span
				v-if="es_nuevo"
				class="carpeta__nuevo"
				title="Sin leer"></span>
			</span>
			<span
			v-if="!chica && reporte.resumen"
			class="carpeta__resumen">
				{{ reporte.resumen }}
			</span>
			<span
			v-if="chica && reporte.titulo"
			class="carpeta__resumen">
				{{ reporte.titulo }}
			</span>
			<span
			v-if="!chica"
			class="carpeta__fecha">
				{{ fecha_en_letras }}
			</span>
		</span>
	</button>
</template>

<script>
import moment from 'moment'

/**
 * Nombre e ícono (bootstrap-icons) de cada tipo de informe. El color va por clase
 * en el <style> (carpeta--dia, etc.), donde también se declaran los dos tonos.
 * Un tipo que no esté acá (un informe futuro) cae al gris con ícono de carpeta y
 * el título que haya depositado la skill.
 */
const TIPOS = {
	dia: { nombre: 'Rendimiento de ayer', icono: 'sun' },
	tienda: { nombre: 'Tu tienda', icono: 'shop' },
	compras: { nombre: 'Compras', icono: 'cart-plus' },
	stock: { nombre: 'Stock', icono: 'boxes' },
}

export default {
	props: {
		reporte: {
			type: Object,
			required: true,
		},
		/**
		 * Versión chica para la sección "Anteriores": dibujo a la izquierda, una
		 * línea de texto, sin resumen ni fecha (la fecha es el título del grupo).
		 */
		chica: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		tipo() {
			return TIPOS[this.reporte.tipo] || null
		},
		nombre() {
			if (this.tipo) {
				return this.tipo.nombre
			}
			return this.reporte.titulo || 'Informe'
		},
		icono() {
			return this.tipo ? this.tipo.icono : 'folder'
		},
		es_nuevo() {
			return !this.reporte.leido_at
		},
		clases() {
			let clases = {
				'carpeta--chica': this.chica,
				'carpeta--nueva': this.es_nuevo,
			}
			clases['carpeta--' + (this.tipo ? this.reporte.tipo : 'otro')] = true
			return clases
		},
		/**
		 * "sábado 13/9": moment ya está en 'es' (common-vue/mixins/dates.js).
		 */
		fecha_en_letras() {
			if (!this.reporte.fecha) {
				return ''
			}
			return moment(this.reporte.fecha, 'YYYY-MM-DD').format('dddd D/M')
		},
	},
}
</script>

<style lang="sass">
// Los dos tonos de cada tipo viven en custom properties para que las partes del
// dibujo (solapa, cuerpo, tapa, punto de nuevo, foco) los lean sin repetirlos.
// Colores del plan §2.2: dia azul, tienda violeta, compras verde, stock naranja.
.carpeta
	--carpeta-color: #8a94a6
	--carpeta-color-oscuro: #6b7386

	&--dia
		--carpeta-color: #0B84F8
		--carpeta-color-oscuro: #0868C4

	&--tienda
		--carpeta-color: #3A31FC
		--carpeta-color-oscuro: #2B24C4

	&--compras
		--carpeta-color: #1B9E5A
		--carpeta-color-oscuro: #157A45

	&--stock
		--carpeta-color: #FA7E06
		--carpeta-color-oscuro: #C66404

	// Es un <button> para que se abra con teclado, pero se ve como una tarjeta.
	appearance: none
	border: none
	width: 100%
	text-align: left
	font: inherit
	color: var(--color-text-primary, #212529)
	background: var(--bg-card, #fff)
	border-radius: 16px
	padding: 16px 16px 14px 16px
	box-shadow: 0 2px 8px var(--shadow-color, rgba(99, 99, 99, .2))
	display: flex
	flex-direction: column
	gap: 12px
	cursor: pointer
	transition: box-shadow .2s ease, transform .2s ease

	&:hover
		box-shadow: 0 8px 22px var(--shadow-color, rgba(99, 99, 99, .2))

	&:hover .carpeta__hojas
		transform: translateY(-4px)

	&:active
		transform: scale(.985)

	&:focus-visible
		outline: 2px solid var(--carpeta-color)
		outline-offset: 2px

	&__dibujo
		position: relative
		display: block
		width: 100%
		height: 118px
		flex-shrink: 0

	// Cuerpo de atrás con la solapa (el ::before) en el tono oscuro.
	&__atras
		position: absolute
		left: 0
		right: 0
		bottom: 0
		height: 84%
		background: var(--carpeta-color-oscuro)
		border-radius: 10px

		&::before
			content: ''
			position: absolute
			top: -10px
			left: 0
			width: 36%
			height: 16px
			background: var(--carpeta-color-oscuro)
			border-radius: 8px 8px 0 0

	// Las hojas asoman entre el cuerpo y la tapa. Es lo que sube al pasar el mouse.
	&__hojas
		position: absolute
		left: 8%
		right: 8%
		bottom: 26%
		height: 66%
		transition: transform .2s ease

	&__hoja
		position: absolute
		inset: 0
		background: #fff
		border-radius: 4px
		box-shadow: 0 1px 3px rgba(0, 0, 0, .14)

		&--1
			background: #eef0f4
			transform: rotate(-3deg) translateY(2px)

		&--2
			background: #f6f7f9
			transform: rotate(2deg)

		// La hoja de adelante lleva tres renglones dibujados, como un papel escrito.
		&--3
			background: #fff

			&::before
				content: ''
				position: absolute
				top: 10px
				left: 12px
				right: 12px
				height: 26px
				background: repeating-linear-gradient(to bottom, #d9dce3 0, #d9dce3 2px, transparent 2px, transparent 8px)
				border-radius: 1px

	// Tapa de adelante con el ícono. El brillo de arriba es un solo píxel: nada de
	// degradados fuertes.
	&__tapa
		position: absolute
		left: 0
		right: 0
		bottom: 0
		height: 60%
		background: var(--carpeta-color)
		border-radius: 8px 8px 10px 10px
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, .22), 0 -2px 6px rgba(0, 0, 0, .08)
		display: flex
		align-items: center
		justify-content: center
		color: #fff
		font-size: 26px
		line-height: 1

	&__texto
		display: flex
		flex-direction: column
		gap: 3px
		min-width: 0

	&__nombre
		display: flex
		align-items: center
		gap: 7px
		font-weight: 600
		font-size: 1rem
		line-height: 1.3

	// Punto de "sin leer", del color del tipo.
	&__nuevo
		flex-shrink: 0
		width: 8px
		height: 8px
		border-radius: 50%
		background: var(--carpeta-color)

	// El resumen va en UNA línea (plan §2.2).
	&__resumen
		font-size: .875rem
		color: var(--color-text-secondary, #6c757d)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__fecha
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)

		&::first-letter
			text-transform: uppercase

	// Versión chica (sección "Anteriores"): dibujo a la izquierda y una línea.
	&--chica
		flex-direction: row
		align-items: center
		gap: 12px
		padding: 10px 14px 10px 12px
		border-radius: 12px

		.carpeta__dibujo
			width: 64px
			height: 50px

		.carpeta__atras::before
			top: -6px
			height: 10px

		.carpeta__tapa
			font-size: 15px
			border-radius: 5px 5px 7px 7px

		.carpeta__hoja--3::before
			display: none

		.carpeta__nombre
			font-size: .9rem

		.carpeta__resumen
			font-size: .8rem

// En oscuro las hojas siguen siendo papel (claras), apenas apagadas para no
// encandilar sobre la tarjeta oscura.
html.dark-mode .carpeta
	.carpeta__hoja
		box-shadow: 0 1px 3px rgba(0, 0, 0, .4)

		&--1
			background: #c9ced8

		&--2
			background: #dde1e8

		&--3
			background: #eef0f3

@media (prefers-reduced-motion: reduce)
	.carpeta
		transition: none

		&:active
			transform: none

	.carpeta__hojas
		transition: none
</style>
