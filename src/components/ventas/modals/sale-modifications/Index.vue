<template>
<div>
	
	<articles-info
	:sale_modification="sale_modification"></articles-info>

	<b-modal
	hide-footer
	size="lg"
	:title="title"
	id="sale-modifications">
		<b-table
		v-if="!loading"
		head-variant="dark"
		responsive
		:fields="fields"
		:items="items">
			<template #cell(detalles)="data">
				<b-button
				variant="primary"
				@click="setSale(sale_modifications[data.index])">
					Ver
				</b-button>
			</template>
		</b-table>
		<div 
		v-else
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		ArticlesInfo: () => import('@/components/ventas/modals/sale-modifications/ArticlesInfo'),
	},
	data() {
		return {
			sale_modifications: [],
			sale_modification: null,
			loading: false,
		}
	},
	computed: {
		title() {
			if (this.sale.id) {
				return 'Modificaciones Venta N° '+this.sale.num
			}
			return ''
		},
		fields() {
			return [
				{
					key: 'usuario',
				},
				{
					label: 'Articulos antes de actualizar',
					key: 'articulos_antes_de_actualizar',
				},
				{
					label: 'Articulos despues de actualizar',
					key: 'articulos_despues_de_actualizar',
				},
				{
					label: 'Estado antes de actualizar',
					key: 'estado_antes_de_actualizar',
				},
				{
					label: 'Estado despues de  actualizar',
					key: 'estado_despues_de_actualizar',
				},
				{
					key: 'fecha',
				},
				{
					key: 'detalles',
				},
			]
		},
		items() {
			let items = []
			this.sale_modifications.forEach(sale_modification => {
				items.push({

					usuario : sale_modification.user.name,
					
					articulos_antes_de_actualizar : sale_modification.articulos_antes_de_actualizar.length,
					
					articulos_despues_de_actualizar : sale_modification.articulos_despues_de_actualizar.length,
					
					estado_antes_de_actualizar : sale_modification.estado_antes_de_actualizar,
					
					estado_despues_de_actualizar : sale_modification.estado_despues_de_actualizar,
					
					fecha : this.date(sale_modification.created_at, true)
				
				})
			})
			return items
		},
		sale() {
			return this.$store.state.sale.model 
		},
	},
	mounted() {
	    this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
	        if (modalId === 'sale-modifications') {
	            if (!this.loading) {
	                this.getSaleModifications()
	            }
	        }
	    })
	},
	beforeDestroy() {
	    // Desregistrar el evento al destruir el componente
	    this.$root.$off('bv::modal::show')
	},
	methods: {
		getSaleModifications() {
			console.log('llamando getSaleModifications para la venta N° '+this.sale.num)
			this.loading = true
			this.$api.get('sale-modifications/'+this.sale.id)
			.then(res => {
				this.loading = false
				console.log(res.data.models)
				this.sale_modifications = res.data.models 
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		setSale(sale_modification) {
			this.sale_modification = sale_modification
			console.log('selected sale_modification:')
			console.log(this.sale_modification)
			this.$bvModal.show('sale-modification-articles-info')
		},
	},
}
</script>