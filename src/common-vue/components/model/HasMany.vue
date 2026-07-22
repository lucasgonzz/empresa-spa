<template>
	<div
	class="m-l-15"
	:data-testid="parent_model_name + '-' + prop.key">
		<model-component
		@modelDeleted="modelDeleted"
		@modelSaved="modelSaved"
		:has_many_parent_model="parent_model"
		:has_many_parent_model_name="parent_model_name"
		:has_many_prop="prop"
		:props_to_send_on_save_function="prop.has_many.props_to_send_on_save_function"
		:model_name="prop.has_many.model_name">
			<template
				v-for="prop in has_many_model_props"
				v-slot:[prop.key]
			>
				
				<slot 
					:name="'has-many-prop-'+prop.key"
				>
				</slot>
			</template>
		</model-component>	
	    <confirm
	    :model_name="prop.has_many.model_name"
	    :actions="[parent_model_name+'/deletePropModel']"
	    :id="'delete-'+prop.key"></confirm>
	    
	    <div
		class="has-many-table-container"
		@mouseenter="setTableHoverState(true)"
		@mouseleave="setTableHoverState(false)">
			<!-- Boton contextual para ampliar la vista cuando el usuario interactua con la tabla -->
			<b-button
			v-if="show_expand_button"
			class="has-many-expand-button"
			size="sm"
			variant="primary"
			@click="openExpandModal">
				<i class="icon-eye"></i>
				Ampliar
			</b-button>

			<table-component
			disable_scroll
		    :models="parent_model[prop.key]"
		    is_from_has_many
		    :model_name="prop.has_many.model_name"></table-component>

			<!-- Barra de resize: arrastrar el borde derecho para ajustar el ancho (unidades de grilla) -->
			<div
			v-if="!is_mobile"
			class="has-many-resize-handle"
			:class="{ 'has-many-resize-handle--active': is_resizing }"
			@mousedown.prevent="start_resize"
			title="Arrastrar para ajustar el ancho de la tabla">
				<div class="has-many-resize-handle__grip"></div>
			</div>
		</div>
	    
		<b-button
		v-if="!prop.has_many.models_from_parent_prop && (typeof prop.has_many.show_btn_create == 'undefined' || prop.has_many.show_btn_create)"
		class="m-t-15"  
		@click="create(prop.has_many.model_name, parent_model)"
		size="sm"
		variant="primary">
			<i class="icon-plus"></i>
			Agregar {{ singular(prop.has_many.model_name) }}
		</b-button>

		<!-- Hook aditivo opcional: componente extra declarado en el meta del prop (has_many.extra_action_component). Si el prop no lo declara, extra_action_component es null y no se renderiza nada. -->
		<component
		v-if="extra_action_component"
		:is="extra_action_component"
		:parent_model="parent_model"
		:parent_model_name="parent_model_name"
		class="m-t-15 m-l-10"></component>

		<b-modal
		hide-footer
		:title="'Detalle de '+plural(prop.has_many.model_name)"
		size="xl"
		:id="expand_modal_id"
		v-model="show_expand_modal">
			<table-component
			disable_scroll
			:models="parent_model[prop.key]"
			is_from_has_many
			:model_name="prop.has_many.model_name"></table-component>

			<b-button
			v-if="!prop.has_many.models_from_parent_prop && (typeof prop.has_many.show_btn_create == 'undefined' || prop.has_many.show_btn_create)"
			class="m-t-15"
			@click="create(prop.has_many.model_name, parent_model)"
			size="sm"
			variant="primary">
				<i class="icon-plus"></i>
				Agregar {{ singular(prop.has_many.model_name) }}
			</b-button>

			<!-- Hook aditivo opcional dentro de la vista "Ampliar": mismo componente extra que en la vista compacta. -->
			<component
			v-if="extra_action_component"
			:is="extra_action_component"
			:parent_model="parent_model"
			:parent_model_name="parent_model_name"
			class="m-t-15 m-l-10"></component>
		</b-modal>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import TableComponent from '@/common-vue/components/display/table/Index'

import Confirm from '@/common-vue/components/Confirm'

/**
 * Registro estatico de componentes "extra" opcionales para el hook aditivo de HasMany
 * (has_many.extra_action_component en el meta del prop). Cada entrada es un import con un
 * string LITERAL completo: webpack lo resuelve de forma directa, sin construir un contexto
 * dinamico que tenga que escanear todo src/components/ en disco (ver nota en el computed
 * extra_action_component mas abajo).
 *
 * Para agregar un nuevo extra_action_component en el futuro: sumar una entrada aca con la
 * misma clave que se declare en el meta del prop del modelo.
 */
const EXTRA_ACTION_COMPONENTS = {
	'listado/components/ArticleDescriptionsAiBtn': () => import(
		/* webpackChunkName: "has-many-extra-action" */
		'@/components/listado/components/ArticleDescriptionsAiBtn.vue'
	),
}

export default {
	name: 'HasMany',
	props: {
		prop: Object,
		parent_model_name: String,
		parent_model: Object,
		form_cols: {
			type: Number,
			default: null,
		},
	},
	components: {
		ModelFormComponent: () => import('@/common-vue/components/model/ModelForm'),
		BtnLoader,
		TableComponent,

		ModelComponent: () => import('@/common-vue/components/model/Index'),
		Confirm,
	},
	data() {
		return {
			// Estado visual para mostrar/ocultar el boton de expandir sobre la tabla compacta.
			show_expand_button: false,
			// Estado de control para abrir/cerrar el modal de visualizacion ampliada.
			show_expand_modal: false,
			// Estado legado existente para operaciones de borrado.
			deleting: 0,

			// Estado del arrastre de la barra de resize.
			is_resizing: false,
			resize_start_x: 0,
			resize_start_cols: 0,
			resize_px_per_col: 0,
			resize_last_cols: null,
		}
	},
	computed: {
		has_many_model_props() {
			return this.modelPropertiesFromName(this.prop.has_many.model_name)
		},	
		prop_model_to_delete() {
			return this.$store.state[this.parent_model_name].prop_model_to_delete
		},
		expand_modal_id() {
			// ID unico por propiedad para evitar colisiones de modal en formularios con multiples HasMany.
			return 'has-many-expand-modal-'+this.parent_model_name+'-'+this.prop.key
		},
		/**
		 * Componente extra opcional declarado en el meta del prop:
		 *   has_many: { extra_action_component: 'listado/components/ArticleDescriptionsAiBtn' }
		 * Si no esta declarado, devuelve null y no se renderiza nada: el HasMany se comporta
		 * exactamente como siempre (cambio estrictamente aditivo, no afecta a ningun otro has_many).
		 *
		 * @return {Function|null}
		 */
		extra_action_component() {
			if (!this.prop.has_many || !this.prop.has_many.extra_action_component) {
				return null
			}

			// Registro estatico (EXTRA_ACTION_COMPONENTS, declarado fuera del componente, arriba de
			// los imports). FIX 14/7/2026: la version anterior armaba el import dinamico por
			// concatenacion de string ('@/components/'+path). webpackInclude solo filtra los
			// candidatos DESPUES de que webpack escanea en disco TODO el arbol de src/components/
			// para construir el contexto -- no limita ese escaneo. Un problema de filesystem en
			// CUALQUIER carpeta bajo src/components/, sin relacion alguna con este hook, rompia el
			// build entero (paso real: scandir de src/components/online/config fallando en local
			// justo despues de un merge). Con un registro estatico de imports literales, webpack
			// resuelve cada entrada de forma directa, sin escanear nada.
			return EXTRA_ACTION_COMPONENTS[this.prop.has_many.extra_action_component] || null
		},
		// text_delete_() {
		// 	if (this.prop_model_to_delete) {
		// 		return this.prop_model_to_delete.text 
		// 	}
		// 	return ''
		// },
	},
	methods: {
		addHasMany() {
			// Se clona el modelo base para no mutar la referencia original del schema del has_many.
			let model_to_add = {...this.prop.has_many.model}
			this.$set(this.parent_model, this.prop.key, this.parent_model[this.prop.key].concat([model_to_add]))
		},
		setTableHoverState(is_hovered) {
			// Sincroniza el estado de hover para mostrar el CTA de ampliacion solo cuando corresponde.
			this.show_expand_button = is_hovered
		},
		openExpandModal() {
			// Abre el modal de detalle ampliado manteniendo la misma informacion de la tabla compacta.
			this.show_expand_modal = true
		},
		modelDeleted(model) {
			// alert('hasMany modelDeleted')
			this.$emit('modelDeleted')
		},
		modelSaved(model) {
			// alert('hasMany modelSaved')
			this.$emit('modelSaved', model)
		},
		/**
		 * Inicia el resize: mide el track de 12 columnas (b-form-row) y el ancho real
		 * de la columna actual para derivar las cols de arranque, independiente del breakpoint.
		 */
		start_resize(event) {
			let form_row = this.$el.closest('.form-row')
			let col_el = this.$el.closest('[class*="col-"]')
			if (!form_row || !col_el) {
				return
			}
			let track_width = form_row.clientWidth
			this.resize_px_per_col = track_width / 12
			if (!this.resize_px_per_col) {
				return
			}
			this.resize_start_cols = this.clamp_cols(Math.round(col_el.getBoundingClientRect().width / this.resize_px_per_col))
			this.resize_start_x = event.clientX
			this.resize_last_cols = this.resize_start_cols
			this.is_resizing = true

			this._resize_on_move = this.on_resize_move.bind(this)
			this._resize_on_up = this.stop_resize.bind(this)
			document.addEventListener('mousemove', this._resize_on_move)
			document.addEventListener('mouseup', this._resize_on_up)
			document.body.style.userSelect = 'none'
		},
		/**
		 * Durante el arrastre: convierte el delta en píxeles a delta de columnas (snap a entero)
		 * y emite el nuevo ancho para feedback en vivo.
		 */
		on_resize_move(event) {
			if (!this.is_resizing) {
				return
			}
			let delta_cols = Math.round((event.clientX - this.resize_start_x) / this.resize_px_per_col)
			let new_cols = this.clamp_cols(this.resize_start_cols + delta_cols)
			if (new_cols !== this.resize_last_cols) {
				this.resize_last_cols = new_cols
				this.$emit('resizing', { key: this.prop.key, cols: new_cols })
			}
		},
		/**
		 * Al soltar: fija el ancho final y pide persistir.
		 */
		stop_resize() {
			if (!this.is_resizing) {
				return
			}
			this.is_resizing = false
			document.removeEventListener('mousemove', this._resize_on_move)
			document.removeEventListener('mouseup', this._resize_on_up)
			document.body.style.userSelect = ''
			this.$emit('resized', { key: this.prop.key, cols: this.resize_last_cols })
		},
		/**
		 * Acota el ancho al rango permitido (mín 3, máx 12 unidades de grilla).
		 */
		clamp_cols(cols) {
			if (cols < 3) {
				return 3
			}
			if (cols > 12) {
				return 12
			}
			return cols
		},
	},
	/**
	 * Limpia listeners globales si el componente se desmonta a mitad de un drag
	 * (ej. se cierra el modal del formulario mientras el usuario arrastra la barra).
	 */
	beforeDestroy() {
		if (this._resize_on_move) {
			document.removeEventListener('mousemove', this._resize_on_move)
		}
		if (this._resize_on_up) {
			document.removeEventListener('mouseup', this._resize_on_up)
		}
		document.body.style.userSelect = ''
	},
}
</script>
<style scoped>
.has-many-table-container {
	position: relative;
}

.has-many-expand-button {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 1000;
}

/* Barra de resize: oculta hasta hover, cursor de redimensionar horizontal */
.has-many-resize-handle {
	position: absolute;
	top: 0;
	right: -4px;
	width: 10px;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: ew-resize;
	opacity: 0;
	transition: opacity 0.15s ease;
	z-index: 1001;
}

/* Se muestra al hacer hover sobre la tabla contenedora */
.has-many-table-container:hover .has-many-resize-handle {
	opacity: 0.45;
}

/* Full opacidad al hacer hover directo sobre la barra o mientras se arrastra */
.has-many-resize-handle:hover,
.has-many-resize-handle--active {
	opacity: 1;
}

/* Grip visual: barrita azul vertical */
.has-many-resize-handle__grip {
	width: 4px;
	height: 42px;
	border-radius: 4px;
	background: #3b82f6;
}
</style>