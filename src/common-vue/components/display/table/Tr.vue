<template>
	<tr
	@click="onRowSelected(model)"
	:class="rowClass(model)">
		<td
		v-for="(prop, index) in props"
		:key="prop.key + '-' + index"
		v-if="showProperty(prop)"
		:style="column_style(prop)">
			<div 
			:class="get_cell_classes(prop, index)"
			class="cont-tr">
				<!--
					El slot personalizado también queda dentro de `cont-tr` para
					heredar recorte/ellipsis y evitar superposición con la celda siguiente.
				-->
				<slot :name="prop.key">
					<pivot-prop
					v-if="prop.is_pivot_prop"
					:cont_table_id="cont_table_id"
					:pivot_parent_model="pivot_parent_model"
					:model="model"
					:index="index"
					:model_name="model_name"
					:prop="prop"></pivot-prop>

					<vue-load-image
					v-else-if="isImageProp(prop) && imageUrl(model, prop)"
					class="img-fluid">
						<img 
						slot="image"
						class="article-thumbnail"
						@click.stop.prevent="openImagePreview(imageUrl(model, prop))"
						@mousedown.stop.prevent
						:src="imageUrl(model, prop)">

				        <b-spinner
						slot="preloader"
				        variant="primary"></b-spinner>

						<div slot="error">Imagen no encontrada</div>
					</vue-load-image>
					<div
					v-if="show_image_preview && preview_image_url"
					class="image-preview-overlay"
					@click.self.stop.prevent="closeImagePreview"
					@mousedown.stop.prevent>
						<div
						class="image-preview-modal"
						@click.stop
						@mousedown.stop>
							<button
							type="button"
							class="image-preview-close"
							@click.stop.prevent="closeImagePreview"
							@mousedown.stop.prevent>
								×
							</button>
							<img
							class="image-preview-large"
							:src="preview_image_url"
							alt="Vista previa de articulo">
						</div>
					</div>


					<div
					v-else-if="showInput(prop, model)">
						<b-form-textarea
						v-if="prop.type == 'textarea'"
						:class="getInputSize(prop)"
						:placeholder="propertyText(model, prop)"
						v-model="model[prop.key]"></b-form-textarea>

						<b-form-input
						v-if="prop.type == 'text'"
						:class="getInputSize(prop)"
						:placeholder="propertyText(model, prop)"
						v-model="model[prop.key]"></b-form-input>

						<p
						v-if="prop.type == 'checkbox'">
							<span
							v-if="model[prop.key]">
								Si
							</span>
							<span
							v-else>
								No
							</span>
						</p>
					</div>

					<b-button
					v-else-if="showProperty(prop, model) && prop.button"
					:variant="prop.button.variant"
					@click.stop="callMethod(prop, model)">
						<i
						v-if="prop.button.icon"
						:class="'icon-'+prop.button.icon"></i>

						<span
						v-else-if="prop.button.button_text">
							{{ prop.button.button_text }}
						</span>
						
						<span
						v-else>
							{{ propertyText(model, prop) }}
						</span>
					</b-button>
					

					<template
					v-else-if="prop.is_relation_column">
						{{ relationColumnValue(model, prop) }}
					</template>

					<template
					v-else-if="!prop.is_pivot_prop">
						<template
						v-if="prop.from_pivot">
							{{ propertyText(model.pivot, prop) }}
						</template>
						<template
						v-else>
							{{ propertyText(model, prop) }}
						</template>
					</template>
					<template
					v-if="prop.key == 'table_right_options'">
					<!-- <template
					v-if="index == props.length-1"> -->
						<slot name="table_right_options" :model="model">
							&nbsp;
						</slot>
					</template>
				</slot>
			</div>
		</td>
		<!-- <td>
			<span
			v-if="!pivot">
				{{ date(model.updated_at) }}
			</span>
		</td> -->
		<!-- <td>
			<slot name="table_right_options" :model="model">
				&nbsp
			</slot>
		</td> -->
	</tr>
</template>
<script>
export default {
	props: {
		model: Object,
		pivot: Object,
		props: Array,
		model_name: String,
		select_mode: String,
		set_model_on_row_selected: Boolean,
		cont_table_id: String,
		pivot_parent_model: Object,
		disable_cell_fade: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		VueLoadImage: () => import('vue-load-image'),
		PivotProp: () => import('@/common-vue/components/display/table/PivotProp'),
	},
	data() {
		return {
			show_image_preview: false,
			preview_image_url: '',
		}
	},
	mounted() {
		window.addEventListener('keydown', this.handlePreviewKeydown)
	},
	beforeDestroy() {
		window.removeEventListener('keydown', this.handlePreviewKeydown)
	},
	methods: {
		openImagePreview(image_url) {
			if (!image_url) {
				return
			}
			this.preview_image_url = image_url
			this.show_image_preview = true
		},
		closeImagePreview() {
			this.show_image_preview = false
			this.preview_image_url = ''
		},
		handlePreviewKeydown(event) {
			if (event.key == 'Escape' && this.show_image_preview) {
				this.closeImagePreview()
			}
		},
		rowClass(model) {
			let color = ''
			if (this.model_name && this.hasColor(this.model_name)) {
				let fun_name = this.model_name+'GetColor'
				console.log('fun_name: '+fun_name)
				color += this[fun_name](model)
			}
			if (this.isSelected(model)) {
				color += ' selected-row'
			}
			return color 
		},
		isSelected(model) {
			let is_selecteable = this.$store.state[this.model_name].is_selecteable
			if (typeof is_selecteable != 'undefined' && is_selecteable) {
				let index = this.$store.state[this.model_name].selected.findIndex(_model => {
					return _model.id == model.id 
				})
				if (index != -1) {
					return true 
				}
			}
			return false
		},
		onRowSelected(model) {
			if (this.select_mode == 'single') {
				console.log('se emitio onRowSelected desde tr')
				console.log(model)
				this.$emit('onRowSelected', model)
				if (this.set_model_on_row_selected) {
					this.setModel(model, this.model_name)
				}
			} else {
				this.$store.commit(this.model_name+'/addSelected', model)
			}
		},
		showInput(prop, model) {
			if (prop.show_in_input_if) {
				if (prop.show_in_input_if[1] == '<') {
					return model[prop.show_in_input_if[0]] < prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '=') {
					return model[prop.show_in_input_if[0]] == prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '>') {
					return model[prop.show_in_input_if[0]] > prop.show_in_input_if[2] 
				}
			}
		},
		width(prop) {
			if (prop.table_width && prop.table_width == 'lg') {
				return 'width-300'
			}
			return ''
		},
		propsToSet(prop) {
			let props = []
			if (this.pivot) {
				this.pivot.properties_to_set.forEach(prop => {
					if (!prop.can || (prop.can && this.can(prop.can))) {
						if (prop.from_store) {
							let models = this.modelsStoreFromName(prop.store)
							models.forEach(model => {
								props.push({
									type: prop.type,
									text: model.name,
									key: prop.store+'_'+model.id,
									size: prop.size,
								})
							})
						} else {
							props.push(prop)
						}
					}
				})
			}
			return props 
		},
		/**
		 * Obtiene el valor de pivote para una columna dinámica de relación.
		 *
		 * @param {Object} model - El modelo de la fila (ej: article)
		 * @param {Object} prop - La prop de columna generada dinámicamente, con:
		 *   - relation {string}: nombre de la relación en el model (ej: 'addresses')
		 *   - related_model_id {number}: id del ítem relacionado que corresponde a esta columna
		 *   - pivot_value_prop {string}: prop del objeto pivot a mostrar (ej: 'amount')
		 * @returns {string|number} El valor del pivot, o cadena vacía si no aplica
		 */
		relationColumnValue(model, prop) {
			// Obtener los ítems de la relación del model
			let related_items = model[prop.relation]
			if (!related_items || !related_items.length) {
				return ''
			}
			// Buscar el ítem que corresponde a la columna por su id
			let related = related_items.find(item => item.id == prop.related_model_id)
			if (!related || !related.pivot) {
				return ''
			}
			return related.pivot[prop.pivot_value_prop]
		},
		column_style(prop) {
			// Las columnas de opciones laterales se ajustan al contenido sin recortes.
			if (this.is_options_column(prop)) {
				return {
					width: '1%',
					minWidth: 'auto',
					maxWidth: 'none',
					whiteSpace: 'nowrap',
				}
			}
			if (prop.table_width && Number(prop.table_width) > 0) {
				return {
					width: Number(prop.table_width) + 'px',
					minWidth: Number(prop.table_width) + 'px',
					maxWidth: Number(prop.table_width) + 'px',
				}
			}
			return {}
		},
		get_cell_classes(prop, index) {
			/**
			 * Lista de clases que controlan recorte y comportamiento de texto en la celda.
			 */
			let classes = []
			if (index == this.props.length - 1) {
				classes.push('cont-tr-full-width')
			}
			if (this.is_options_column(prop)) {
				classes.push('cell-options')
				return classes
			}
			if (prop.table_wrap_content) {
				classes.push('cell-wrap')
			} else {
				classes.push('cell-nowrap')
				if (this.disable_cell_fade) {
					classes.push('cell-no-fade')
				}
			}
			return classes
		},
		/**
		 * Determina si la celda corresponde a una columna de opciones laterales.
		 *
		 * @param {Object} prop - Definición de propiedad de la columna.
		 * @returns {Boolean} true cuando es table_left_options o table_right_options.
		 */
		is_options_column(prop) {
			return prop
				&& (
					prop.key === 'table_left_options'
					|| prop.key === 'table_right_options'
				)
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'

.cont-tr
	width: 100%
	display: flex 
	flex-direction: row 
	justify-content: flex-start // Cambia a flex-start para permitir que el contenido ocupe el espacio disponible
	align-items: center
	white-space: nowrap // Esto evitará que el texto se rompa en múltiples líneas
	overflow: hidden // Asegúrate de que el contenido no sobresalga
	text-overflow: ellipsis // Para agregar puntos suspensivos si el texto es demasiado largo
	position: relative

.cell-wrap
	white-space: normal !important
	overflow: visible !important
	text-overflow: initial !important
	word-break: break-word
	overflow-wrap: anywhere
	align-items: flex-start

.cell-nowrap
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis
	/*
		Difuminado del contenido sin capa visible sobre el fondo del td.
		La máscara evita el "rectángulo" al hacer hover en filas. */
	-webkit-mask-image: linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) calc(100% - 26px), rgba(0, 0, 0, 0) 100%)
	mask-image: linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) calc(100% - 26px), rgba(0, 0, 0, 0) 100%)

.cell-no-fade
	-webkit-mask-image: none !important
	mask-image: none !important

.cell-options
	white-space: nowrap
	overflow: visible
	text-overflow: initial
	-webkit-mask-image: none
	mask-image: none

.selected-row
	font-weight: bold 
	// color: #FFF !important
	td 
		background: $yellow !important


.cont-tr-full-width
	white-space: nowrap

	.input-sm 
		width: 70px !important
	.input-md 
		width: 150px !important
	.input-lg
		width: 350px !important

.img-fluid
	// El contenedor de carga debe ocupar todo el ancho disponible de la celda.
	width: 100%

.article-thumbnail
	// La imagen se renderiza al ancho completo del contenedor de la celda.
	display: block
	width: 100%
	max-width: none
	cursor: zoom-in

.image-preview-overlay
	position: fixed
	inset: 0
	background: rgba(0,0,0,.65)
	display: flex
	align-items: center
	justify-content: center
	z-index: 2000
	padding: 1rem

.image-preview-modal
	position: relative
	background: #fff
	padding: .75rem
	border-radius: .5rem
	max-width: 100%
	box-shadow: 0 10px 25px rgba(0,0,0,.35)

.image-preview-large
	width: 500px !important
	max-width: 100%
	height: auto
	display: block

.image-preview-close
	position: absolute
	top: .25rem
	right: .25rem
	width: 2rem
	height: 2rem
	border: 0
	border-radius: 999px
	background: rgba(0,0,0,.75)
	color: #fff
	font-size: 1.4rem
	line-height: 1
	cursor: pointer
</style>