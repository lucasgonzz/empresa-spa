<template> 
<div>
	
	<articulos-que-subieron-de-precio-modal></articulos-que-subieron-de-precio-modal>

	<b-modal
	title="Pre importaciones de Articulos"
	hide-footer
	size="lg"
	id="articles-pre-import-modal">
		
		<view-component
		@clicked="clicked"
		change_from_dates_option
		:show_btn_create="false"
		:show_previus_days="show_previus_days"
		:check_permissions_previus_days="false"
		:set_model_on_row_selected="false"
		model_name="articles_pre_import">
		</view-component>
		
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ArticulosQueSubieronDePrecioModal: () => import('@/components/listado/modals/articles-pre-import/modal-articulos-que-subieron-de-precio/Index'),
	},
	computed: {
		show_previus_days() {
			return this.$store.state.articles_pre_import.from_dates
		},
	},
	methods: {
		clicked(model) {
			console.log('clicked')
			console.log(model)
			this.setModel(model, 'articles_pre_import', [], false, false)
			// setTimeout(() => {
				this.$bvModal.show('articulos-que-subieron-de-precio')
			// }, 300)
		},
	},
}
</script>