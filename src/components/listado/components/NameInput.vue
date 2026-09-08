<template>
	<div>
		<!-- bar_code: {{ model.bar_code }} {{ typeof model.bar_code }} -->
		<!--
			🔴 El `id` no estaba, y sin el este campo publicaba `data-testid="article"` a secas:
			`search/Index.vue` arma su `_id` con el `id` que le pasen y, si no le pasan ninguno, cae
			al `model_name`. O sea que el NOMBRE del articulo se llamaba igual que el modelo, que es
			el peor nombre posible para el campo mas usado del formulario.

			Con el id explicito pasa a ser `article-name`, que es la convencion generica
			`<model_name>-<key>` del resto del sistema, y el mismo que usa el textarea de abajo --que
			es la otra cara de este mismo campo--. Solo uno de los dos se dibuja a la vez, asi que no
			se pisan.
		-->
		<search-component
		v-if="(!model.bar_code || model.bar_code == '')
		&& (!model.provider_code || model.provider_code == '')"
		id="article-name"
		@setSelected="setSelected"
		:auto_select="false"
		:save_if_not_exist="false"
		:clear_query="false"
		:show_selected="false"
		search_from_api
		emit_selected_with_null
		no_exist_message="Preciona ENTER para usar este nombre"
		:init_query="init_query"
		:prop="{key: 'name', text: 'Nombre', set_model_on_click_or_prop_with_query_if_null: true}" 
		:model="model"
		model_name="article"></search-component>

		<b-form-textarea
		placeholder="Ingrese el nombre"
		id="article-name"
		data-testid="article-name"
		data-tour="listado.campo_nombre"
		v-model="model.name"
		v-else></b-form-textarea>

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