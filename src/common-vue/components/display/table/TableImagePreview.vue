<template>
	<!--
		El portal de b-modal lleva el visor a body: dentro de una celda, mask-image y el
		z-index del tbody lo encierran debajo del encabezado aunque el fixed tenga z-index alto.
		No usar static ni devolverlo al DOM de la tabla (ticket de soporte #18).
	-->
	<b-modal
	ref="modal"
	:visible="true"
	aria-label="Vista previa de artículo"
	modal-class="table-image-preview"
	dialog-class="table-image-preview__dialog"
	content-class="table-image-preview__content"
	body-class="table-image-preview__body"
	hide-header
	hide-footer
	centered
	no-fade
	@shown="focus_close"
	@hidden="$emit('close')">
		<button
		ref="close"
		type="button"
		class="table-image-preview__close"
		aria-label="Cerrar imagen ampliada"
		@click.stop.prevent="$refs.modal.hide()">
			×
		</button>
		<img
		class="table-image-preview__image"
		:src="image_url"
		alt="Vista previa de artículo">
	</b-modal>
</template>
<script>
export default {
	props: {
		image_url: {
			type: String,
			required: true,
		},
	},
	methods: {
		focus_close() {
			this.$refs.close.focus({ preventScroll: true })
		},
	},
}
</script>
<style lang="sass">
.modal.table-image-preview
	.modal-dialog.table-image-preview__dialog
		width: fit-content
		max-width: calc(100% - 2rem)
		margin: 1rem auto
		min-height: calc(100% - 2rem)

	.modal-content.table-image-preview__content
		background: var(--bg-card, #fff)
		border: 0
		border-radius: .5rem
		box-shadow: 0 10px 25px rgba(0,0,0,.35)

	.modal-body.table-image-preview__body
		padding: .75rem
		border-radius: .5rem

.table-image-preview__image
	display: block
	width: auto
	height: auto
	max-width: calc(100vw - 3.5rem)
	max-height: calc(100vh - 3.5rem)
	object-fit: contain
	border-radius: 6px

.table-image-preview__close
	position: absolute
	top: .25rem
	right: .25rem
	width: 2rem
	height: 2rem
	border: 0
	border-radius: 999px
	background: rgba(0,0,0,.75)
	color: #fff
	font-size: 1.4rem
	line-height: 1
	cursor: pointer
</style>
