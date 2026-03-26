<template>
	<b-modal
	v-if="sale"
	:id="modal_id"
	title="Configurar columnas de PDF (Remito)"
	size="xl"
	modal-class="props-to-show-modal"
	body-class="props-to-show-body"
	footer-class="props-to-show-footer">
		<b-form-row class="m-b-0">
			<b-col md="6">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Nombre del perfil</strong>
					</label>
					<b-form-input
					placeholder="Ingrese nombre"
					v-model.trim="local_profile_name"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="6">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Tipo de hoja</strong>
					</label>
					<b-form-select
					:options="sheet_type_options"
					v-model="local_sheet_type_id"></b-form-select>
				</b-form-group>
			</b-col>
		</b-form-row>

		<b-form-row class="m-b-0">
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Ancho (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="40"
					max="2000"
					v-model.number="local_width_mm"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Alto (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="40"
					max="2000"
					v-model.number="local_height_mm"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Margen por lado (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="0"
					max="500"
					v-model.number="local_margin_mm"></b-form-input>
				</b-form-group>
			</b-col>
		</b-form-row>

		<b-form-row class="m-b-0">
			<b-col md="4" class="d-flex align-items-center">
				<b-form-checkbox
				v-model="local_is_afip_ticket">
					Factura de ARCA
				</b-form-checkbox>
			</b-col>
			<b-col md="4" class="d-flex align-items-center">
				<b-form-checkbox
				v-model="local_show_totals_on_each_page">
					Mostrar totales en cada hoja
				</b-form-checkbox>
			</b-col>
		</b-form-row>

		<pdf-columns-preferences-config-modal
		:config_rows="pdf_config_rows"
		:paper_width_mm.sync="local_paper_width_mm"
		:printable_width_mm.sync="local_printable_width_mm"
		:show_size_controls="false"></pdf-columns-preferences-config-modal>

		<template #modal-footer>
			<b-button
			variant="secondary"
			@click="$bvModal.hide(modal_id)">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			:disabled="remaining_width_mm < 0"
			@click="$emit('save_profile')">
				Guardar perfil
			</b-button>
		</template>
	</b-modal>
</template>

<script>
export default {
	components: {
		PdfColumnsPreferencesConfigModal: () => import('@/common-vue/components/pdf/PdfColumnsPreferencesConfigModal.vue'),
	},
	props: {
		sale: Object,
		modal_id: String,
		pdf_config_rows: {
			type: Array,
			default() {
				return []
			},
		},
		paper_width_mm: {
			type: Number,
			default: 297,
		},
		printable_width_mm: {
			type: Number,
			default: 277,
		},
		margin_mm: {
			type: Number,
			default: 5,
		},
		remaining_width_mm: {
			type: Number,
			default: 0,
		},
		profile_name: {
			type: String,
			default: '',
		},
		sheet_type_id: {
			type: [Number, String, null],
			default: null,
		},
		is_afip_ticket: {
			type: [Boolean, Number, String],
			default: false,
		},
		show_totals_on_each_page: {
			type: [Boolean, Number, String],
			default: false,
		},
		sheet_type_options: {
			type: Array,
			default() {
				return []
			},
		},
	},
	computed: {
		/**
		 * Proxy local para ancho de hoja.
		 */
		local_paper_width_mm: {
			get() {
				return this.paper_width_mm
			},
			set(value) {
				this.$emit('update:paper_width_mm', Number(value || 0))
			},
		},
		/**
		 * Proxy local para ancho imprimible.
		 */
		local_printable_width_mm: {
			get() {
				return this.printable_width_mm
			},
			set(value) {
				this.$emit('update:printable_width_mm', Number(value || 0))
			},
		},
		/**
		 * Alias width solicitado por UI para paper_width_mm.
		 */
		local_width_mm: {
			get() {
				return this.local_paper_width_mm
			},
			set(value) {
				this.local_paper_width_mm = Number(value || 0)
			},
		},
		/**
		 * Alias height solicitado por UI para printable_width_mm.
		 */
		local_height_mm: {
			get() {
				return this.local_printable_width_mm
			},
			set(value) {
				this.local_printable_width_mm = Number(value || 0)
			},
		},
		/**
		 * Proxy local para margen lateral por lado.
		 */
		local_margin_mm: {
			get() {
				return this.margin_mm
			},
			set(value) {
				this.$emit('update:margin_mm', Number(value || 0))
			},
		},
		/**
		 * Proxy local del nombre editable del perfil.
		 */
		local_profile_name: {
			get() {
				return this.profile_name
			},
			set(value) {
				this.$emit('update:profile_name', value || '')
			},
		},
		/**
		 * Proxy local del tipo de hoja seleccionado.
		 */
		local_sheet_type_id: {
			get() {
				return this.sheet_type_id
			},
			set(value) {
				this.$emit('update:sheet_type_id', value ? Number(value) : null)
			},
		},
		/**
		 * Proxy local del flag AFIP del perfil.
		 */
		local_is_afip_ticket: {
			get() {
				return this.is_afip_ticket === true || this.is_afip_ticket === 1 || this.is_afip_ticket === '1'
			},
			set(value) {
				this.$emit('update:is_afip_ticket', !!value)
			},
		},
		/**
		 * Proxy local del flag para mostrar totales en cada hoja.
		 */
		local_show_totals_on_each_page: {
			get() {
				return this.show_totals_on_each_page === true
					|| this.show_totals_on_each_page === 1
					|| this.show_totals_on_each_page === '1'
			},
			set(value) {
				this.$emit('update:show_totals_on_each_page', !!value)
			},
		},
	},
}
</script>
