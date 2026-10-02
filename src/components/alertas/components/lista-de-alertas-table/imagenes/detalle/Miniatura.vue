<template>
<button
v-if="ampliable && url && !rota"
type="button"
class="img-det-mini img-det-mini--boton"
:class="'img-det-mini--' + tamano"
:title="titulo_boton"
@click="$emit('ampliar')">
	<img
	:src="url"
	:alt="alt"
	loading="lazy"
	:referrerpolicy="externa ? 'no-referrer' : null"
	@error="al_fallar">
	<span
	class="img-det-mini__ampliar"
	aria-hidden="true">
		<i class="bi bi-arrows-angle-expand"></i>
	</span>
</button>
<span
v-else
class="img-det-mini"
:class="['img-det-mini--' + tamano, { 'img-det-mini--vacia': !url || rota }]">
	<img
	v-if="url && !rota"
	:src="url"
	:alt="alt"
	loading="lazy"
	:referrerpolicy="externa ? 'no-referrer' : null"
	@error="al_fallar">
	<i
	v-else
	class="bi bi-image"
	aria-hidden="true"></i>
</span>
</template>
<script>
/**
 * Miniatura de una imagen del detalle de una búsqueda: la elegida de un artículo (a revisar o
 * asignada) o una candidata del diagnóstico.
 *
 * Con `ampliable` es un botón (se ve en grande al tocarlo); sin eso, una caja quieta. Las dos
 * versiones comparten la misma caja de tamaño fijo, así una imagen rota o ausente no mueve nada
 * de la fila: queda el ícono de imagen en el mismo lugar.
 *
 * Una imagen que no carga es lo esperable acá —muchas candidatas justamente se descartaron por
 * no poder bajarse—, así que el error no se reintenta: se muestra el ícono de imagen y listo.
 */
export default {
	props: {
		/** URL de la imagen (null = sin imagen). */
		url: {
			type: String,
			default: null,
		},
		/** Texto alternativo (el nombre del artículo). */
		alt: {
			type: String,
			default: '',
		},
		/**
		 * 'grande' (a revisar), 'chica' (asignadas), 'mini' (candidatas del diagnóstico) o 'visor'
		 * (la imagen elegida, en grande, cuando se despliegan las otras de un artículo a revisar).
		 */
		tamano: {
			type: String,
			default: 'chica',
		},
		/** true para que al tocarla emita `ampliar`. */
		ampliable: {
			type: Boolean,
			default: false,
		},
		/**
		 * true si la imagen es de un sitio de afuera (las candidatas de Google). Va sin Referer:
		 * muchos sitios bloquean las imágenes pedidas desde otro dominio (anti-hotlinking) y no
		 * hace falta contarles desde qué sistema se las mira.
		 */
		externa: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** true si el <img> ya falló una vez (no se reintenta). */
			rota: false,
		}
	},
	computed: {
		titulo_boton() {
			return this.alt ? 'Ver en grande: ' + this.alt : 'Ver en grande'
		},
	},
	watch: {
		/** La misma instancia se reusa con otra imagen (paginación): se vuelve a intentar. */
		url() {
			this.rota = false
		},
	},
	methods: {
		/**
		 * El <img> no cargó: se muestra el ícono y se avisa (`fallo`) por si quien la usa tiene otra
		 * versión de la misma imagen a mano (la miniatura del buscador cuando el original no abre).
		 */
		al_fallar() {
			this.rota = true
			this.$emit('fallo')
		},
	},
}
</script>
<style lang="sass">
.img-det-mini
	position: relative
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 auto
	padding: 0
	overflow: hidden
	border-radius: 10px
	border: 1px solid var(--color-border-secondary, #e9ecef)
	// Las fotos de producto suelen venir con fondo blanco: sobre --bg-section se ve el borde de la
	// foto, que es justo lo que hay que mirar para juzgar el fondo.
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)

	img
		width: 100%
		height: 100%
		object-fit: contain

	.bi-image
		font-size: 1.2rem
		opacity: .6

.img-det-mini--grande
	width: 112px
	height: 112px

.img-det-mini--chica
	width: 64px
	height: 64px
	border-radius: 8px

.img-det-mini--mini
	width: 88px
	height: 88px
	border-radius: 8px

// La imagen elegida, grande, al desplegar las otras de un artículo.
.img-det-mini--visor
	width: 260px
	height: 260px

// Boton: sin el trato de boton de Bootstrap ni la sombra global de _inputs.sass.
.img-det-mini--boton
	cursor: zoom-in
	box-shadow: none
	transition: border-color .15s ease, transform .15s ease

	&:hover
		border-color: var(--color-primary, #007bff)

		.img-det-mini__ampliar
			opacity: 1

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

// El icono de "ampliar" aparece al pasar el mouse, abajo a la derecha, sobre un circulo claro.
.img-det-mini__ampliar
	position: absolute
	right: 5px
	bottom: 5px
	width: 22px
	height: 22px
	border-radius: 50%
	display: flex
	align-items: center
	justify-content: center
	font-size: 10px
	background: var(--bg-card, #fff)
	color: var(--color-text-primary, #212529)
	box-shadow: 0 1px 3px var(--shadow-color, rgba(99, 99, 99, .2))
	opacity: 0
	transition: opacity .15s ease

// En pantallas tactiles no hay hover: el icono queda siempre visible para que se entienda que se
// puede tocar.
@media (hover: none)
	.img-det-mini__ampliar
		opacity: .85

@media (max-width: 575px)
	.img-det-mini--grande
		width: 88px
		height: 88px

	.img-det-mini--mini
		width: 76px
		height: 76px

	// Teléfono: el visor ocupa el ancho de la tarjeta (con tope) y se mantiene cuadrado.
	.img-det-mini--visor
		width: 100%
		max-width: 320px
		height: auto
		aspect-ratio: 1
</style>
