<template>
	<b-modal
	title="Historial de Entregas"
	hide-footer
	size="lg"
	id="acopio-article-deliveries">
		<b-table
		head-variant="dark"
		:fields="fields"
		:items="items">
			<template #cell(print)="data">
				<b-button
				@click="print(models[data.index])"
				variant="danger">
					<i class="icon-print"></i>
				</b-button>
			</template>
		</b-table>
	</b-modal>
</template>
<script>
export default {
	components: {
		// TableComponent: () => import('@/common-vue/components/display/TableComponent'),
	},
	computed: {
		fields() {
			return [
				{
					key: 'id',
					label: 'N°'
				},
				{
					key: 'created_at',
					label: 'Fecha'
				},
				{
					key: 'print',
					label: 'Imprimir'
				},
			]
		},
		sale() {
			return this.$store.state.sale.model
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					id: model.id,
					created_at: this.date(model.created_at, true),
				})
			})
			return items
		}
	},
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'acopio-article-deliveries') {
            	this.set_models()
            }
        })
    },
	data() {
		return {
			models: [],
		}
	},

	methods: {
		set_models() {

			console.log('set_models')

			this.$store.commit('auth/setLoading', true)

			this.$api.get('acopio-article-delivery/'+this.sale.id)
			.then(res => {
				this.models = res.data.models 
				this.$store.commit('auth/setLoading', false)
			})
			.catch(err => {
				this.$toast.error(err)
				this.$store.commit('auth/setLoading', false)
			})
		
		},
		print(model) {
			console.log(model)
			let link = process.env.VUE_APP_API_URL+'/acopio-article-delivery/'+model.id
			window.open(link)
		}
	}
}
</script>