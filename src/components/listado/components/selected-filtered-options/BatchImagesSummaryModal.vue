<template>
	<b-modal
	v-model="visible_proxy"
	title="Resumen de asignación automática"
	ok-only
	ok-title="Entendido"
	ok-variant="primary"
	size="xl"
	scrollable
	body-class="batch-summary-modal-body"
	@ok="on_confirm">
		<!--
			🔴 El `data-tour` va en el CONTENIDO y no en el `b-modal`, y esto se midio contra
			bootstrap-vue: `BModal` tiene `inheritAttrs: false` y baja los atributos sueltos al div
			EXTERIOR del portal, que es `position: absolute` y mide 0x0 (adentro solo tiene cosas
			`fixed`). El motor del tour descarta cualquier elemento de menos de 2px de lado, asi que
			un `data-tour` en el `b-modal` no lo ve nunca.

			Puesto aca cae en el `<div class="batch-summary-content">` de
			`BatchImagesSummaryContent`, que es una caja real. Y no duplica: el mismo componente lo
			reusa `SmartImagesHistoryModal.vue`, pero el atributo esta en ESTE uso.
		-->
		<batch-images-summary-content
		data-tour="listado.modal_resumen_imagenes"
		:batch_result="batch_result"></batch-images-summary-content>
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
