<template>
	<b-modal
	v-model="visible_proxy"
	title="Resumen de asignación automática"
	ok-only
	ok-title="Entendido"
	ok-variant="primary"
	size="lg"
	scrollable
	@ok="on_confirm">
		<batch-images-summary-content :batch_result="batch_result"></batch-images-summary-content>
	</b-modal>
</template>
<script>
/**
 * Modal que aparece por Pusher al terminar una corrida de asignación automática de imágenes.
 * El detalle (contadores, acordeón por artículo, candidatas descartadas) vive en el componente
 * compartido `BatchImagesSummaryContent`, reusado también por el modal de historial
 * (`SmartImagesHistoryModal.vue`).
 */
export default {
	components: {
		BatchImagesSummaryContent: () => import('@/components/listado/components/selected-filtered-options/BatchImagesSummaryContent'),
	},
	props: {
		/**
		 * Controla visibilidad del modal (v-model).
		 */
		visible: {
			type: Boolean,
			default: false,
		},
		/**
		 * Payload recibido desde Pusher con el resumen del batch.
		 */
		batch_result: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Proxy para v-model del modal sin mutar la prop directamente.
		 */
		visible_proxy: {
			get() {
				return this.visible
			},
			set(value) {
				this.$emit('update:visible', value)
			},
		},
	},
	methods: {
		/**
		 * Emite confirmación al presionar Entendido para que el padre refresque el listado.
		 *
		 * @return {void}
		 */
		on_confirm() {
			this.$emit('confirmed')
		},
	},
}
</script>
