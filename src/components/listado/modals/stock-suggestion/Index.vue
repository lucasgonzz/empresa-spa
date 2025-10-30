<template>
	<b-modal
	title="Sugerencias"
	hide-footer
	size="lg"
	id="stock-suggestions">
		<div>
			<view-component 
			model_name="stock_suggestion"
			:check_permissions="false"
			:show_btn_delete="false">

				<template v-slot:table_left_options="slotProps">
					<b-button
					@click.stop="show_articles(slotProps.model)">
						Articulos
					</b-button>
				</template>
			</view-component>
		</div>
	</b-modal>
</template>
<script> 
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	methods: {
		show_articles(model) {
			console.log(model)
			this.setModel(model, 'stock_suggestion', [], false)
			this.$bvModal.show('stock-suggestion-article')
		}
	}
}
</script>