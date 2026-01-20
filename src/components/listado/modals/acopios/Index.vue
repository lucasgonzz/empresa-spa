<template>
<b-modal
:title="'Acopios de '+article.name"
hide-footer
size="lg"
id="article-acopios">
	<div
	v-if="!loading">
		<b-table
		v-if="items.length"
		head-variant="dark"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		:fields="fields"
		:items="items">
				
			<template #cell(sale)="data">
				<b-button
				@click="show_sale(sales[data.index])">
					Venta N° {{ sales[data.index].num }}
				</b-button>
			</template>
				
			<template #cell(client)="data">
				<client-btn
				:sale="sales[data.index]"></client-btn>
			</template>

		</b-table>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay acopios de este articulo
		</p>
	</div>
	<b-skeleton-table
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	v-else
	:rows="5" 
	:columns="4"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	components: {
		ClientBtn: () => import('@/components/ventas/components/ClientBtn'),
	},
	data() {
		return {
			loading: false,
			sales: [],
		}
	},
	mounted() {
		this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
			if (modalId == 'article-acopios') {
				this.get_acopios()
			}
		})
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		fields() {
			return [
				{
					key: 'sale',
					label: 'Venta'
				},
				{
					key: 'client',
					label: 'Cliente'
				},
				{
					key: 'amount',
					label: 'Cantidad'
				},
				{
					key: 'created_at',
					label: 'Fecha'
				},
			]
		},
		items() {
			let items = []
			if (this.article) {
				this.sales.forEach(acopio => {
					items.push({
						acopio: acopio.name,
						provider_code: acopio.pivot.provider_code,
						amount: acopio.pivot.amount,
						cost: this.price(acopio.pivot.cost),
						price: this.price(acopio.pivot.price),
						updated_at: this.date(acopio.pivot.updated_at, true),
					})
				})
			}
			return items 
		}
	},
	methods: {
		get_acopios() {
			this.loading = true
			this.$api.get('article-acopios/'+this.article.id)
			.then(res => {
				this.sales = res.data.sales 
				this.loading = false
			})
			.catch(err => {
				this.loading = false
			})
		},
		show_sale(sale) {
            this.show_model('sale', sale.id)
		}
	}
}
</script>