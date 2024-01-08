<template>
	<b-modal
	hide-footer
	size="lg"
	title="Articulos sin stock"
	id="articles-stock-0">
		<div class="modal-table-full-height">
			<display
			model_name="article"
			:models="articles_stock_0"
			:set_table_height="false"
			slice_models>
				<template v-slot:buttons="props">
					<buttons :model="props.model"></buttons>
				</template>
			</display>
		</div>
	</b-modal>

</template>
<script>
import Display from '@/common-vue/components/display/Index'
import Buttons from '@/components/listado/components/Buttons'
import article_stock_info from '@/mixins/article_stock_info'
export default {
	mixins: [article_stock_info],
	components: {
		Display,
		Buttons,
	},
}
</script>
