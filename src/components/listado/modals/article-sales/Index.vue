<template>
<b-modal
scrollable
id="article-sales"
:title="'Ventas de '+model.name"
size="lg"
hide-footer>

    <model-component
    :show_btn_save="false"
    :show_btn_delete="false"
    :show_btn_remove_belongs_to_many="false"
    model_name="sale">
        <template v-slot:model_modal_header="props">
            <sale-details></sale-details>
        </template>
    </model-component>  

	<nav-component
	@getSales="getSales"></nav-component>

	<div
	v-if="results || loading">
		<div
		v-if="!loading">
			<div
			v-if="results.length">

				<extra-information
				:results="results"></extra-information>

				<table-component
				model_name="sale"
				:models="results">
					<template #table_right_options="data">
						<span class="p-l-15">
							Cantidad: {{ getArticleAmountInSale(data.model, model) }}
						</span>
					</template>
				</table-component>
			</div>
			<p
			v-else
			class="text-with-icon">
				<i class="icon-chart"></i>
				No hay ventas de {{ model.name }}. Pruebe ampliando el rango de fechas.
			</p>	
		</div>
		<div
		class="all-center-md"
		v-else>
		    <b-spinner 
		    variant="primary"></b-spinner>
		</div>
	</div>
	<p
	class="text-with-icon"
	v-else>
		<i class="icon-exclamation"></i>
		Seleccione el rango de fechas y precione BUSCAR
	</p>

</b-modal>
</template>
<script>
import article_sales from '@/mixins/article_sales'
export default {
	mixins: [article_sales],
	components: {
		ModelComponent: () => import('@/common-vue/components/model/Index'),
		NavComponent: () => import('@/components/listado/modals/article-sales/Nav'),
		ExtraInformation: () => import('@/components/listado/modals/article-sales/ExtraInformation'),
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
        SaleDetails: () => import('@/components/ventas/modals/details/Index'),
	},
	computed: {
		model() {
			return this.$store.state.article.model 
		},
	},
	data() {
		return {
			results: null,
			loading: false,
		}
	},
	mounted() {
		this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
			this.results = null
		})
	},
	methods: {
		getSales(dates) {
			this.loading = true
			this.$api.get('article/sales/'+this.model.id+'/'+dates.from_date+'/'+dates.until_date)
			.then(res => {
				this.loading = false 
				this.results = res.data.result
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error('Error al cargar ventas')
				console.log(err)
			})
		},
	}
}
</script>
<style lang="sass">
.total-unidades-vendidas-number
	margin-top: 60px
	font-size: 200px
	line-height: 200px
	text-align: center
	margin-bottom: 0
	font-weight: 100
.total-unidades-vendidas-text
	margin-bottom: 60px
	font-size: 30px
	text-align: center
</style>