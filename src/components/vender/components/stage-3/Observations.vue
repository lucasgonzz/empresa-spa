<template>
	<!--
		Observaciones normales y ocultas de la venta.
		Textareas auto-expandibles: arrancan en una línea y crecen al agregar renglones.
	-->
	<div class="vender-stage__observations-fields">

		<!-- Observaciones visibles para el cliente / comprobante -->
		<div class="vender-stage__observations-field">
			<label
			class="vender-stage__observations-label"
			for="vender_observations_input">
				Observaciones
			</label>
			<textarea
			id="vender_observations_input"
			ref="observations_input"
			class="form-control vender-stage__observations-textarea"
			v-model="observations"
			rows="1"
			placeholder="Notas visibles en el comprobante"
			@input="on_observations_input"></textarea>
		</div>

		<!-- Observaciones internas (no se imprimen para el cliente) -->
		<div class="vender-stage__observations-field">
			<label
			class="vender-stage__observations-label"
			for="vender_observations_ocultas_input">
				Observaciones ocultas
			</label>
			<textarea
			id="vender_observations_ocultas_input"
			ref="observations_ocultas_input"
			class="form-control vender-stage__observations-textarea"
			v-model="observations_ocultas"
			rows="1"
			placeholder="Solo uso interno, no se imprimen"
			@input="on_observations_ocultas_input"></textarea>
		</div>

	</div>
</template>

<script>
export default {
	name: 'VenderStage3Observations',
	props: {
		/**
		 * Indica si la etapa 3 está expandida (para recalcular altura de textareas al mostrarse).
		 */
		stage_open: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Observaciones visibles enlazadas al store de vender.
		 *
		 * @returns {string}
		 */
		observations: {
			get() {
				return this.$store.state.vender.observations
			},
			set(value) {
				this.$store.commit('vender/setObservations', value)
			},
		},

		/**
		 * Observaciones ocultas enlazadas al store de vender.
		 *
		 * @returns {string}
		 */
		observations_ocultas: {
			get() {
				return this.$store.state.vender.observations_ocultas
			},
			set(value) {
				this.$store.commit('vender/setObservationsOcultas', value)
			},
		},
	},
	watch: {
		/**
		 * Recalcula alturas cuando la etapa se expande (el DOM pasa de display:none a visible).
		 */
		stage_open(is_open) {
			if (is_open) {
				this.$nextTick(() => {
					this.adjust_all_textareas()
				})
			}
		},

		/**
		 * Reajusta la altura cuando se cargan datos externos (venta previa, limpiar, etc.).
		 */
		observations() {
			this.$nextTick(() => {
				this.adjust_textarea_height('observations_input')
			})
		},

		/**
		 * Reajusta la altura cuando se cargan datos externos (venta previa, limpiar, etc.).
		 */
		observations_ocultas() {
			this.$nextTick(() => {
				this.adjust_textarea_height('observations_ocultas_input')
			})
		},
	},
	mounted() {
		/* Altura inicial acorde al contenido existente al montar la etapa */
		this.adjust_all_textareas()
	},
	methods: {
		/**
		 * Ajusta la altura de un textarea según su contenido actual.
		 *
		 * @param {string} ref_name Nombre del ref del textarea en el template.
		 * @returns {void}
		 */
		adjust_textarea_height(ref_name) {
			let textarea_el = this.$refs[ref_name]
			if (!textarea_el) {
				return
			}

			/* Resetear altura para medir scrollHeight con precisión */
			textarea_el.style.height = 'auto'

			/* Altura mínima de una línea (36px, alineada al resto de inputs de la etapa) */
			let min_height = 36
			let new_height = textarea_el.scrollHeight

			if (new_height < min_height) {
				new_height = min_height
			}

			textarea_el.style.height = new_height + 'px'
		},

		/**
		 * Recalcula la altura de ambos textareas (p. ej. al montar o tras cambios externos).
		 *
		 * @returns {void}
		 */
		adjust_all_textareas() {
			this.adjust_textarea_height('observations_input')
			this.adjust_textarea_height('observations_ocultas_input')
		},

		/**
		 * Recalcula la altura del textarea de observaciones normales tras cada edición.
		 *
		 * @returns {void}
		 */
		on_observations_input() {
			this.$nextTick(() => {
				this.adjust_textarea_height('observations_input')
			})
		},

		/**
		 * Recalcula la altura del textarea de observaciones ocultas tras cada edición.
		 *
		 * @returns {void}
		 */
		on_observations_ocultas_input() {
			this.$nextTick(() => {
				this.adjust_textarea_height('observations_ocultas_input')
			})
		},
	},
}
</script>
