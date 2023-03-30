<template>
	<div
	class="display">
		<load-pages-info
		:model_name="model_name"></load-pages-info>
		<color-info
		:model_name="model_name"></color-info>
		<div
		v-if="order_list_by === null || is_filtered">
			<table-component
			:show_created_at="show_created_at"
			:show_btn_edit="show_btn_edit"
			:properties="properties"
			:loading="loading_prop"
			:models="models_to_show"
			:model_name="model_name"
			:set_model_on_click="set_model_on_click"
			:on_click_set_property="on_click_set_property"
			@clicked="clicked"
			v-if="_display == 'table'">
				<template v-slot:btn-edit="slotProps">
					<slot name="buttons" :model="slotProps.model"></slot>
				</template>  
				<template v-slot:default="slotProps">
					<slot :model="slotProps.model"></slot>
				</template>
			</table-component>

			<cards-component
			:show_created_at="show_created_at"
			:properties="properties"
			:loading="loading_prop"
			:models="models_to_show"
			:model_name="model_name"
			:set_model_on_click="set_model_on_click"
			:on_click_set_property="on_click_set_property"
			@clicked="clicked"
			v-if="_display == 'cards'">
				<template v-slot:default="slotProps">
					<slot :model="slotProps.model"></slot>
				</template>
			</cards-component>

			<btn-add-to-show
			@add="add"
			:models="_models"
			:models_to_show="models_to_show"></btn-add-to-show>
		</div>
		<div
		v-else>
			<div
			v-if="loading_prop">
				<table-component
				:show_created_at="show_created_at"
				:show_btn_edit="show_btn_edit"
				:properties="properties"
				:loading="loading_prop"
				:models="[]"
				:model_name="model_name"
				:set_model_on_click="set_model_on_click"
				:on_click_set_property="on_click_set_property"
				@clicked="clicked"
				v-if="_display == 'table'">
					<template v-slot:btn-edit="slotProps">
						<slot name="buttons" :model="slotProps.model"></slot>
					</template>  
					<template v-slot:default="slotProps">
						<slot :model="slotProps.model"></slot>
					</template>
				</table-component>

				<cards-component
				:show_created_at="show_created_at"
				:properties="properties"
				:loading="loading_prop"
				:models="[]"
				:model_name="model_name"
				:set_model_on_click="set_model_on_click"
				:on_click_set_property="on_click_set_property"
				@clicked="clicked"
				v-if="_display == 'cards'">
					<template v-slot:default="slotProps">
						<slot :model="slotProps.model"></slot>
					</template>
				</cards-component>
			</div>
			<div
			v-else>
				<div
				v-for="list in lists">
					<p
					class="list-title">
						{{ list.name }}
					</p>
					<table-component
					:show_created_at="show_created_at"
					:show_btn_edit="show_btn_edit"
					:properties="properties"
					:loading="loading_prop"
					:models="list.models"
					:model_name="model_name"
					:set_model_on_click="set_model_on_click"
					:on_click_set_property="on_click_set_property"
					@clicked="clicked"
					v-if="_display == 'table'">
						<template v-slot:btn-edit="slotProps">
							<slot name="buttons" :model="slotProps.model"></slot>
						</template>  
						<template v-slot:default="slotProps">
							<slot :model="slotProps.model"></slot>
						</template>
					</table-component>

					<cards-component
					:show_created_at="show_created_at"
					:properties="properties"
					:loading="loading_prop"
					:models="list.models"
					:model_name="model_name"
					:set_model_on_click="set_model_on_click"
					:on_click_set_property="on_click_set_property"
					@clicked="clicked"
					v-if="_display == 'cards'">
						<template v-slot:default="slotProps">
							<slot :model="slotProps.model"></slot>
						</template>
					</cards-component>
					<hr>
				</div>
			</div>
		</div>


	</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'
import CardsComponent from '@/common-vue/components/display/cards/Index'
import BtnAddToShow from '@/common-vue/components/BtnAddToShow'
export default {
	props: {
		loading: {
			type: Boolean,
			default: null
		},
		models: {
			type: Array,
			default() {
				return []
			},
		},
		model_name: String,
		properties: {
			type: Array,
		},
		set_model_on_click: {
			type: Boolean,
			default: true,
		},
		on_click_set_property: {
			type: String,
			default: null,
		},
		show_models_if_empty: {
			type: Boolean,
			default: false,
		},
		show_btn_edit: {
			type: Boolean,
			default: true,
		},
		display: {
			type: String,
			default: null
		},
		show_created_at: {
			type: Boolean,
			default: true,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		order_list_by: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			index_to_show: 1,
			cant_models_to_show: 20,
		}
	},
	computed: {
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered 
		},
		_display() {
			if (this.display) {
				return this.display
			}
			return this.$store.state[this.model_name].display
		},
		loading_prop() {
			if (this.loading) {
				return this.loading
			}
			return this.$store.state[this.model_name].loading
		},
		_models() {
			if (this.models.length || this.show_models_if_empty) {
				console.log('return models que vinieron por props')
				return this.models
			} else {
				if (typeof this.is_filtered != 'undefined' && this.is_filtered) {
					let filtered = this.$store.state[this.model_name].filtered 
					// console.log('return filtered_models')
					return filtered
				}  
				// console.log('return store_models')
				return this.$store.state[this.model_name].models 
			}
		},
		models_to_show() {
			return this._models.slice(0, (this.cant_models_to_show * this.index_to_show))
		},
		lists() {
			if (this.order_list_by) {
				let models_from_order_by = this.$store.state[this.order_list_by].models
				let lists = []
				let list
				models_from_order_by.forEach(model => {
					list = {}
					if (this.idiom == 'es') {
						list.name = model.nombre
					} else {
						list.name = model.name
					}
					list.models = this.$store.state[this.model_name].models.filter(_model => {
						return _model[this.order_list_by+'_id'] == model.id 
					})
					lists.push(list)
				})
				return lists
			} 
		}
	},
	methods: {
		clicked(model) {
			this.$emit('clicked', model)
		},
		add() {
			this.index_to_show++
		}
	},
	components: {
		ColorInfo: () => import('@/common-vue/components/display/ColorInfo'),
		LoadPagesInfo: () => import('@/common-vue/components/display/LoadPagesInfo'),
		TableComponent,
		CardsComponent,
		BtnAddToShow,
	}
}
</script>
<style lang="sass">
.display
	table 
		@media screen and (max-width: 768px)
			border-radius: 0px !important
	.list-title
		text-align: left
		font-weight: bold
		margin-top: 15px
		@media screen and (max-width: 768px)
			padding-left: 15px	
</style>