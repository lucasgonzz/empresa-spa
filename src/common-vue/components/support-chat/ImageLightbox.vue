<template>
	<b-modal
		v-model="modal_visible"
		modal-class="support-image-lightbox-modal"
		body-class="support-image-lightbox-body p-0"
		hide-header
		hide-footer
		centered
		size="xl"
		@hidden="on_hidden">
		<img
			v-if="image_url"
			:src="image_url"
			class="support-image-lightbox-img"
			alt="Imagen ampliada" />
	</b-modal>
</template>

<script>
/**
 * Visor de imagen ampliada en la misma página (b-modal sobre el panel de soporte).
 */
export default {
	name: 'SupportImageLightbox',
	props: {
		/** Controla visibilidad (.sync / update:show). */
		show: {
			type: Boolean,
			default: false,
		},
		/** URL de la imagen a mostrar. */
		image_url: {
			type: String,
			default: '',
		},
	},
	computed: {
		/**
		 * Puente v-model con b-modal.
		 * @returns {boolean}
		 */
		modal_visible: {
			get() {
				return this.show
			},
			set(value) {
				this.$emit('update:show', value)
			},
		},
	},
	methods: {
		/**
		 * Al cerrar el modal (backdrop, Escape o X del framework).
		 */
		on_hidden() {
			this.$emit('close')
		},
	},
}
</script>

<style>
/* Por encima del overlay de soporte (z-index 1053) */
body .modal.support-image-lightbox-modal {
	z-index: 1110 !important;
}
body > .modal-backdrop:last-of-type {
	z-index: 1105 !important;
}

.support-image-lightbox-body {
	background: #1a1a1a;
	text-align: center;
}

.support-image-lightbox-img {
	display: block;
	max-width: 100%;
	max-height: 85vh;
	width: auto;
	height: auto;
	margin: 0 auto;
	object-fit: contain;
}
</style>
