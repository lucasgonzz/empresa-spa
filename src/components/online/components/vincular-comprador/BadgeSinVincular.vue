<template>
	<!--
		El badge que marca a un comprador de la tienda que todavía no está vinculado a ningún cliente
		del sistema, dibujado junto a su nombre en la tabla de Pedidos. Es un BOTÓN, no un rótulo:
		al tocarlo se abre el modal para elegir con qué cliente vincularlo.

		Se dibuja solo si `sin_vincular(buyer)` (regla única, ver ./sin_vincular.js): un comprador ya
		vinculado no muestra nada, y la celda se ve igual que siempre.

		Es un <button> nativo y no un <b-button>/<b-badge>: la píldora de 24 px tiene que entrar en el
		renglón de la tabla sin estirar la fila, y un .btn de bootstrap le impone alto, padding y
		colores que habría que ir desarmando uno por uno.
	-->
	<button
	v-if="pendiente"
	type="button"
	class="badge-sin-vincular"
	data-testid="vincular-comprador-badge"
	:title="ayuda"
	:aria-label="etiqueta_accesible"
	@click.stop="abrir">
		<i class="bi bi-link-45deg"></i>
		<!--
			🔴 El margen va en el <span> y NO en el <i>: con el `whitespace: condense` de Vue, un <i> y un
			<span> en líneas separadas quedan PEGADOS (se pierde el espacio entre ellos), y un margen
			puesto en el <i> no separa nada si el texto es lo que se pega.
		-->
		<span class="badge-sin-vincular__texto">
			Sin vincular
		</span>
	</button>
</template>
<script>
import sin_vincular from '@/components/online/components/vincular-comprador/sin_vincular'

/** Qué significa el badge y qué pasa al tocarlo (tooltip y descripción para lectores de pantalla). */
const AYUDA = 'Este cliente de la tienda no está vinculado a ningún cliente del sistema. Tocá para vincularlo.'

/**
 * Badge-botón "Sin vincular" de la tabla de Pedidos.
 *
 * No hace nada por sí mismo con el vínculo: avisa por el bus global (`$root`) que hay que abrir el
 * modal de vincular, y quien lo escucha es `vincular-comprador/Index.vue`, montado UNA sola vez en
 * la vista de Tienda online. Se avisa por evento y no por prop/`$refs` porque el badge vive
 * adentro de la tabla genérica (varios niveles de slots más abajo) y la tabla se dibuja una vez
 * por pedido: no puede cargar con un modal por fila.
 */
export default {
	props: {
		/** Comprador del pedido (`order.buyer`). Sin comprador (pedido de invitado) no se dibuja. */
		buyer: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * true si hay que dibujar el badge (comprador sin vincular, colgante incluido).
		 *
		 * @returns {Boolean}
		 */
		pendiente() {
			return sin_vincular(this.buyer)
		},
		/**
		 * Texto del tooltip.
		 *
		 * @returns {String}
		 */
		ayuda() {
			return AYUDA
		},
		/**
		 * Nombre accesible del botón. Arranca con el texto que se ve ("Sin vincular") y sigue con la
		 * explicación: si el nombre accesible no contuviera el texto visible, quien maneja la pantalla
		 * por voz diría "Sin vincular" y el lector no encontraría ningún botón con ese nombre.
		 *
		 * @returns {String}
		 */
		etiqueta_accesible() {
			return 'Sin vincular. ' + AYUDA
		},
	},
	methods: {
		/**
		 * Pide abrir el modal de vincular para este comprador.
		 *
		 * El `.stop` del template no es adorno: la fila entera tiene su propio @click (abre el modal del
		 * pedido), y sin él este toque abriría los dos modales a la vez.
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$root.$emit('vincular-comprador:abrir', { buyer: this.buyer })
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/vincular-comprador/_tokens'

// Píldora de 24 px: entra en el renglón de 25 px de la tabla sin estirar la fila. Ámbar suave, con
// los tokens de _tokens.sass (claro y oscuro). Las clases van sin `scoped` a propósito y con el
// prefijo del componente: los tokens de arriba tienen que ser globales (:root), y una sola hoja
// que mezcle las dos cosas es más fácil de leer que dos bloques.
.badge-sin-vincular
	display: inline-flex
	align-items: center
	// Nunca se achica: si el nombre es largo, el que se recorta con puntos suspensivos es el nombre.
	flex-shrink: 0
	height: 24px
	margin: 0
	padding: 0 10px 0 7px
	border: 1px solid var(--vincular-pendiente-borde)
	border-radius: 999px
	background: var(--vincular-pendiente-fondo)
	color: var(--vincular-pendiente-texto)
	font-family: inherit
	font-size: 12px
	font-weight: 600
	line-height: 1
	white-space: nowrap
	cursor: pointer
	// 🔴 `box-shadow: none` en REPOSO, no solo en :hover. common-vue/sass/_inputs.sass le pone a TODO
	// <button> del sistema una sombra gris desplazada (`1.95px 1.95px`) que solo se apaga adentro de
	// un .modal o una .navbar; en una celda de tabla queda como una mancha pegada a la píldora.
	// Mismo motivo que en ventas/components/ClientBtn.vue.
	box-shadow: none
	transition: background-color 0.15s ease, border-color 0.15s ease

	&:hover
		background: var(--vincular-pendiente-fondo-hover)

	// El contorno del navegador se apaga explícitamente (el sistema ya lo hace con `*:focus` en
	// _app_vue.sass, pero esto no depende de que esa hoja esté cargada) y se reemplaza por el anillo
	// de abajo, que aparece solo con teclado (:focus-visible): el toque con el mouse no deja resto.
	&:focus
		outline: none

	// 🔴 El anillo va HACIA ADENTRO (un borde de 2 px en el color del texto) y no como el halo de
	// afuera que usan otros botones: la celda de la tabla tiene `overflow: hidden` (.cont-tr de
	// display/table/Tr.vue) y un halo de 3 px alrededor de una píldora de 24 px en un renglón de
	// 25 px queda recortado casi por completo.
	&:focus-visible
		border-color: var(--vincular-pendiente-texto)
		box-shadow: inset 0 0 0 1px var(--vincular-pendiente-texto)

	// El ícono lleva el color del texto (currentColor). Alto propio para que el glifo no estire la
	// píldora: el `line-height` de la tabla es de 25 px.
	.bi
		font-size: 14px
		line-height: 1
		flex-shrink: 0

	// Los `<i class="bi ...">` dibujan su glifo con un ::before que trae `vertical-align: -.125em`;
	// en un contenedor flex el centrado lo da align-items y ese ajuste sobra.
	.bi::before
		vertical-align: 0

.badge-sin-vincular__texto
	margin-left: 3px
</style>
