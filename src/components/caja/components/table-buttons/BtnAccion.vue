<template>
	<!--
		Boton de accion de la fila de cajas (grupo 371). Presentacional: no conoce el store,
		no hace peticiones y no sabe que es una caja. Recibe icono, texto, tono y estado de
		carga, y emite `clicked`.
	-->
	<button
	type="button"
	class="caja-accion"
	:class="'caja-accion--' + tono"
	:disabled="loader"
	:title="texto"
	@click.stop="clicked">
		<span
		v-if="loader"
		class="spinner-border spinner-border-sm"></span>
		<i
		v-else
		:class="icono"
		aria-hidden="true"></i>
		<span class="caja-accion__texto">{{ texto }}</span>
	</button>
</template>
<script>
export default {
	props: {
		icono: {
			type: String,
			required: true,
		},
		texto: {
			type: String,
			required: true,
		},
		tono: {
			type: String,
			default: 'neutro',
		},
		loader: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Reemite el clic al padre. El @click del template ya trae .stop porque estos botones
		 * viven adentro de un <tr> que tiene su propio @click (abre el formulario de la caja):
		 * sin el .stop, tocar un boton tambien abriria ese formulario.
		 *
		 * @returns {void}
		 */
		clicked() {
			this.$emit('clicked')
		},
	},
}
</script>
<style scoped lang="sass">
// Lenguaje visual heredado de los chips de la barra horizontal
// (horizontal-nav-center/BtnMovimientosEntreCajas.vue y Total.vue), en version compacta:
// mismo radio, mismo borde, misma sombra, pero de una sola linea porque aca entran cuatro
// botones en una celda de tabla.
//
// El color queda SOLO para la accion de estado (abrir/cerrar). Los botones neutros no
// compiten entre si: en una fila con cuatro botones de colores distintos no se destaca
// ninguno.
.caja-accion
	display: inline-flex
	align-items: center
	gap: 7px
	height: 34px
	padding: 0 12px
	border-radius: 8px
	border: 1px solid var(--color-border)
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.8rem
	font-weight: 600
	line-height: 1
	white-space: nowrap
	cursor: pointer
	transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease

	i
		font-size: 0.9rem
		line-height: 1

	.spinner-border
		width: 0.9rem
		height: 0.9rem

	&:hover
		background: var(--bg-hover)
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)

	&:focus-visible
		outline: none
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25)

	&:disabled
		opacity: 0.6
		cursor: default

	&--abrir
		border-color: var(--caja-abierta-acento)
		background: var(--caja-abierta-fondo)
		color: var(--caja-abierta-texto)

		&:hover
			background: var(--caja-abierta-fondo-hover)

	&--cerrar
		border-color: var(--caja-cerrar-acento)
		background: var(--caja-cerrar-fondo)
		color: var(--caja-cerrar-texto)

		&:hover
			background: var(--caja-cerrar-fondo)
			box-shadow: 0 1px 3px rgba(180, 68, 63, 0.20)
</style>
