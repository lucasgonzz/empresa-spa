<template>
<b-modal
id="imagenes-visor"
size="lg"
centered
hide-footer
:visible="!!imagen"
:title="imagen ? imagen.titulo : ''"
modal-class="img-det-visor"
body-class="img-det-visor__cuerpo"
@hidden="$emit('cerrar')">
	<template v-if="imagen">
		<div class="img-det-visor__marco">
			<img
			:src="imagen.url"
			:alt="imagen.titulo"
			class="img-det-visor__img"
			data-testid="imagenes-visor-imagen">
		</div>
		<p
		v-if="imagen.detalle"
		class="img-det-visor__detalle">
			{{ imagen.detalle }}
		</p>
	</template>
</b-modal>
</template>
<script>
/**
 * La imagen de un artículo en grande, para decidir si aprobarla sin tener que abrir el artículo.
 * Se abre encima del detalle de la búsqueda (bootstrap-vue apila los dos modales) y al cerrarse
 * avisa con `cerrar` para que el padre suelte la imagen.
 */
export default {
	props: {
		/** { url, titulo, detalle } o null (cerrado). */
		imagen: {
			type: Object,
			default: null,
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el modal cuelga de <body>. Colores por token.
.img-det-visor__cuerpo
	padding: 16px 20px 20px

.img-det-visor__marco
	display: flex
	align-items: center
	justify-content: center
	min-height: 240px
	padding: 12px
	border-radius: 12px
	// Mismo fondo que las miniaturas: deja ver donde termina la foto, que es lo que hay que mirar
	// para saber si el fondo es blanco.
	background: var(--bg-section, #f8f9fa)
	border: 1px solid var(--color-border-secondary, #e9ecef)

.img-det-visor__img
	display: block
	max-width: 100%
	max-height: 70vh
	width: auto
	height: auto
	object-fit: contain

.img-det-visor__detalle
	margin: 12px 0 0
	font-size: 0.85rem
	line-height: 1.4
	text-align: center
	color: var(--color-text-secondary, #6c757d)
</style>
