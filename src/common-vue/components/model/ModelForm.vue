<template>
	<div
	:id="id"
	class="model-form">
		<group-porps
		v-if="has_group_props"
		:group_items="visible_group_items"
		:selected_group_title="selected_group_title"
		@setSelectedGroup="set_selected_group_title"></group-porps>

		<b-form-row
		class="m-b-0">
			
			<b-col
			v-for="(prop, index) in properties"
			v-if="show_property_in_form(prop)"
			:md="form_col_for(prop, 6)"
			:lg="form_col_for(prop, 4)"
			:xl="form_col_for(prop, 3)"
			:key="'model-prop-'+index">
				<div>
					
					<b-form-group
					:class="colorLabel(prop)"
					:id="'form-group-'+prop.key">

						<!-- Titulo label; cursor help si hay popover de instrucciones -->
						<label	
						:id="'label-'+prop.key"
						class="form-label"
						:class="{ 'form-label--has-help': prop.description || prop.descriptions }">
							<!-- <i 
							v-if="prop.has_many"
							class="icon-down"></i>
							<i 
							v-else
							class="icon-right"></i> -->
							{{ getLabel(prop) }}
						</label>


						<!-- Descripcion de la propiedad - Popover -->
						<b-popover
						v-if="prop.description" 
						:target="'label-'+prop.key" 
						triggers="click" 
						placement="bottom">
						    <template #title><strong>Instrucciones {{ prop.text }}</strong></template>
						    {{ prop.description }}
						 </b-popover>

						<b-popover
						v-if="prop.descriptions" 
						:target="'label-'+prop.key" 
						triggers="click" 
						placement="bottom">
						    <template #title><strong>Instrucciones</strong></template>
						    <p
						    v-for="description in prop.descriptions">
						    	{{ description }}
						    </p>
						</b-popover>



						 <!-- Input -->
						<div>
							
							<images
							v-if="prop.type == 'image' || prop.type == 'images'"
							:prop="prop"
							:model="model"
							:model_name="model_name"
							:has_many_parent_model="has_many_parent_model"
							:has_many_prop="has_many_prop"></images>

							<div
							v-else>
								<slot :name="prop.key">

								<!-- Valor de solo lectura: contenedor gris suave con el texto del campo -->
								<div
								v-if="prop.only_show || prop.from_pre_view"
								:class="prop.class"
								class="model-form__only-show">
									<!-- Valor presente: texto formateado por propertyText -->
									<span
									:class="colorLabel(prop)"
									class="model-form__only-show-value"
									v-html="propertyText(model, prop, false, !prop.from_pre_view)"
									v-if="propertyText(model, prop) != '' || propertyText(model, prop) == 0">
									</span>
									<!-- Sin valor: indicador visual sutil en gris itálica -->
									<span
									v-else
									class="model-form__no-data">
										Sin datos
									</span>
								</div>
									
									<field-search-input
									v-else-if="useSearch(prop)"
									:prop="prop"
									:model="model"
									:disabled="isDisabled(prop, form_to_filter)"
									:model_name="model_name"
									:relation_model_name="modelNameFromRelationKey(prop)"
									:search_from_api="search_from_api(prop)"
									:props_to_filter="props_to_filter(prop)"
									:props_to_show="props_to_show(prop)"
									:str_limint="str_limint(prop)"
									:model_name_for_search_on_models="model_name"
									:search_function="prop.search_function_for_model_form"
									:clear_query="clearQuery(prop)"
									:save_if_not_exist="saveIfNotExist(prop)"
									:auto_select="autoSelect(prop)"
									:props_to_send_to_api="prop.props_to_send_to_api"
									:limpiar_resultados_de_busqueda="prop.limpiar_resultados_de_busqueda"
									:function_props_to_send_to_api="prop.function_props_to_send_to_api"
									@set-selected="setSelected"></field-search-input>

									<belongs-to-many-checkbox
									v-else-if="prop.belongs_to_many && prop.type == 'checkbox'"
									:model="model"
									:prop="prop"></belongs-to-many-checkbox>

							       <!--  <b-form-datepicker
									v-else-if="prop.type == 'date'"
							        :disabled="isDisabled(prop, form_to_filter)"
							        v-model="model[prop.key]"></b-form-datepicker> -->

							        <date-picker
							        @setDate="setDate"
							        :model_name="model_name"
							        :prop="prop"
							        :value="model[prop.key]"
									v-else-if="prop.type == 'date'"></date-picker>

									<b-time 
									v-else-if="prop.type == 'time'"
									:id="model_name+'-'+prop.key"
							        :disabled="isDisabled(prop, form_to_filter)"
									type="time"
									@keyup.enter="clickEnter(prop)"
									v-model="model[prop.key]"></b-time>

									<div
									v-else-if="prop.type == 'radio'">
										<b-form-radio
										v-for="model_radio in modelsToSearch(prop, model)"
										:key="prop.key+'-'+model_radio.id"
										:value="model_radio.id"
										:name="model_name+'-'+prop.key"
										:id="prop.key+'-'+model_radio.id"
										v-model="model[prop.key]">
											<div
											v-if="prop.props_to_show_in_radio">
												<p
												v-for="prop_to_show in prop.props_to_show_in_radio">
													{{ model_radio[prop_to_show] }}
												</p>
											</div>
											<span
											v-else>
												{{ model_radio.name }}
											</span>
										</b-form-radio>
									</div>

									<field-text-input
									v-else-if="prop.type == 'text' || prop.type == 'number' || prop.type == 'password'"
									:model_name="model_name"
									:prop="prop"
									:value="model[prop.key]"
									:disabled="isDisabled(prop, form_to_filter)"
									:prop_text="propText(prop)"
									:price_value="price(model[prop.key])"
									:has_bar_code_scanner="hasExtencion('bar_code_scanner')"
									:placeholder="passwordPlaceholder(prop)"
									@input="$set(model, prop.key, $event)"
									@search-cuit="searchCUIT"
									@set-bar-code="setBarCode"
									@blur="on_field_blur(prop)"
									@enter="prop.key == 'cuit' ? searchCUIT() : clickEnter(prop)"></field-text-input>

									<b-form-textarea
									autocomplete="off"
									:id="model_name+'-'+prop.key"
									v-else-if="prop.type == 'textarea'"
							        :disabled="isDisabled(prop, form_to_filter)"
									:rows="10"
									:type="prop.type"
									v-model="model[prop.key]"></b-form-textarea>

									<text-editor
									:id="model_name+'-'+prop.key"
									v-else-if="prop.type == 'texteditor'"
									v-model="model[prop.key]"></text-editor>


									<field-select-input
									v-else-if="prop.type == 'select'"
									:prop="prop"
									:model_name="model_name"
									:relation_model_name="modelNameFromRelationKey(prop)"
									:value="model[prop.key]"
									:disabled="isDisabled(prop, form_to_filter)"
									:options="getOptions(prop, model, model_name)"
									@input="$set(model, prop.key, $event)"
									@input-change="setChange(prop)"></field-select-input>

									<!-- Aviso debajo del select cuando queda deshabilitado por falta de datos
									     relacionados (ej: sucursal sin afip_information cargados, prompt 440) -->
									<small
									v-if="prop.type == 'select' && getWarningText(prop)"
									class="form-text text-warning">
										{{ getWarningText(prop) }}
									</small>

								<!-- Toggle tipo iPhone: el label arriba ya describe el campo,
								     el texto interno del checkbox es redundante y se omite -->
								<label
								v-else-if="prop.type == 'checkbox'"
								:for="model_name+'-'+prop.key"
								class="model-form__toggle"
								:class="{ 'model-form__toggle--disabled': isDisabled(prop, form_to_filter) }">
									<input
									type="checkbox"
									:id="model_name+'-'+prop.key"
									:disabled="isDisabled(prop, form_to_filter)"
									:checked="Number(model[prop.key]) === 1"
									@change="$set(model, prop.key, $event.target.checked ? 1 : 0)">
									<!-- Track: fondo del toggle; thumb: círculo deslizante -->
									<span class="model-form__toggle-track">
										<span class="model-form__toggle-thumb"></span>
									</span>
								</label>

									<google-geocoder
									v-else-if="prop.type == 'google_geocoder'"
									:model_name="model_name"
									:prop="prop"
									:model="model"></google-geocoder>

								<!-- Boolean: badge de color verde (Sí) o rojo (No) -->
								<div
								v-else-if="prop.type == 'boolean'">
									<span
									v-if="model[prop.key]"
									class="model-form__boolean-badge model-form__boolean-badge--yes">
										Sí
									</span>
									<span
									v-else
									class="model-form__boolean-badge model-form__boolean-badge--no">
										No
									</span>
								</div>

									<b-button
							    	v-else-if="prop.show_model"
							    	class="m-r-15"
							    	@click="_setModel(prop)"
									variant="primary">
										<i class="icon-plus"></i>
										{{ btnText(prop) }}
									</b-button>
									
									<b-button
									v-else-if="prop.button"
									:variant="prop.button.variant"
									:disabled="is_disabled_button(prop)"
									@click="callMethod(prop, model)">
										<i
										v-if="prop.button.icon"
										:class="'icon-'+prop.button.icon"></i>
										<span
										v-if="prop.button.button_text">
											{{ prop.button.button_text }}
										</span>
										<span
										v-else>
											{{ propertyText(model, prop) }}
										</span>
										<b-badge
										v-if="prop.button.badge && getBadgeValue(prop.button, model) > 0"
										class="m-l-5"
										:variant="prop.button.badge.variant">
											{{ getBadgeValue(prop.button, model) }}
										</b-badge>
									</b-button>
									
									<p
									class="function-value"
									v-else-if="prop.function">
										{{ getFunctionValue(prop, model) }}
									</p>

									<div v-else-if="prop.type == 'display' && prop.key == 'payment_methods_table' && model_name == 'expense'">
										<payment-methods-table
										:items="model.payment_methods"></payment-methods-table>
									</div>

									<pdf-column-profile-editor
									v-else-if="prop.type == 'display' && prop.key == 'pdf_column_profile_editor' && model_name == 'pdf_column_profile'"
									:key="'pdf-column-profile-editor-' + (model.id || 'new') + '-' + (model.model_name || '')"
									:model="model"></pdf-column-profile-editor>

									<!-- en pivot_parent_model le paso el model padre, para que por ejemplo en el model Sale, en la tabla de articles, tenga acceso al Sale model (el parent_model) -->
								<belongs-to-many-table
								v-if="prop.belongs_to_many && !prop.belongs_to_many.related_with_all && (!prop.type || prop.type != 'checkbox') && !(model_name === 'pdf_column_profile' && prop.key === 'pdf_column_options')"
								:prop="prop"
								:model="model"
								:parent_model_name="model_name"
								:show_btn_remove_belongs_to_many="show_btn_remove_belongs_to_many"
								@remove-model="removeModel(prop, $event)">
										<template #belongs="slotProps">
											<slot name="belongs" :model="slotProps.model"></slot>
										</template>
									</belongs-to-many-table>

									<has-many
									v-else-if="prop.has_many"
									@modelDeleted="has_many_deleted"
									@modelSaved="has_many_saved"
									@resizing="on_has_many_resizing"
									@resized="on_has_many_resized"
									:form_cols="form_col_for(prop, 4)"
									:parent_model="model"
									:parent_model_name="model_name"
									:prop="prop">
										sdf
										<template
											v-for="prop in modelPropertiesFromName(prop.has_many.model_name)"
											v-slot:[get_slot_has_many(prop)]="props"
										>
											<slot 
												:name="'has-many-prop-'+prop.key"
											></slot>
										</template>					
									</has-many>

									<b-button
									v-if="(prop.type == 'radio') && model[prop.key] != prop.value"
									variant="outline-primary"
									size="sm"
									@click="clear(prop)">
										Limpiar
									</b-button>
									<p
									v-if="prop.prop_info">
										{{ propInfo(prop) }}
									</p>
								</slot>
							</div>

							<!-- <hr> -->

						</div>

						<!-- <div
						class="m-t-15 m-b-10"
						v-if="prop.description">
							<strong>{{ prop.description }}</strong>
						</div> -->

						<!-- <div
						v-for="description in prop.descriptions">
							<p>{{ description }}</p>
						</div> -->

					</b-form-group>
				</div>
			</b-col>
		</b-form-row>
		
		<!-- Metadatos de fechas: label + pill gris, mismo lenguaje visual que only_show / LoginForm -->
		<b-form-row
		class="model-form__meta-row m-b-0"
		v-if="model.id && !from_has_many">
			<b-col
			md="6"
			class="model-form__meta-col">
				<div class="model-form__meta-field">
					<span class="form-label">Creado</span>
					<div
					class="model-form__meta-input-row"
					role="text"
					aria-label="Registro creado el">
						<span class="model-form__meta-value">
							{{ date(model.created_at, true) }} - {{ since(model.created_at) }}
						</span>
					</div>
				</div>
			</b-col>
			<b-col
			md="6"
			class="model-form__meta-col">
				<div class="model-form__meta-field">
					<span class="form-label">Actualizado</span>
					<div
					class="model-form__meta-input-row"
					role="text"
					aria-label="Registro actualizado el">
						<span class="model-form__meta-value">
							{{ date(model.updated_at, true) }} - {{ since(model.updated_at) }}
						</span>
					</div>
				</div>
			</b-col>
		</b-form-row>
		
		<slot :model="model"></slot>

		<cuit-result
		@use-data="useAfipData"
		:afip_data="afip_result_data"
		:model="afip_result_model"
		:model_name="model_name"></cuit-result>

		<!-- <slot 
		v-if="!from_has_many"
		name="buttons">
			<btn-loader
			v-if="hasPermission"
			@clicked="save"
			:loader="loading"
			text="Guardar"></btn-loader>
			
			<btn-delete
			v-if="_show_btn_delete"
			:has_many_prop="has_many_prop"
			:has_many_parent_model_name="has_many_parent_model_name"
			:model_name="model_name"
			:model="model"
			:modal="'delete-'+model_name"></btn-delete>
		</slot> -->
		
	</div>
</template>
<script>
import HasMany from '@/common-vue/components/model/HasMany'
import BelongsToManyCheckbox from '@/common-vue/components/model/BelongsToManyCheckbox'
import Cards from '@/common-vue/components/display/cards/Index'
import Images from '@/common-vue/components/model/images/Index'
import BtnLoader from '@/common-vue/components/BtnLoader'
import GroupPorps from '@/common-vue/components/model/GroupPorps'
import PaymentMethodsTable from '@/components/expenses/components/PaymentMethodsTable'

// import BtnDelete from '@/common-vue/components/BtnDelete'
// import Model from '@/common-vue/components/model/Index'

import model_functions from '@/common-vue/mixins/model_functions'
import {
	form_has_many_cols_from_store,
	save_form_has_many_cols,
	default_has_many_form_cols,
} from '@/common-vue/helpers/column_preferences_helper'

export default {
	components: {
		CuitResult: () => import('@/components/common/CuitResult'),
		ModelComponent: () => import('@/common-vue/components/model/Index'),
		GoogleGeocoder: () => import('@/common-vue/components/model/google-geocoder/Index'),
		TextEditor: () => import('@/common-vue/components/model/form/TextEditor'),	
		FieldTextInput: () => import('@/common-vue/components/model/form/FieldTextInput'),
		FieldSearchInput: () => import('@/common-vue/components/model/form/FieldSearchInput'),
		FieldSelectInput: () => import('@/common-vue/components/model/form/FieldSelectInput'),
		BelongsToManyTable: () => import('@/common-vue/components/model/form/BelongsToManyTable'),
		// SelectExpensePaymentMethodsModal: () =>  import('@/components/expenses/modals/select-payment-methods/Index'),
		PaymentMethodsTable,
		HasMany,
		BelongsToManyCheckbox,
		Cards,
		Images,
		GroupPorps,
		BtnLoader,
		// BtnDelete,
		DatePicker: () => import('@/common-vue/components/model/form/DatePicker'),
		PdfColumnProfileEditor: () => import('@/common-vue/components/pdf/PdfColumnProfileEditor.vue'),
	},

	mixins: [model_functions],
	props: {
		model: Object,
		properties: Array,
		model_name: String,
		has_many_parent_model: Object,
		has_many_parent_model_name: String,
		has_many_prop: Object,
		check_can_delete: {
			type: Boolean,
			default: false,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_delete: {
			type: Boolean,
			default: true,
		},
		form_to_filter: {
			type: Boolean,
			default: false,
		},
		from_has_many: {
			type: Boolean,
			default: false,
		},
		parent_model: {
			type: Object,
			default: null,
		},
		input_full_width: {
			type: Boolean,
			default: false,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		actions_after_save: {
			type: Array,
			default: () => []
		},
	},
	mounted() {
		this.ensure_selected_group_title()
		this.setFocus()
		/* Carga el mapa de anchos has_many de este modelo desde el cache global (fallback dueño→empleado ya resuelto). */
		this.has_many_form_cols = form_has_many_cols_from_store(this.$store, this.model_name)
	},
	data() {
		return {
			/*
				Guarda el último valor chequeado por cada `prop.key` para evitar requests duplicadas
				cuando el usuario presiona Enter y el input pierde foco inmediatamente después.
			*/
			last_repeat_check_by_prop_key: {},

			/* Mapa { prop_key: cols } de anchos de has_many de este modelo (override del usuario). */
			has_many_form_cols: {},
			loading: false,
			saving_belongs_to_many: false,
			props_to_show_in_belongs_to_many: [],

			afip_result_data: null,
			afip_result_model: null,

			/* Guarda el `group_title` activo cuando el formulario tiene navegación por grupos. */
			selected_group_title: null,
		}
	},
	computed: {
		iva_conditions() {
			return this.$store.state.iva_condition.models
		},
		_show_btn_delete() {
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				return this.can(this.model_name+'.delete')
			}
			return this.show_btn_delete
		},
		id() {
			return Math.random()+Date.now()
		},
		/**
		 * Determina si el modelo declara al menos un separador de grupo.
		 */
		has_group_props() {
			let has_groups = false
			this.properties.forEach(prop => {
				if (prop && prop.group_title) {
					has_groups = true
				}
			})
			return has_groups
		},
		/**
		 * Retorna el primer `group_title` definido, usado como fallback
		 * para props legacy que aparecen antes del primer grupo.
		 */
		first_group_title() {
			let first_title = null
			this.properties.forEach(prop => {
				if (!first_title && prop && prop.group_title) {
					first_title = prop.group_title
				}
			})
			return first_title
		},
		/**
		 * Arma los items visibles para el `HorizontalNav` de grupos.
		 */
		visible_group_items() {
			/* Acumula nombres de grupo visibles evitando duplicados. */
			let visible_group_titles = []

			this.properties.forEach(prop => {
				if (prop && prop.group_title && this.group_has_visible_props(prop.group_title)) {
					let already_added = visible_group_titles.find(group_title => {
						return group_title == prop.group_title
					})
					if (!already_added) {
						visible_group_titles.push(prop.group_title)
					}
				}
			})

			/* Formatea cada grupo como item compatible con `HorizontalNav`. */
			let group_items = []
			visible_group_titles.forEach(group_title => {
				group_items.push({
					name: group_title,
				})
			})
			return group_items
		},
	},
	watch: {
		/**
		 * Recalcula selección de grupo cuando cambian las props del modelo.
		 */
		properties: {
			handler() {
				this.ensure_selected_group_title()
			},
			deep: true,
		},
	},
	methods: {
		/**
		 * Actualiza el grupo activo desde el componente de navegación.
		 *
		 * @param {String} group_title Nombre del grupo seleccionado.
		 * @returns {void}
		 */
		set_selected_group_title(group_title) {
			/* Evita estados inválidos cuando el hijo emite vacío por error. */
			if (!group_title) {
				return
			}
			this.selected_group_title = group_title
		},
		/**
		 * Garantiza un grupo activo válido al abrir/cambiar formulario con grupos.
		 *
		 * @returns {void}
		 */
		ensure_selected_group_title() {
			/* Si no hay grupos, se limpia estado y no se aplica navegación. */
			if (!this.has_group_props) {
				this.selected_group_title = null
				return
			}

			/* Obtiene títulos realmente visibles para no seleccionar tabs vacíos. */
			let visible_group_titles = []
			this.visible_group_items.forEach(group_item => {
				visible_group_titles.push(group_item.name)
			})

			/* Si no hay grupos visibles, limpia selección para evitar filtros inconsistentes. */
			if (!visible_group_titles.length) {
				this.selected_group_title = null
				return
			}

			/*
				Conserva la selección actual si sigue visible;
				de lo contrario, toma el primer grupo visible como default.
			*/
			let has_selected_group_visible = visible_group_titles.find(group_title => {
				return group_title == this.selected_group_title
			})
			if (!has_selected_group_visible) {
				this.selected_group_title = visible_group_titles[0]
			}
		},
		/**
		 * Indica si una propiedad debe mostrarse dentro del formulario actual.
		 *
		 * @param {Object} prop Definición de propiedad del modelo.
		 * @returns {Boolean}
		 */
		show_property_in_form(prop) {
			/* Nunca renderizar el separador como campo del formulario. */
			if (!prop || prop.group_title) {
				return false
			}

			/* Respeta toda la lógica existente de visibilidad condicional. */
			if (!this.showProperty(prop, this.model, false, true)) {
				return false
			}

			/**
			 * El ABM de perfiles PDF usa editor custom; ocultar el buscador belongs_to_many legacy.
			 */
			if (
				this.model_name === 'pdf_column_profile'
				&& prop.key === 'pdf_column_options'
			) {
				return false
			}

			/* Sin grupos configurados, mantener render original del formulario completo. */
			if (!this.has_group_props) {
				return true
			}

			/* Si aún no hay grupo activo válido, no forzar render parcial inconsistente. */
			if (!this.selected_group_title) {
				return false
			}

			/* Muestra solo props del grupo activo. */
			return this.get_group_title_for_prop(prop) == this.selected_group_title
		},
		/**
		 * Devuelve el grupo al que pertenece una prop según su posición.
		 * Las props previas al primer grupo se asignan al primer grupo visible.
		 *
		 * @param {Object} target_prop Propiedad a evaluar.
		 * @returns {String|null}
		 */
		get_group_title_for_prop(target_prop) {
			/* Si no hay grupos, no aplica segmentación. */
			if (!this.has_group_props || !target_prop) {
				return null
			}

			/* Se va actualizando el grupo actual mientras se recorre en orden original. */
			let current_group_title = null
			let group_title_for_prop = null
			this.properties.forEach(prop => {
				if (prop && prop.group_title) {
					current_group_title = prop.group_title
					return
				}
				if (prop === target_prop) {
					group_title_for_prop = current_group_title
				}
			})

			/* Fallback para props legacy declaradas antes del primer `group_title`. */
			if (!group_title_for_prop) {
				return this.first_group_title
			}

			return group_title_for_prop
		},
		/**
		 * Determina si un grupo tiene al menos una prop visible en el form actual.
		 *
		 * @param {String} group_title Grupo a verificar.
		 * @returns {Boolean}
		 */
		group_has_visible_props(group_title) {
			/* Validación defensiva para evitar evaluaciones innecesarias. */
			if (!group_title) {
				return false
			}

			/* Recorre props y confirma visibilidad efectiva con la lógica existente. */
			let has_visible_props = false
			this.properties.forEach(prop => {
				if (
					!has_visible_props
					&& prop
					&& !prop.group_title
					&& this.get_group_title_for_prop(prop) == group_title
					&& this.showProperty(prop, this.model, false, true)
				) {
					has_visible_props = true
				}
			})
			return has_visible_props
		},
		has_many_deleted() {
			this.$emit('has_many_deleted')
		},
		has_many_saved(model) {
			this.$emit('has_many_saved', model)
		},
		searchCUIT() {
			this.$store.dispatch('search_by_cuit/searchByCUIT', {
				cuit: this.model.cuit,
				model_name: this.model_name,
			})
			.then(data => {
				if (data.hubo_un_error) {
					this.$toast.error('Afip dice: '+data.error)
				} else {
					this.afip_result_data = data.afip_data
					this.afip_result_model = data.model
					this.$bvModal.show('cuit-result-modal-'+this.model_name)
				}
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al buscar CUIT')
			})
		},
        async useAfipData(afip_data) {
			console.log('afip_Data', afip_data);
            let new_model = { ...this.model };
            new_model.name = afip_data.nombre
            new_model.razon_social = afip_data.razonSocial
            new_model.address = afip_data.direccion

            if (afip_data.provincia) {
                new_model.provincia_id = await this.findOrCreateRelation('provincia', afip_data.provincia);
            }
            console.log('afip_data', afip_data);
            if (afip_data.localidad) {
                new_model.location_id = await this.findOrCreateRelation('location', afip_data.localidad);
            }

            
			new_model.iva_condition_id = afip_data.condicion_iva == 'RESPONSABLE INSCRIPTO' ? 1 : afip_data.condicion_iva == 'MONOTRIBUTO' ? 2 : 3
			
            this.setModel(new_model, this.model_name, [], false);
        },
        async findOrCreateRelation(modelName, name) {
            if (!name) {
                return null;
            }

            let modelInStore = this.$store.state[modelName].models.find(m => m.name.toLowerCase() == name.toLowerCase());

            if (modelInStore) {
                return modelInStore.id;
            } else {
                try {
                    const res = await this.$api.post(`/${modelName}`, { name: name });
                    this.$store.commit(`${modelName}/add`, res.data.model);
                    this.$toast.success(`${this.capitalize(modelName)} "${name}" se ha creado`);
                    return res.data.model.id;
                } catch (err) {
                    console.error(`Error creating ${modelName}:`, err);
                    this.$toast.error(`Error al crear ${modelName}`);
                    return null;
                }
            }
        },		
		search_from_api(prop) {
			if (prop.search_from_api) {
				return true
			}
			return false
		},
		str_limint(prop) {
			if (prop.belongs_to_many && prop.belongs_to_many.str_limint) {
				return prop.belongs_to_many.str_limint
			}
			return null
		},
		props_to_show(prop) {
			if (prop.belongs_to_many && prop.belongs_to_many.props_to_show) {
				return prop.belongs_to_many.props_to_show
			}
			return null
		},
		props_to_filter(prop) {
			if (
				prop.belongs_to_many
				&& prop.belongs_to_many.props_to_filter
			) {
				return prop.belongs_to_many.props_to_filter
			}
			return []
		},	
		colorLabel(prop) {
			if (prop.color_function) {
				return this[prop.color_function](this.model)
			}
		},
		isDisabled(prop, form_to_filter = false) {
			if (prop.disabled && !form_to_filter) {
				return true 
			}
			if (this.form_disabled_to_edit(this.model_name) && this.model.id) {
				return true
			}
			if (prop.disabled_to_edit && this.model.id) {
				return true
			}
			if (prop.no_se_puede_desactivar && this.model.id && Number(this.model[prop.key]) == 1) {
				return true
			}
			if (this.form_disabled_to_edit_function(this.model_name) && this.model.id) {
				console.log('entro a form_disabled_to_edit_function')
				let function_name = require('@/models/'+this.model_name).default.form_disabled_to_edit_function
				console.log('function_name:')
				console.log(function_name)
				return this[function_name](this.model)
			}
			if (prop.type == 'select' && prop.disabled_if_not_0 && this.model[prop.key] != 0) {
				return true
			}
			// Hook genérico (mismo patrón que dynamic_options_function/color_function): el prop
			// declara el nombre de un método global (definido en common-vue/mixins/generals.js)
			// que decide si el campo debe deshabilitarse según el estado actual del modelo.
			// Ej: prop.disabled_function = 'is_address_default_afip_information_disabled'.
			if (prop.disabled_function && this[prop.disabled_function](this.model)) {
				return true
			}
			return false
		},
		/**
		 * Texto de advertencia dinámico para un campo deshabilitado por falta de datos
		 * relacionados en el modelo (ej: sucursal sin afip_information cargados). El prop
		 * declara `warning_function`, un método global que resuelve el mensaje.
		 *
		 * @param {Object} prop - Definición declarativa del campo.
		 * @returns {string} Texto de advertencia, o cadena vacía si no aplica.
		 */
		getWarningText(prop) {
			if (prop.warning_function && this.isDisabled(prop)) {
				return this[prop.warning_function](this.model)
			}
			return ''
		},
		is_disabled_button(prop) {
			if (prop.button && prop.button.disabled_if_model_is_created) {
				if (this.model.id) {
					return true
				} else {
					return false
				}
			}
			return false
		},
		setFocus() {
			setTimeout(() => {
				let ok = false 
				this.properties.forEach(prop => {
					if (!ok) {
						let element = document.getElementById(this.model_name+'-'+prop.key)
						if (element && prop.type == 'text' && this.show_property_in_form(prop)) {
							setTimeout(() => {
								element.focus()
							}, 200)
							ok = true 
						}
					}
				})
			}, 300)
		},
		setDate(result) {
			this.model[result.prop.key] = result.value 
		},
		setBarCode(bar_code) {
			let prop = this.getBarCodeProp(this.model_name)
			this.model[prop.key] = bar_code 
		},
		propInfo(prop) {
			let array = prop.prop_info.model_prop.split('.')
			if (this.model[array[0]] && this.model[array[0]][array[1]]) {
				return prop.prop_info.text+' '+this.model[array[0]][array[1]]
			}
		},
		useSearch(prop) {
			if (prop.no_editar_una_vez_creado_el_modelo) {
				if (this.model.id) {
					return false 
				}
			} 
			return prop.type == 'search'
		},
		removeModel(prop, model) {
			let index = this.model[prop.key].findIndex(_model => {
				return _model.id == model.id 
			})
			this.model[prop.key].splice(index, 1)
			this.check_relations_filtered(prop, model)
		},
		check_relations_filtered(prop, deleted_model) {
			let relations_filtered = this.$store.state[this.model_name].relations_filtered
			if (typeof relations_filtered != 'undefined') {
				let relation_filtered = relations_filtered.find(relation => {
					return relation == prop.key 
				})
				if (typeof relation_filtered != 'undefined') {
					deleted_model.relation = prop.key
					this.$store.commit(this.model_name+'/addDeletedModelsFromRelationFiltered', deleted_model)
				}
			}
		},
		propsToShowInBelongsToMany(prop) {
			let props = []
			if (prop.belongs_to_many.props_to_show) {
				props = props.concat(prop.belongs_to_many.props_to_show)
			} else {
				if (prop.store) {
					props = this.modelPropertiesFromName(prop.store)
				} else {
					props = this.modelPropertiesFromName(prop.belongs_to_many.model_name)
				}
			}
			if (prop.belongs_to_many.properties_to_set) {
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					props.push({
						...prop_to_set,
						is_pivot_prop: true,
					})
				})
			}
			return props
		},
		clear(prop) {
			this.model[prop.key] = prop.value 
			if (this.isRelationKey(prop)) {
				this.model[this.modelNameFromRelationKey(prop, false, false)] = null
			}
		},
		setChange(prop) {
			this.$nextTick(() => {
				if (prop.on_change) {
					this[prop.on_change](prop, this.model)
				}
				if (this.model[prop.key] == -10) {
					this.create(this.modelNameFromRelationKey(prop))
				}
				// this.$set(this.model, prop.key, this.model[prop.key])
			})
		},
		setPivotProps(prop) {
			if (this.model[prop.key] && this.model[prop.key] != 0) {
				prop.properties_to_set_on_change.forEach(prop_to_set => {
					if (prop_to_set.relation_to_set) {
						this.model[prop_to_set.relation_to_set].forEach(model => {
							let selected_relationship = model[prop_to_set.find_on].find(relationship => {
								return relationship.id == this.model[prop.key]
							})
							let array = prop_to_set.set.split('.')
							if (array[1]) {
								model[array[0]][array[1]] = selected_relationship[array[0]][array[1]]
							}
						})
					} else if (prop_to_set.search_on_models) {
						let models_to_search = this.modelsStoreFromName(prop_to_set.search_on_models)
						let finded = models_to_search.find(model_to_search => {
							return model_to_search.id == this.model[prop.key]
						})
						this.model[prop_to_set.set] = finded[prop_to_set.set]
					}
				})
			}
		},
		pivotModels(prop) {
			return this.model[this.modelPlural(prop.store)]
		},
		btnText(prop) {
			if (prop.btn_model_text) {
				return 'Agregar '+prop.btn_model_text
			}
			return 'Agregar '+this.propText(prop)
		},
		_setModel(prop) {
			let properties = []
			prop.properties.forEach(_prop => {
				properties.push({
					key: _prop,
					value: this.model[_prop]
				})
			})
			this.$store.commit(prop.store+'/setModel', {model: null, properties: properties})
			this.$bvModal.show(this.routeString(this.modelNameFromRelationKey(prop)))
		},
		setSelected(result) {

			let prop = result.prop

			// Prompt 309: si la propiedad tiene declarada una funcion de confirmacion previa
			// (ej: "provider_id" de "article", ver src/models/article.js), se delega el manejo
			// a esa funcion en vez de aplicar el cambio directo. Si la funcion devuelve true
			// significa que ya se encargo del flujo (por ejemplo abriendo un modal de
			// confirmacion) y no hay que continuar con la logica generica de mas abajo.
			if (prop.confirm_change_function && this[prop.confirm_change_function](prop, result)) {
				return
			}

			if (prop.toast_function) {
				this[prop.toast_function](result)
			}

			if (prop.belongs_to_many) {
				let model_to_add = result.model 
				if (this.checkBelongsToManyExist(prop, model_to_add, result)) {

					this.setBelongsToManyPivotProps(prop, model_to_add, result)

				}
			} else if (prop.has_many && prop.has_many.models_from_parent_prop) {
				this.model[prop.key].unshift(result.model)
				this.setModel(this.model, this.model_name, [], false)
			} else if (prop.set_model_on_click_or_prop_with_query_if_null) {
				if (result.model) {
					this.setModel(result.model, this.model_name, [], false)
				} else {
					this.model[prop.key] = result.query 
					this.setModel(this.model, this.model_name, [], false)
				}
			} else {
				this.$set(this.model, result.prop.key, result.model.id)
				this.$set(this.model, this.modelNameFromRelationKey(result.prop), result.model)

				// Si la propiedad tiene configurado "prefill_has_many_on_select" (ej: provider_id en provider_order),
				// precarga en un has_many hermano los datos relacionados que vinieron con el modelo elegido (ej: bonificaciones del proveedor)
				if (prop.prefill_has_many_on_select) {
					this.prefillHasManyOnSelect(prop, result.model)
				}

				// Prompt 517: si la propiedad tiene configurado "prefill_prop_on_select" (ej: provider_id en
				// provider_order), precarga un campo escalar del propio modelo con el valor que trae el modelo
				// elegido (ej: "precios_incluyen_iva" del proveedor como default de la compra). El usuario puede
				// sobreescribirlo despues sin problema, ya que el prefill solo corre al seleccionar el modelo.
				if (prop.prefill_prop_on_select) {
					this.prefillPropOnSelect(prop, result.model)
				}

				this.setModel(this.model, this.model_name, [], false)
			}
		},
		/**
		 * Prompt 309: hook declarado en src/models/article.js sobre la propiedad "provider_id"
		 * (`confirm_change_function: 'confirmProviderChange'`). En vez de aplicar el cambio de
		 * proveedor directo (como hace el resto de los campos "search"), cuando corresponde
		 * abre el modal de confirmacion con los dos flags independientes del prompt 308
		 * (eliminar descuentos del proveedor anterior / crear los del proveedor nuevo). El
		 * modal (src/components/listado/modals/ChangeProvider.vue) es quien efectivamente
		 * llama al endpoint dedicado `PUT article/change-provider`.
		 *
		 * @param {Object} prop propiedad "provider_id" del modelo article.js
		 * @param {Object} result resultado del buscador: { prop, model, query }
		 * @returns {Boolean} true si se abrio el modal (corta el flujo generico de seleccion),
		 *                    false si hay que continuar con la asignacion directa de siempre
		 *                    (articulo nuevo sin id todavia, o articulo sin proveedor previo:
		 *                    no hay nada que decidir, se asigna directo).
		 */
		confirmProviderChange(prop, result) {
			let is_editing_existing_article = this.model && this.model.id
			let had_previous_provider = this.model && this.model.provider_id
			let is_actual_change = !this.model.provider_id || this.model.provider_id != result.model.id

			if (!is_editing_existing_article || !had_previous_provider || !is_actual_change) {
				return false
			}

			// El modal vive fuera del arbol de ModelForm (montado una unica vez en la vista de
			// Listado, ver src/components/listado/modals/ChangeProvider.vue), por eso se le
			// pasan los datos por evento global en vez de props.
			this.$root.$emit('open-change-provider-modal', {
				article_id: this.model.id,
				old_provider_id: this.model.provider_id,
				old_provider_name: this.model.provider ? this.model.provider.name : '',
				new_provider_id: result.model.id,
				new_provider_name: result.model.name,
			})
			this.$bvModal.show('change-provider-confirm')

			return true
		},
		/**
		 * Precarga filas editables en un has_many del modelo a partir de datos relacionados que vinieron
		 * junto con el modelo elegido en un campo "search" (ej: al elegir un proveedor, precargar sus
		 * bonificaciones como descuentos de la orden de compra).
		 *
		 * @param {Object} prop propiedad "search" que tiene la config `prefill_has_many_on_select`.
		 * @param {Object} selected_model modelo elegido en el buscador (ej: el proveedor completo).
		 * @returns {void}
		 */
		prefillHasManyOnSelect(prop, selected_model) {
			// Config declarada en el model (src/models/provider_order.js): de donde sale la data, a donde se precarga
			// y el model_name del has_many destino (necesario para pegarle a su propio endpoint)
			let config = prop.prefill_has_many_on_select
			let source_items = selected_model[config.source_prop]

			if (!source_items || !source_items.length) {
				return
			}

			// Si ya hay filas cargadas (manualmente o de una seleccion previa) y el flag pide no pisarlas, no hace nada
			let current_items = this.model[config.target_key]
			if (config.only_if_empty && current_items && current_items.length) {
				return
			}

			// Solo se precargan los items con porcentaje cargado, mismo criterio que usa el backend
			// (NewProviderOrderHelper::precargar_bonificaciones_proveedor) para no arrastrar filas vacias
			let items_to_prefill = []
			source_items.forEach(source_item => {
				if (source_item.percentage) {
					items_to_prefill.push(source_item)
				}
			})

			if (!items_to_prefill.length) {
				return
			}

			// Vacia el array destino antes de precargar (por si quedo alguna referencia de una seleccion previa)
			this.$set(this.model, config.target_key, [])

			this.$store.commit('auth/setMessage', 'Cargando bonificaciones del proveedor')
			this.$store.commit('auth/setLoading', true)

			// Igual que el boton "Agregar" del has_many generico cuando el padre todavia no tiene id: cada fila se
			// persiste de inmediato en su propio endpoint y se trackea via "childrens"/temporal_id (ver save() en
			// src/common-vue/components/model/Index.vue) para que el backend la vincule al guardar la orden.
			items_to_prefill.forEach(source_item => {
				let payload = {
					description: config.description_text,
					percentage: source_item.percentage,
					monto: null,
				}
				this.$api.post(this.routeString(config.target_model_name), payload)
				.then(res => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')

					let created_model = res.data.model
					this.$set(this.model, config.target_key, this.model[config.target_key].concat([created_model]))

					if (!this.model.id) {
						if (!this.model.childrens) {
							this.model.childrens = []
						}
						this.model.childrens.push({
							model_name: config.target_model_name,
							temporal_id: created_model.temporal_id,
						})
					}
				})
				.catch(err => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					console.log(err)
				})
			})
		},
		/**
		 * Prompt 517: precarga un campo escalar del modelo actual con el valor de una propiedad del modelo
		 * elegido en un campo "search" (ej: al elegir un proveedor en la compra, precargar "precios_incluyen_iva"
		 * de la compra con el valor por defecto configurado en el proveedor). Es el equivalente escalar de
		 * "prefillHasManyOnSelect", pero para un solo valor en vez de un array de filas relacionadas.
		 *
		 * @param {Object} prop propiedad "search" que tiene la config `prefill_prop_on_select`.
		 * @param {Object} selected_model modelo elegido en el buscador (ej: el proveedor completo).
		 * @returns {void}
		 */
		prefillPropOnSelect(prop, selected_model) {
			// Config declarada en el model (src/models/provider_order.js): de que propiedad del modelo
			// elegido sale el valor por defecto, y en que propiedad del modelo actual se precarga
			let config = prop.prefill_prop_on_select

			// Si el modelo elegido no trae la propiedad de origen cargada, no hay nada que precargar
			if (typeof selected_model[config.source_prop] == 'undefined' || selected_model[config.source_prop] === null) {
				return
			}

			this.$set(this.model, config.target_key, selected_model[config.source_prop])
		},
		checkBelongsToManyExist(prop, model_to_add) {
			console.log('checkBelongsToManyExist')
			console.log(this.model)
			if (
				typeof prop.belongs_to_many.check_ya_esta_agregado == 'undefined'
				|| prop.belongs_to_many.check_ya_esta_agregado
			) {
				
				let finded = this.model[prop.key].find(model => {
					return model.id == model_to_add.id 
				})
				if (typeof finded != 'undefined') {
					this.$toast.error('El articulo YA HABIA SIDO AGREGADO')
					return false
				}
			}
			return true
		},
		setBelongsToManyPivotProps(prop, model_to_add, result) {
			if (prop.belongs_to_many.properties_to_set) {
				model_to_add.pivot = {}
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					if (prop_to_set.set_with_function) {
						model_to_add.pivot[prop_to_set.key] = this[prop_to_set.set_with_function](this.model, model_to_add)
					} else if (prop_to_set.from_store) {
						let models = this.modelsStoreFromName(prop_to_set.store)
						models.forEach(model => {
							model_to_add.pivot[prop_to_set.store+'_'+model.id] = ''
						})
					} else if (typeof prop_to_set.value === 'object') {
						if (model_to_add[prop_to_set.value.key]) {
							model_to_add.pivot[prop_to_set.key] = model_to_add[prop_to_set.value.key] 
						} else {
							model_to_add.pivot[prop_to_set.key] = prop_to_set.value.value_if_undefined
						}
					} else {
						model_to_add.pivot[prop_to_set.key] = prop_to_set.value 
					}
				})
			}
			console.log('*********************')
			console.log('asi estaba antes de agregar '+prop.key)
			console.log(this.model)

			this.model[prop.key].push(model_to_add)
			// this.$set(this.model, prop.key, this.model[prop.key])

			this.setTableFocus(prop, model_to_add)

			this.$store.commit(this.model_name+'/setModel', {
				model: {
					...this.model
				},
				properties: []
			})

			console.log('asi quedo despues de agregar '+prop.key)
			console.log(this.model)
			console.log('*********************')

		},
		setTableFocus(prop, model_to_add) {
			if (prop.belongs_to_many.properties_to_set && prop.belongs_to_many.properties_to_set.length) {
				setTimeout(() => {
					let class_name = prop.belongs_to_many.model_name+'-'+prop.belongs_to_many.properties_to_set[0].key+'-'+model_to_add.id
					let elements = document.getElementsByClassName(class_name) 
					if (elements.length) {
						elements[elements.length-1].focus()
					}
				}, 300)
			}
		},
		clickEnter(prop) {
			/*
				Si el campo está configurado para chequeo de repetidos y la configuración del usuario lo permite,
				se ejecuta el chequeo. Caso especial: algunos usuarios permiten `provider_code` repetidos en artículos.
			*/
			if (prop.use_to_check_if_is_repeat && this.can_check_is_repeat(prop)) {
				/*
					Se registra el valor antes de chequear para evitar que el blur posterior al Enter
					dispare el mismo chequeo nuevamente.
				*/
				this.set_last_repeat_check_value(prop)
				this.checkIsRepeat(prop)
			} else {
				this.$emit('save', {close: true})
				// this.$emit('save')
			}
		},
		/*
			Dispara el chequeo de repetidos cuando el input pierde foco.
			Se ejecuta solo para props que declaran `use_to_check_if_is_repeat`.
		*/
		on_field_blur(prop) {
			/* No aplicar si el campo no participa en el chequeo de repetidos. */
			if (!prop || !prop.use_to_check_if_is_repeat) {
				return
			}

			/* Respeta configuración por usuario para omitir chequeos puntuales. */
			if (!this.can_check_is_repeat(prop)) {
				return
			}

			/* No chequear si no hay valor cargado. */
			let current_value = this.model && this.model[prop.key] != null ? String(this.model[prop.key]) : ''
			if (current_value.trim() == '') {
				return
			}

			/* Evita requests duplicadas si ya se chequeó este mismo valor. */
			let normalized_value = current_value.toLowerCase()
			if (this.last_repeat_check_by_prop_key[prop.key] === normalized_value) {
				return
			}

			/* Se registra el valor y se ejecuta el mismo chequeo que en Enter. */
			this.last_repeat_check_by_prop_key[prop.key] = normalized_value
			this.checkIsRepeat(prop)
		},
		/**
		 * Placeholder para campos type="password" (write-only: el backend nunca devuelve
		 * el valor real guardado, asi que el input siempre arranca vacio).
		 *
		 * Convencion: si el modelo trae `has_<key>` en true (ej: `has_mail_password`),
		 * se asume que ya hay un valor guardado y se avisa con un placeholder, sin
		 * exponer nunca la contraseña real.
		 *
		 * @param {Object} prop Propiedad declarativa del modelo (properties[]).
		 * @returns {String|null} Texto de placeholder, o null si no aplica.
		 */
		passwordPlaceholder(prop) {
			/* Solo aplica a campos de tipo password. */
			if (!prop || prop.type != 'password') {
				return null
			}

			/* Chequea el flag `has_<key>` que informa el backend (ej: has_mail_password). */
			let has_value_key = 'has_' + prop.key
			if (this.model && this.model[has_value_key]) {
				return '••••••••  (dejar vacío para no cambiarla)'
			}

			return null
		},
		/*
			Define si corresponde ejecutar el chequeo de repetidos para el `prop` actual.
			Se usa para poder omitir `provider_code` en artículos cuando el usuario lo permite.
		*/
		can_check_is_repeat(prop) {
			/* Validación defensiva por compatibilidad con props dinámicas del form. */
			if (!prop || !prop.key) {
				return false
			}

			/* El chequeo de repetidos solo aplica al alta (create), no al editar. */
			if (this.model && this.model.id) {
				return false
			}

			/*
				Caso particular: `provider_code` en artículos.
				Si el owner permite códigos repetidos (`usa_provider_codes_repetidos = 1`),
				no se valida unicidad al crear.
			*/
			if (this.model_name == 'article' && prop.key == 'provider_code') {
				/*
					Comparación explícita porque el valor puede llegar como boolean, number o string.
				*/
				if (Number(this.owner && this.owner.usa_provider_codes_repetidos) === 1) {
					return false
				}
			}

			return true
		},
		/*
			Registra el último valor chequeado para un `prop` específico.
			Se usa principalmente para el flujo de Enter → foco al siguiente input.
		*/
		set_last_repeat_check_value(prop) {
			/* Validación defensiva para no romper si llega un `prop` inesperado. */
			if (!prop || !prop.key) {
				return
			}

			/* Normalizamos a string en minúscula para comparar en forma consistente. */
			let current_value = this.model && this.model[prop.key] != null ? String(this.model[prop.key]) : ''
			this.last_repeat_check_by_prop_key[prop.key] = current_value.trim().toLowerCase()
		},
		async checkIsRepeat(prop) {
		    /* Respeta configuración por usuario para omitir chequeos puntuales. */
		    if (!this.can_check_is_repeat(prop)) {
		    	return
		    }
		    if (prop.use_to_check_if_is_repeat) {
		        let finded = undefined;

		        if (prop.chequear_buscando_desde_api) {
		            // Construir los filtros
		            let filters = [
		                {
		                    type: 'text',
		                    igual_que: this.model[prop.key].toLowerCase(),
		                    key: prop.key
		                }
		            ];

		            // Mostrar mensaje y activar loading
		            this.$store.commit('auth/setMessage', 'Chequeando ' + prop.text);
		            this.$store.commit('auth/setLoading', true);

		            try {
		                // Llamada a la API y esperar la respuesta
		                const res = await this.$api.post('search/' + this.model_name, {
		                    filters
		                });

		                this.$store.commit('auth/setLoading', false);

		                let models = res.data.models;
		                if (models.length) {
		                    console.log('Hay finded:');
		                    finded = models[0];
		                    console.log(models[0]);
		                }
		            } catch (err) {
		                this.$store.commit('auth/setLoading', false);
		                this.$toast.error('Error al chequear ' + prop.text);
		                console.log(err);
		            }
		        } else {
		            // Buscar localmente
		            finded = this.modelsStoreFromName(this.model_name).find(model => {
		                return model[prop.key] && model[prop.key].toLowerCase() == this.model[prop.key].toLowerCase();
		            });
		        }

		        console.log('finded:');
		        console.log(finded);

		        // Validar si se encontró un modelo repetido
		        if (typeof finded != 'undefined' && (!this.model.id || this.model.id != finded.id)) {
		            this.$toast.warning('Ya hay un ' + this.singular(this.model_name) + ' con este ' + this.propText(prop));
		            this.setModel(finded, this.model_name, [], false);
		        } else {
		        	this.foco_input_siguiente(prop)
		        }
		    }
		},
		foco_input_siguiente(prop) {
			console.log('foco_input_siguiente')
			let index = this.properties.findIndex(_prop => {
				return _prop.key == prop.key
			})
			console.log('index: '+index)
			if (index != -1) {

				let prop_siguiente = this.properties[index+1]
				console.log('prop_siguiente: '+prop_siguiente.key)
				let input = document.getElementById(this.model_name+'-'+prop_siguiente.key)
				console.log('input: ')
				console.log(input)
				if (input) {
					setTimeout(() => {
						input.focus()
					}, 200)
				}
			}
		},
		/**
		 * Ancho (unidades de grilla 1..12) para una prop en el formulario.
		 * has_many: override del usuario si existe; si no, default automático según la tabla hija
		 * (respetando full width explícito del modelo). Resto de props: comportamiento original.
		 */
		form_col_for(prop, size) {
			if (prop && prop.has_many) {
				if (this.has_many_form_cols[prop.key]) {
					return this.has_many_form_cols[prop.key]
				}
				if (prop.full_cols || prop.input_full_width || this.input_full_width || this.inputs_full_size) {
					return 12
				}
				return default_has_many_form_cols(this.child_columns_count(prop))
			}
			return this.getCol(prop, size, this.input_full_width)
		},
		/**
		 * Cantidad de columnas visibles de la tabla hija de una prop has_many.
		 * Mismo criterio que usa la tabla (display/table/Index.vue).
		 */
		child_columns_count(prop) {
			let child_props = this.propertiesToShow(this.modelPropertiesFromName(prop.has_many.model_name), true)
			return child_props.length
		},
		/**
		 * Feedback en vivo mientras se arrastra la barra de resize.
		 */
		on_has_many_resizing(payload) {
			this.$set(this.has_many_form_cols, payload.key, payload.cols)
		},
		/**
		 * Al soltar: fija el ancho y lo persiste.
		 */
		on_has_many_resized(payload) {
			this.$set(this.has_many_form_cols, payload.key, payload.cols)
			this.save_has_many_form_cols()
		},
		/**
		 * Persiste el mapa completo de anchos de has_many de este modelo y refresca el cache local.
		 */
		save_has_many_form_cols() {
			let self = this
			save_form_has_many_cols(this, this.model_name, this.has_many_form_cols)
			.then(function () {
				self.has_many_form_cols = form_has_many_cols_from_store(self.$store, self.model_name)
			})
			.catch(function () {
				self.$toast.error('No se pudo guardar el ancho de la tabla')
			})
		},

	},

}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.model-form 
	[class^='col-']
		padding-bottom: 7px
		margin-bottom: 45px

		padding-left: 20px !important
		padding-right: 20px !important
		// @if ($theme == 'dark')
		// 	border-bottom: 1px solid rgba(255,255,255,.2)
		// @else
		// 	border-bottom: 1px solid rgba(0,0,0,.1)
		&:nth-last-child(-n+2)
			border-bottom: none
	.custom-radio 
		margin-bottom: 1em 
		p 
			margin-bottom: 0
			text-align: left
	label 
		text-align: left
		width: 100%

	// Indica ayuda al hover cuando el campo tiene popover de instrucciones (click)
	label.form-label--has-help
		cursor: help

	// ─── Label moderno: compacto, peso alto, tipografía uppercase sutil ───────
	// Similar a LoginForm: pequeño, oscuro, con letra-espaciado para legibilidad
	.form-label
		font-size: 0.78rem
		font-weight: 700
		color: #374151
		text-transform: uppercase
		letter-spacing: 0.045em
		margin-bottom: 0.38rem
		display: block
		transition: color 0.15s ease

	// Sin margen extra; el col maneja el espacio vertical entre campos
	.form-group
		margin-bottom: 0 !important

	hr
		width: 100%
		@if ($theme == 'dark')
			border-top: 1px solid red !important

	// ─── Valor calculado por función ─────────────────────────────────────────
	// Mismo contenedor gris que only_show para coherencia visual
	.function-value
		display: inline-flex
		align-items: center
		min-height: 34px
		padding: 0.28rem 0.75rem
		background: #f3f4f6
		border-radius: 8px
		font-size: 0.9rem
		font-weight: 600
		color: #111827
		margin-left: 0

	// ─── Valor de solo lectura (only_show / from_pre_view) ────────────────────
	// Contenedor tipo "input deshabilitado" con fondo #f3f4f6 (igual que LoginForm)
	.model-form__only-show
		display: inline-flex
		align-items: center
		min-height: 34px
		padding: 0.28rem 0.75rem
		background: #f3f4f6
		border-radius: 8px
		border: 1px solid transparent
		line-height: 1.45
		max-width: 100%

	// Texto del valor presente: legible, peso medio, oscuro
	.model-form__only-show-value
		font-size: 0.9rem
		font-weight: 500
		color: #111827
		word-break: break-word

	// Campo vacío: indicador visual en gris claro itálica
	.model-form__no-data
		font-size: 0.8rem
		font-style: italic
		color: #9ca3af

	// ─── Badge boolean (Sí / No) ──────────────────────────────────────────────
	.model-form__boolean-badge
		display: inline-flex
		align-items: center
		font-size: 0.75rem
		font-weight: 700
		padding: 0.2rem 0.7rem
		border-radius: 9999px
		letter-spacing: 0.03em
		line-height: 1.4

	// Sí: verde suave sobre fondo esmeralda muy claro
	.model-form__boolean-badge--yes
		background: #d1fae5
		color: #065f46

	// No: rojo suave sobre fondo rojo muy claro
	.model-form__boolean-badge--no
		background: #fee2e2
		color: #991b1b

	// ─── Toggle tipo iPhone (reemplaza b-form-checkbox) ─────────────────────
	// Contenedor clickeable que actúa como label del input oculto
	.model-form__toggle
		position: relative
		display: inline-block
		width: 44px
		height: 26px
		cursor: pointer
		vertical-align: middle
		margin-bottom: 0

		// Input nativo oculto visualmente pero accesible
		input
			opacity: 0
			width: 0
			height: 0
			position: absolute

		// Fondo del toggle: gris inactivo → verde activo
		.model-form__toggle-track
			position: absolute
			inset: 0
			background: #d1d5db
			border-radius: 9999px
			transition: background 0.2s ease

		// Círculo deslizante blanco
		.model-form__toggle-thumb
			position: absolute
			height: 20px
			width: 20px
			left: 3px
			bottom: 3px
			background: #fff
			border-radius: 50%
			transition: transform 0.2s ease
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)

		// Estado activo: fondo verde estilo iOS y thumb desplazado
		input:checked ~ .model-form__toggle-track
			background: #22c55e

		input:checked ~ .model-form__toggle-track .model-form__toggle-thumb
			transform: translateX(18px)

		// Estado deshabilitado: todo atenuado y cursor bloqueado
		&.model-form__toggle--disabled
			opacity: 0.45
			cursor: not-allowed
			pointer-events: none

	// ─── Metadatos de fecha (Creado / Actualizado) ────────────────────────────
	// Fila inferior del formulario: separador sutil y menos margen que los campos editables
	.model-form__meta-row
		margin-top: 0.25rem
		padding-top: 1.25rem
		border-top: 1px solid #e5e7eb
		width: 100%

	// Anula el margin-bottom grande de las columnas del grid principal
	.model-form__meta-col
		margin-bottom: 1rem !important
		padding-bottom: 0 !important

	.model-form__meta-field
		margin-bottom: 0

	// Contenedor gris: mismo aspecto que only_show y login-form__input-row
	.model-form__meta-input-row
		display: flex
		align-items: center
		min-height: 34px
		padding: 0.28rem 0.75rem
		background: #f3f4f6
		border-radius: 8px
		border: 1px solid transparent
		line-height: 1.45
		max-width: 100%

	// Fecha + tiempo relativo en un solo bloque legible
	.model-form__meta-value
		font-size: 0.875rem
		font-weight: 500
		color: #4b5563
		word-break: break-word

// ─── Popover de instrucciones ─────────────────────────────────────────────────
.popover-body
	max-height: 60vh !important
	overflow-y: auto
</style>
