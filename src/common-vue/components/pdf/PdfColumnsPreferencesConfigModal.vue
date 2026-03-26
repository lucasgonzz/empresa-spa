<template>
	<div>
		<div class="d-flex align-items-end justify-content-between m-b-10">
			<div
			class="d-flex align-items-center"
			v-if="show_size_controls">
				<b-form-group
				class="m-r-10 m-b-0"
				label="Ancho hoja (mm)">
					<b-form-input
					style="max-width: 120px"
					type="number"
					min="40"
					max="2000"
					v-model.number="local_paper_width_mm"
					@input="emit_paper_width"></b-form-input>
				</b-form-group>

				<b-form-group
				class="m-r-10 m-b-0"
				label="Ancho imprimible (mm)">
					<b-form-input
					style="max-width: 120px"
					type="number"
					min="40"
					max="2000"
					v-model.number="local_printable_width_mm"
					@input="emit_printable_width"></b-form-input>
				</b-form-group>

				<b-button-group class="m-b-2">
					<b-button
					size="sm"
					variant="outline-secondary"
					@click="set_preset(297, 277)">
						A4
					</b-button>
					<b-button
					size="sm"
					variant="outline-secondary"
					@click="set_preset(80, 72)">
						Comandera 80
					</b-button>
				</b-button-group>
			</div>
			<div v-else></div>

			<div class="width-status">
				<p class="m-0">
					<strong>Usado:</strong> {{ used_width_mm }}mm
				</p>
				<p class="m-0">
					<strong>Disponible:</strong>
					<span :class="remaining_width_mm < 0 ? 'text-danger' : 'text-success'">
						{{ remaining_width_mm }}mm
					</span>
				</p>
			</div>
		</div>

		<b-alert
		v-if="remaining_width_mm < 0"
		show
		variant="danger"
		class="m-b-10">
			La suma de anchos visibles supera el ancho imprimible por {{ Math.abs(remaining_width_mm) }}mm.
		</b-alert>

		<columns-preferences-config-modal
		:config_rows="config_rows"></columns-preferences-config-modal>
	</div>
</template>

<script>
import ColumnsPreferencesConfigModal from '@/common-vue/components/view/header/props-to-show/ColumnsPreferencesConfigModal.vue'

export default {
	name: 'PdfColumnsPreferencesConfigModal',
	components: {
		ColumnsPreferencesConfigModal,
	},
	props: {
		config_rows: {
			type: Array,
			required: true,
		},
		paper_width_mm: {
			type: Number,
			default: 297,
		},
		printable_width_mm: {
			type: Number,
			default: 277,
		},
		show_size_controls: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			local_paper_width_mm: this.paper_width_mm,
			local_printable_width_mm: this.printable_width_mm,
		}
	},
	watch: {
		paper_width_mm(value) {
			this.local_paper_width_mm = value
		},
		printable_width_mm(value) {
			this.local_printable_width_mm = value
		},
	},
	computed: {
		used_width_mm() {
			return (this.config_rows || [])
				.filter(row => !!row.visible)
				.reduce((acc, row) => acc + Number(row.width || 0), 0)
		},
		remaining_width_mm() {
			return Number(this.local_printable_width_mm || 0) - this.used_width_mm
		},
	},
	methods: {
		emit_paper_width() {
			this.$emit('update:paper_width_mm', Number(this.local_paper_width_mm || 0))
		},
		emit_printable_width() {
			this.$emit('update:printable_width_mm', Number(this.local_printable_width_mm || 0))
		},
		set_preset(paper_width_mm, printable_width_mm) {
			this.local_paper_width_mm = paper_width_mm
			this.local_printable_width_mm = printable_width_mm
			this.emit_paper_width()
			this.emit_printable_width()
		},
	},
}
</script>

