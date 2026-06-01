<template>
	<b-modal
	scrollable
	size="lg"
	modal-class="update-models-modal"
	body-class="update-models-modal__body"
	:title="'Actualizar '+plural(model_name)"
	hide-footer
	:id="model_name+'-update-models'"
	@shown="on_modal_shown">

		<group-porps
		v-if="has_group_props"
		:group_items="visible_group_items"
		:selected_group_title="selected_group_title"
		@setSelectedGroup="set_selected_group_title"></group-porps>

		<p
		v-if="!visible_form_field_cards.length"
		class="text-muted text-center m-b-0">
			No hay propiedades disponibles para actualizar en este grupo.
		</p>

		<div
		v-for="field_card in visible_form_field_cards"
		:key="field_card.uid"
		class="update-field-card m-b-15">

			<p class="update-field-card__title m-b-10">
				{{ field_card.label }}
			</p>

			<!-- Número: disminuir %, aumentar % o setear valor -->
			<div
			v-if="field_card.kind == 'number'">
				<b-button-group
				class="update-field-card__mode-group w-100 m-b-10">
					<b-button
					v-for="mode_option in number_mode_options"
					:key="field_card.uid + '-mode-' + mode_option.value"
					size="sm"
					:variant="field_card.active_mode == mode_option.value ? 'primary' : 'outline-primary'"
					@click="set_number_mode(field_card, mode_option.value)">
						<i
						v-if="mode_option.icon"
						:class="mode_option.icon"></i>
						{{ mode_option.text }}
					</b-button>
				</b-button-group>

				<div
				v-if="field_card.active_mode == 'decrement'"
				class="update-field-card__input-block">
					<b-form-input
					:id="field_card.uid + '-decrement'"
					type="number"
					min="0"
					step="any"
					:placeholder="get_number_placeholder(field_card)"
					v-model="field_card.decrement_value"></b-form-input>
					<b-form-checkbox
					class="m-t-10"
					v-model="field_card.round_decrement"
					:value="1"
					:unchecked-value="0">
						Redondear resultado
					</b-form-checkbox>
				</div>

				<div
				v-else-if="field_card.active_mode == 'increment'"
				class="update-field-card__input-block">
					<b-form-input
					:id="field_card.uid + '-increment'"
					type="number"
					min="0"
					step="any"
					:placeholder="get_number_placeholder(field_card)"
					v-model="field_card.increment_value"></b-form-input>
					<b-form-checkbox
					class="m-t-10"
					v-model="field_card.round_increment"
					:value="1"
					:unchecked-value="0">
						Redondear resultado
					</b-form-checkbox>
				</div>

				<div
				v-else-if="field_card.active_mode == 'set'"
				class="update-field-card__input-block">
					<b-form-input
					:id="field_card.uid + '-set'"
					type="number"
					step="any"
					:placeholder="'Valor fijo para '+field_card.label"
					v-model="field_card.set_value"></b-form-input>
				</div>

				<p
				v-else
				class="update-field-card__hint text-muted m-b-0">
					Elegí una acción para modificar este campo en los registros seleccionados.
				</p>
			</div>

			<!-- Checkbox: no modificar, activar o desactivar -->
			<div
			v-else-if="field_card.kind == 'checkbox'">
				<b-button-group
				class="update-field-card__mode-group w-100">
					<b-button
					v-for="checkbox_option in checkbox_mode_options"
					:key="field_card.uid + '-chk-' + checkbox_option.value"
					size="sm"
					:variant="field_card.value === checkbox_option.value ? checkbox_option.variant : 'outline-secondary'"
					@click="field_card.value = checkbox_option.value">
						{{ checkbox_option.text }}
					</b-button>
				</b-button-group>
			</div>

			<!-- Select: valor a asignar -->
			<div
			v-else-if="field_card.kind == 'select'">
				<b-form-select
				v-model="field_card.value"
				:options="get_select_options(field_card)"></b-form-select>
				<p class="update-field-card__hint text-muted m-t-8 m-b-0">
					Dejá «Seleccione…» para no cambiar este campo.
				</p>
			</div>

			<!-- Search: relación por modal de búsqueda -->
			<div
			v-else-if="field_card.kind == 'search'">
				<search-component
				:id="field_card.store+'-'+field_card.prop_key+'-mass-update'"
				:model_name="modelNameFromRelationKey(field_card)"
				:prop="field_card"
				@setSelected="set_selected_search"></search-component>
				<p class="update-field-card__hint text-muted m-t-8 m-b-0">
					Buscá y elegí el registro a asignar, o dejá vacío para no modificar.
				</p>
			</div>
		</div>

		<btn-loader
		class="m-t-10"
		@clicked="update"
		id="btn_send_actualizar"
		text="Actualizar"
		:loader="loading"></btn-loader>
	</b-modal>
</template>
<script>
import GroupPorps from '@/common-vue/components/model/GroupPorps'

export default {
	props: {
		model_name: String,
		loading: Boolean,
	},
	components: {
		GroupPorps,
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		/**
		 * Propiedades del modelo marcadas para actualización masiva.
		 *
		 * @returns {Array}
		 */
		properties_to_update() {
			return this.propertiesToUpdate(this.model_name)
		},
		/**
		 * Definición completa del modelo (incluye separadores `group_title`).
		 *
		 * @returns {Array}
		 */
		model_properties() {
			return this.modelPropertiesFromName(this.model_name)
		},
		/**
		 * Indica si el modelo declara grupos con `group_title`.
		 *
		 * @returns {Boolean}
		 */
		has_group_props() {
			let has_groups = false
			this.model_properties.forEach(prop => {
				if (prop && prop.group_title) {
					has_groups = true
				}
			})
			return has_groups
		},
		/**
		 * Primer `group_title` del modelo; fallback para props legacy sin grupo explícito.
		 *
		 * @returns {String|null}
		 */
		first_group_title() {
			let first_title = null
			this.model_properties.forEach(prop => {
				if (!first_title && prop && prop.group_title) {
					first_title = prop.group_title
				}
			})
			return first_title
		},
		/**
		 * Items para `GroupPorps` / `HorizontalNav` con grupos que tienen al menos un campo visible.
		 *
		 * @returns {Array}
		 */
		visible_group_items() {
			let visible_group_titles = []

			this.model_properties.forEach(prop => {
				if (prop && prop.group_title && this.group_has_visible_update_fields(prop.group_title)) {
					let already_added = visible_group_titles.find(group_title => {
						return group_title == prop.group_title
					})
					if (!already_added) {
						visible_group_titles.push(prop.group_title)
					}
				}
			})

			let group_items = []
			visible_group_titles.forEach(group_title => {
				group_items.push({
					name: group_title,
				})
			})
			return group_items
		},
		/**
		 * Tarjetas de formulario visibles según grupo activo (o todas si no hay grupos).
		 *
		 * @returns {Array}
		 */
		visible_form_field_cards() {
			if (!this.has_group_props) {
				return this.form_field_cards
			}
			if (!this.selected_group_title) {
				return []
			}

			return this.form_field_cards.filter(field_card => {
				return field_card.group_title == this.selected_group_title
			})
		},
		/**
		 * Opciones del selector de modo para campos numéricos.
		 *
		 * @returns {Array}
		 */
		number_mode_options() {
			return [
				{
					value: '',
					text: 'No modificar',
					icon: null,
				},
				{
					value: 'decrement',
					text: 'Disminuir %',
					icon: 'icon-minus',
				},
				{
					value: 'increment',
					text: 'Aumentar %',
					icon: 'icon-plus',
				},
				{
					value: 'set',
					text: 'Setear',
					icon: 'icon-edit',
				},
			]
		},
		/**
		 * Opciones del selector de intención para checkbox en actualización masiva.
		 *
		 * @returns {Array}
		 */
		checkbox_mode_options() {
			return [
				{
					value: '',
					text: 'No modificar',
					variant: 'secondary',
				},
				{
					value: 1,
					text: 'Activar',
					variant: 'success',
				},
				{
					value: 0,
					text: 'Desactivar',
					variant: 'danger',
				},
			]
		},
	},
	data() {
		return {
			/* Tarjetas agrupadas para la UI; se aplana al emitir `update`. */
			form_field_cards: [],
			/* Grupo activo cuando el modelo usa `group_title`. */
			selected_group_title: null,
		}
	},
	watch: {
		model_name() {
			this.set_form()
			this.ensure_selected_group_title()
		},
	},
	created() {
		this.set_form()
		this.ensure_selected_group_title()
	},
	methods: {
		/**
		 * Al abrir el modal, recalcula grupo y formulario por si cambió el modelo o permisos.
		 *
		 * @returns {void}
		 */
		on_modal_shown() {
			this.set_form()
			this.ensure_selected_group_title()
		},
		/**
		 * Emite el formulario plano que consume el backend (`UpdateController`).
		 *
		 * @returns {void}
		 */
		update() {
			let flat_form = this.build_flat_form()
			this.$emit('update', flat_form)

			setTimeout(() => {
				this.set_form()
			}, 2000)
		},
		/**
		 * Construye el array plano legacy (`decrement_*`, `increment_*`, `set_*`, etc.).
		 *
		 * @returns {Array}
		 */
		/**
		 * Indica si un valor del formulario debe enviarse al backend para aplicar cambio.
		 *
		 * @param {*} value
		 * @param {String} kind
		 * @returns {Boolean}
		 */
		form_value_should_apply(value, kind) {
			if (value === null || value === '') {
				return false
			}
			if (kind == 'select' || kind == 'search') {
				return value !== 0 && value !== '0'
			}
			if (kind == 'checkbox') {
				return value === 0 || value === 1 || value === '0' || value === '1'
			}
			return true
		},
		build_flat_form() {
			let flat_form = []

			this.form_field_cards.forEach(field_card => {
				if (field_card.kind == 'number') {
					if (this.form_value_should_apply(field_card.decrement_value, 'number')) {
						flat_form.push({
							label: 'Disminuir el '+field_card.label,
							key: 'decrement_'+field_card.prop_key,
							type: 'number',
							placeholder: 'Porcentaje para disminuir '+field_card.label,
							value: field_card.decrement_value,
							round: field_card.round_decrement,
						})
					}
					if (this.form_value_should_apply(field_card.increment_value, 'number')) {
						flat_form.push({
							label: 'Aumentar el '+field_card.label,
							key: 'increment_'+field_card.prop_key,
							type: 'number',
							placeholder: 'Porcentaje para aumentar '+field_card.label,
							value: field_card.increment_value,
							round: field_card.round_increment,
						})
					}
					if (this.form_value_should_apply(field_card.set_value, 'number')) {
						flat_form.push({
							label: 'Setear el '+field_card.label,
							key: 'set_'+field_card.prop_key,
							type: 'number',
							placeholder: 'Valor para setear '+field_card.label,
							value: field_card.set_value,
						})
					}
				} else if (field_card.kind == 'select') {
					if (!this.form_value_should_apply(field_card.value, 'select')) {
						return
					}
					flat_form.push({
						label: field_card.label,
						key: field_card.prop_key,
						options: field_card.options,
						store: field_card.store,
						depends_on: field_card.depends_on,
						type: 'select',
						value: field_card.value,
					})
				} else if (field_card.kind == 'search') {
					if (!this.form_value_should_apply(field_card.value, 'search')) {
						return
					}
					flat_form.push({
						label: field_card.label,
						store: field_card.store,
						depends_on: field_card.depends_on,
						key: field_card.prop_key,
						type: 'search',
						value: field_card.value,
					})
				} else if (field_card.kind == 'checkbox') {
					if (!this.form_value_should_apply(field_card.value, 'checkbox')) {
						return
					}
					flat_form.push({
						label: field_card.label,
						key: field_card.prop_key,
						type: 'checkbox',
						options: [
							{ value: '', text: 'No modificar' },
							{ value: 1, text: 'Activar' },
							{ value: 0, text: 'Desactivar' },
						],
						value: field_card.value,
					})
				}
			})

			return flat_form
		},
		/**
		 * Reinicia las tarjetas del formulario según propiedades actualizables visibles.
		 *
		 * @returns {void}
		 */
		set_form() {
			let form_field_cards = []

			this.properties_to_update.forEach(prop => {
				if (!this.showProperty(prop)) {
					return
				}

				let group_title = this.get_group_title_for_prop(prop)
				let label = this.propText(prop)

				if ((prop.type_to_update && prop.type_to_update == 'number') || prop.type == 'number') {
					form_field_cards.push({
						uid: 'number-'+prop.key,
						kind: 'number',
						prop_key: prop.key,
						label: label,
						group_title: group_title,
						active_mode: '',
						decrement_value: '',
						increment_value: '',
						set_value: '',
						round_decrement: 0,
						round_increment: 0,
					})
				} else if (prop.type == 'select') {
					form_field_cards.push({
						uid: 'select-'+prop.key,
						kind: 'select',
						prop_key: prop.key,
						label: label,
						group_title: group_title,
						options: prop.options,
						store: this.modelNameFromRelationKey(prop),
						depends_on: prop.depends_on,
						value: 0,
					})
				} else if (prop.type == 'search') {
					form_field_cards.push({
						uid: 'search-'+prop.key,
						kind: 'search',
						prop_key: prop.key,
						key: prop.key,
						label: label,
						group_title: group_title,
						store: prop.store,
						depends_on: prop.depends_on,
						value: '',
					})
				} else if ((prop.type_to_update && prop.type_to_update == 'checkbox') || prop.type == 'checkbox') {
					form_field_cards.push({
						uid: 'checkbox-'+prop.key,
						kind: 'checkbox',
						prop_key: prop.key,
						label: label,
						group_title: group_title,
						value: '',
					})
				}
			})

			this.form_field_cards = form_field_cards
		},
		/**
		 * Actualiza el grupo activo desde `GroupPorps`.
		 *
		 * @param {String} group_title
		 * @returns {void}
		 */
		set_selected_group_title(group_title) {
			if (!group_title) {
				return
			}
			this.selected_group_title = group_title
		},
		/**
		 * Garantiza un grupo activo válido al abrir o al cambiar propiedades visibles.
		 *
		 * @returns {void}
		 */
		ensure_selected_group_title() {
			if (!this.has_group_props) {
				this.selected_group_title = null
				return
			}

			let visible_group_titles = []
			this.visible_group_items.forEach(group_item => {
				visible_group_titles.push(group_item.name)
			})

			if (!visible_group_titles.length) {
				this.selected_group_title = null
				return
			}

			let has_selected_group_visible = visible_group_titles.find(group_title => {
				return group_title == this.selected_group_title
			})
			if (!has_selected_group_visible) {
				this.selected_group_title = visible_group_titles[0]
			}
		},
		/**
		 * Devuelve el `group_title` de una prop según su posición en el modelo.
		 *
		 * @param {Object} target_prop
		 * @returns {String|null}
		 */
		get_group_title_for_prop(target_prop) {
			if (!this.has_group_props || !target_prop) {
				return null
			}

			let current_group_title = null
			let group_title_for_prop = null
			this.model_properties.forEach(prop => {
				if (prop && prop.group_title) {
					current_group_title = prop.group_title
					return
				}
				if (prop === target_prop) {
					group_title_for_prop = current_group_title
				}
			})

			if (!group_title_for_prop) {
				return this.first_group_title
			}

			return group_title_for_prop
		},
		/**
		 * Indica si un grupo tiene al menos un campo actualizable visible.
		 *
		 * @param {String} group_title
		 * @returns {Boolean}
		 */
		group_has_visible_update_fields(group_title) {
			if (!group_title) {
				return false
			}

			let has_visible_fields = false
			this.properties_to_update.forEach(prop => {
				if (
					!has_visible_fields
					&& prop
					&& !prop.group_title
					&& this.get_group_title_for_prop(prop) == group_title
					&& this.showProperty(prop)
				) {
					has_visible_fields = true
				}
			})
			return has_visible_fields
		},
		/**
		 * Cambia el modo activo de un campo numérico y limpia valores de otros modos.
		 *
		 * @param {Object} field_card
		 * @param {String} mode
		 * @returns {void}
		 */
		set_number_mode(field_card, mode) {
			field_card.active_mode = mode
			field_card.decrement_value = ''
			field_card.increment_value = ''
			field_card.set_value = ''
			field_card.round_decrement = 0
			field_card.round_increment = 0
		},
		/**
		 * Placeholder del input numérico según modo activo.
		 *
		 * @param {Object} field_card
		 * @returns {String}
		 */
		get_number_placeholder(field_card) {
			if (field_card.active_mode == 'decrement') {
				return 'Porcentaje a disminuir (ej: 10)'
			}
			if (field_card.active_mode == 'increment') {
				return 'Porcentaje a aumentar (ej: 15)'
			}
			return ''
		},
		/**
		 * Opciones del select incluyendo «No modificar».
		 *
		 * @param {Object} field_card
		 * @returns {Array}
		 */
		get_select_options(field_card) {
			return this.getOptions({
				key: field_card.prop_key,
				text: field_card.label,
				options: field_card.options,
				depends_on: field_card.depends_on,
				store: field_card.store,
			}, this.build_select_filter_model(field_card), field_card.store)
		},
		/**
		 * Modelo auxiliar para resolver dependencias de selects en actualización masiva.
		 *
		 * @param {Object} field_card
		 * @returns {Object}
		 */
		build_select_filter_model(field_card) {
			let filter_model = {}
			this.form_field_cards.forEach(card => {
				if (card.kind == 'select' && card.value) {
					filter_model[card.prop_key] = card.value
				}
			})
			if (field_card.value) {
				filter_model[field_card.prop_key] = field_card.value
			}
			return filter_model
		},
		/**
		 * Asigna el id elegido en un search al campo correspondiente.
		 *
		 * @param {Object} result
		 * @returns {void}
		 */
		set_selected_search(result) {
			let index = this.form_field_cards.findIndex(field_card => {
				return field_card.prop_key == result.prop.key
			})
			if (index === -1) {
				return
			}
			this.form_field_cards[index].value = result.model.id
		},
	},
}
</script>
<style scoped lang="sass">
.update-field-card
	border: 1px solid #e8ecf0
	border-radius: 8px
	padding: 12px 14px
	background: #fafbfc

.update-field-card__title
	font-weight: 600
	font-size: 0.95rem
	color: #2c3e50

.update-field-card__mode-group
	display: flex
	flex-wrap: wrap

	.btn
		flex: 1 1 auto
		min-width: 0
		white-space: normal
		line-height: 1.2
		padding: 0.35rem 0.5rem

.update-field-card__hint
	font-size: 0.82rem

.update-field-card__input-block
	max-width: 100%

.m-t-8
	margin-top: 8px
</style>
<style lang="sass">
.update-models-modal__body
	padding-top: 0.5rem
</style>
