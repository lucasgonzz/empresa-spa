<template>
	<div
	class="m-t-10"
	v-if="show_selected && selected_model && (!prop || (prop && !prop.belongs_to_many && (!prop.has_many || (prop.has_many && !prop.has_many.models_from_parent_prop))))">
		<div
		class="a-center">
			<div class="selected-info">
				<button
				type="button"
				class="selected-info__name"
				:id="'btn_edit_selected_'+model_name"
				@click="setModel(selected_model_to_show, model_name)">
					{{ selected_model_name }}
				</button>
				<button
				v-if="!is_disabled"
				type="button"
				class="selected-info__clear"
				title="Quitar selección"
				aria-label="Quitar selección"
				@click="clearSelected">
					<i class="icon-cancel"></i>
				</button>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		prop: Object,
		show_selected: Boolean,
		selected_model: Object,
		is_disabled: Boolean,
	},
	computed: {
		selected_model_to_show() {
			let model = this.modelsStoreFromName(this.model_name).find(_model => {
				return _model.id == this.selected_model.id
			})
			if (typeof model != 'undefined') {
				return model
			}
			return this.selected_model
		},
		selected_model_name() {
			if (this.selected_model) {
				let prop_key = this.propToFilter(this.model_name).key
				return this.selected_model[prop_key]
			}
			return null
		},
	},
	methods: {
		clearSelected() {
			this.$emit('clearSelected')
		},
	}
}
</script>
<style lang="sass" scoped>
@import '@/sass/_custom.scss'

// La seleccion hecha se muestra como un chip: el nombre adentro y una cruz chica al costado.
// Antes eran dos b-button del mismo peso visual (uno con contorno que decia "Limpiar seleccion" y
// otro link con el nombre) compitiendo por decir una sola cosa. La funcionalidad es la misma: el
// nombre abre el formulario del modelo, la cruz limpia.
.selected-info
	display: inline-flex
	align-items: center
	gap: 2px
	max-width: 100%
	background: #f2f3f4
	border: 1px solid #e2e4e7
	border-radius: 6px
	padding: 2px 4px 2px 10px
	@if ($theme == 'dark')
		background: #2b2b2b
		border-color: #444

	// Los dos botones son <button> nativos, y common-vue/sass/_inputs.sass le pone a TODO button
	// una sombra (box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px). Sin apagarla, el chip sale
	// con dos sombritas adentro. No sacar estos box-shadow: none pensando que sobran.
	.selected-info__name, .selected-info__clear
		background: none
		border: none
		box-shadow: none
		font: inherit
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease

		// Foco visible pero discreto: esto se navega con teclado y sin reemplazo quedaria invisible.
		&:focus
			outline: none
			box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25)

	.selected-info__name
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		padding: 2px 4px
		color: #007bff
		font-size: 0.9rem
		&:hover
			text-decoration: underline
		@if ($theme == 'dark')
			color: #6cb2ff

	.selected-info__clear
		display: flex
		align-items: center
		justify-content: center
		flex: 0 0 auto
		width: 22px
		height: 22px
		padding: 0
		border-radius: 50%
		color: #86868b
		font-size: 0.8rem
		&:hover
			background: #e4e6e8
			color: #1d1d1f
		@if ($theme == 'dark')
			&:hover
				background: #3a3a3a
				color: #FFF
</style>
