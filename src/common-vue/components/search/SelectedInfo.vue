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
//
// 🔴 Los colores del chip se arreglan ACA ADENTRO y no en _dark_theme.sass, aunque parezca el
// lugar natural: este <style> es `scoped`, asi que cada selector sale compilado con el atributo
// [data-v-...] y una regla escrita en la hoja global no le llega (perderia por especificidad).
// Los TOKENS si atraviesan el scope sin problema, porque son custom properties que se heredan
// desde <html>: por eso alcanza con usarlos aca. Es el mismo camino que ya toman otros
// componentes scopeados del repo.
.selected-info
	display: inline-flex
	align-items: center
	gap: 2px
	max-width: 100%
	// Token con el literal claro de hoy de fallback (7/9/2026). El `@if ($theme == 'dark')` que
	// habia aca no compilaba nunca --`$theme` es de compilacion y vale siempre 'light'-- y por eso
	// Lucas veia la seleccion con fondo claro adentro de un modal oscuro. --bg-section queda un
	// escalon por debajo de --bg-card, que es el fondo del modal: el chip se despega igual que en
	// claro se despega de la tarjeta blanca.
	background: var(--bg-section, #f2f3f4)
	border: 1px solid var(--color-border-secondary, #e2e4e7)
	border-radius: 6px
	padding: 2px 4px 2px 10px

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
		// El azul del tema: en oscuro es el #4da3ff de --color-primary, no el #6cb2ff que declaraba
		// la rama muerta. Un solo azul para todo el sistema.
		color: var(--color-primary, #007bff)
		font-size: 0.9rem
		&:hover
			text-decoration: underline

	.selected-info__clear
		display: flex
		align-items: center
		justify-content: center
		flex: 0 0 auto
		width: 22px
		height: 22px
		padding: 0
		border-radius: 50%
		color: var(--color-text-secondary, #86868b)
		font-size: 0.8rem
		// El hover va a --bg-hover, que es el unico de los tres fondos que queda POR ENCIMA de
		// --bg-section (el fondo del chip) en los dos temas: si tomara --bg-card, en oscuro el
		// hover seria mas claro pero se confundiria con el fondo del modal.
		&:hover
			background: var(--bg-hover, #e4e6e8)
			color: var(--color-text-primary, #1d1d1f)
</style>
