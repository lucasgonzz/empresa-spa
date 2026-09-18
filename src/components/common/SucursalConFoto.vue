<template>
	<!--
		Avatar redondeado + nombre de una sucursal, para mostrar la foto (columna
		addresses.image_url, cargable desde el ABM y también por el asistente de IA) junto
		al nombre en todos los lugares donde hoy la sucursal aparece por su nombre pelado:
		la columna de Caja, el resumen de caja y el reporte "Vendido por sucursal".

		Presentacional puro: recibe la `address` ya resuelta y no pide nada. Si no hay
		`image_url` (o la imagen 404ea) cae a las iniciales del nombre, y si tampoco hay
		nombre, a un ícono de local. Misma degradación que TableThumbnailImages, pero sin
		cartel: acá el avatar acompaña al nombre, no es el dato.
	-->
	<span
	class="sucursal-con-foto"
	:class="'sucursal-con-foto--' + tamano">
		<span
		class="sucursal-con-foto__avatar"
		aria-hidden="true">
			<img
			v-if="url_imagen"
			class="sucursal-con-foto__img"
			:src="url_imagen"
			:alt="nombre"
			@error="al_fallar_imagen">
			<span
			v-else-if="iniciales"
			class="sucursal-con-foto__iniciales">{{ iniciales }}</span>
			<i
			v-else
			class="bi bi-shop"></i>
		</span>
		<span
		v-if="mostrar_nombre"
		class="sucursal-con-foto__nombre">{{ nombre }}</span>
	</span>
</template>
<script>
export default {
	props: {
		/**
		 * La sucursal ya resuelta (el modelo `address`). Puede venir null: ahí el
		 * componente muestra el fallback en vez de romper el render de la fila.
		 */
		address: {
			type: Object,
			default: null,
		},
		/**
		 * 'sm' para lugares apretados (filas de tabla, barras) y 'md' (default) para
		 * listas y leyendas. Cualquier otro valor cae a 'md' por el validator.
		 */
		tamano: {
			type: String,
			default: 'md',
			validator: function (valor) {
				return ['sm', 'md'].indexOf(valor) != -1
			},
		},
		/**
		 * En false queda solo el avatar (por si algún lugar ya escribe el nombre al lado).
		 */
		mostrar_nombre: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			// Se prende cuando la imagen falla al cargar: recién ahí se cae a las iniciales,
			// para no parpadear el fallback mientras la foto todavía viaja.
			imagen_fallo: false,
		}
	},
	computed: {
		/**
		 * El nombre de la sucursal. `street` es el "Nombre" del ABM; si estuviera vacío se
		 * cae al domicilio, y si tampoco hay, a un rótulo genérico.
		 *
		 * @returns {String}
		 */
		nombre() {
			if (!this.address) {
				return 'Sucursal'
			}
			return this.address.street || this.address.street_number || 'Sucursal'
		},
		/**
		 * La foto, o null si no hay o si falló la carga (ahí manda el fallback).
		 *
		 * @returns {String|null}
		 */
		url_imagen() {
			if (this.imagen_fallo || !this.address) {
				return null
			}
			return this.address.image_url || null
		},
		/**
		 * Una o dos iniciales del nombre, para el fallback sin foto. Vacío si el nombre es
		 * el rótulo genérico (ahí va el ícono).
		 *
		 * @returns {String}
		 */
		iniciales() {
			let nombre = this.nombre
			if (!nombre || nombre == 'Sucursal') {
				return ''
			}
			let palabras = nombre.trim().split(/\s+/).filter(function (parte) {
				return parte.length
			})
			if (!palabras.length) {
				return ''
			}
			let primera = palabras[0].charAt(0)
			let segunda = palabras.length > 1 ? palabras[1].charAt(0) : ''
			return (primera + segunda).toUpperCase()
		},
	},
	watch: {
		/**
		 * La misma celda cambia de sucursal al scrollear la tabla o al reordenar: se
		 * reintenta la imagen de la nueva.
		 */
		'address.image_url': function () {
			this.imagen_fallo = false
		},
	},
	methods: {
		al_fallar_imagen() {
			this.imagen_fallo = true
		},
	},
}
</script>
<style lang="sass" scoped>
.sucursal-con-foto
	display: inline-flex
	align-items: center
	gap: 8px
	min-width: 0
	max-width: 100%

	&__avatar
		flex-shrink: 0
		border-radius: 999px
		overflow: hidden
		display: inline-flex
		align-items: center
		justify-content: center
		// El fondo neutro cae del mismo lado del panel en los dos temas (--bg-hover), así
		// el avatar sin foto se lee sobrio sin depender del borde. El ícono/las iniciales
		// van en el gris secundario, que ya está resuelto para claro y oscuro.
		background: var(--bg-hover, #f1f3f5)
		color: var(--color-text-secondary, #6c757d)
		border: 1px solid var(--color-border, #dee2e6)

	&__img
		width: 100%
		height: 100%
		object-fit: cover
		display: block

	&__iniciales
		font-weight: 600
		line-height: 1
		text-transform: uppercase

	&__nombre
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		color: var(--color-text-primary, #212529)

	// Default: filas de tabla y listas.
	&--md
		.sucursal-con-foto__avatar
			width: 30px
			height: 30px
			font-size: .72rem

	// Apretado: barras, leyendas densas.
	&--sm
		gap: 6px

		.sucursal-con-foto__avatar
			width: 22px
			height: 22px
			font-size: .62rem

		.sucursal-con-foto__nombre
			font-size: .85rem
</style>
