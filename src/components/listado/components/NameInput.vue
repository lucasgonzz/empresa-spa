<template>
	<div>
		<!-- bar_code: {{ model.bar_code }} {{ typeof model.bar_code }} -->
		<search-component
		v-if="!model.bar_code || model.bar_code == ''"
		@setSelected="setSelected"
		:auto_select="false"
		:save_if_not_exist="false"
		:clear_query="false"
		:prop="{key: 'name', text: 'Nombre', set_model_on_click_or_prop_with_query_if_null: true}" 
		:model="model"
		model_name="article"></search-component>

		<b-form-input
		placeholder="Ingrese el nombre"
		v-model="model.name"
		v-else></b-form-input>

	</div>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
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