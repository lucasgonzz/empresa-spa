<template>
	<div>
		<!-- bar_code: {{ model.bar_code }} {{ typeof model.bar_code }} -->
		<search-component
		v-if="(!model.bar_code || model.bar_code == '') 
		&& (!model.provider_code || model.provider_code == '')"
		@setSelected="setSelected"
		:auto_select="false"
		:save_if_not_exist="false"
		:clear_query="false"
		:show_selected="false"
		search_from_api
		emit_selected_with_null
		:init_query="init_query"
		:prop="{key: 'name', text: 'Nombre', set_model_on_click_or_prop_with_query_if_null: true}" 
		:model="model"
		model_name="article"></search-component>

		<b-form-input
		placeholder="Ingrese el nombre"
		id="article-name"
		v-model="model.name"
		v-else></b-form-input>

	</div>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	data() {
		return {
			init_query: null
		}
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
	},
	created() {
		if (this.model.name) {
			this.init_query = this.model.name 
		}
	},
	methods: {
		setSelected(result) {
			if (result.model) {
				this.setModel(result.model, 'article', [], false)
			} else {
				this.model.name = result.query
			}
		}
	}
}
</script>