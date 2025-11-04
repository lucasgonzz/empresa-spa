<template>
	<b-modal
	title="Articulos en acopio"
	hide-footer
	size="lg"
	id="unidades-entregadas">

		<b-button
		variant="primary"
		class="m-b-15"
		v-b-modal="'acopio-article-deliveries'">
			Historial
		</b-button>

		<b-table
		head-variant="dark"
		:fields="fields"
		:items="local_items">
			<template #cell(add_delivered_amount)="data">
				<b-form-input
				type="number"
				placeholder="unidades a entregar"
				v-model="local_items[data.index].add_delivered_amount"></b-form-input>
			</template>
		</b-table>

		<b-button
		variant="outline-primary"
		@click="marcar_todo_como_entregado">
			Marcaro todo como entregado
		</b-button>

		<b-button
		class="m-l-15"
		variant="primary"
		@click="save">
			Guardar
		</b-button>
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
					key: 'bar_code',
					label: 'Codigo barras'
				},
				{
					key: 'provider_code',
					label: 'Codigo proveedor'
				},
				{
					key: 'name',
					label: 'Nombre'
				},
				{
					key: 'amount',
					label: 'U vendidas'
				},
				{
					key: 'delivered_amount',
					label: 'U Entregadas'
				},
				{
					key: 'add_delivered_amount',
					label: 'Agregar U Entregadas'
				},
			]
		},
		sale() {
			return this.$store.state.sale.model
		},
	},
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'unidades-entregadas') {
            	this.set_local_items()
            }
        })
    },
	data() {
		return {
			local_items: [],
		}
	},

	methods: {
		set_local_items() {
			let items = []

			this.sale.articles.forEach(article => {
				items.push({
					id: article.id,
					bar_code: article.bar_code,
					provider_code: article.provider_code,
					name: article.name,
					amount: Number(article.pivot.amount),
					delivered_amount: Number(article.pivot.delivered_amount),
					add_delivered_amount: '',
				})
			})

			this.local_items = items
		},
		marcar_todo_como_entregado() {
			this.local_items.forEach((item, index) => {
				let add_delivered_amount = item.amount
				if (item.delivered_amount) {
					add_delivered_amount -= item.delivered_amount 
				}
				this.$set(this.local_items, index, {
					...item,
					add_delivered_amount: add_delivered_amount
				});
			});
			console.log('listo')
		},
		save() {
			this.$store.commit('auth/setMessage', 'Guardando')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('sale/unidades-entregadas/'+this.sale.id, {
				articles: this.local_items 
			})
			.then(res => {
				this.$store.commit('sale/add', res.data.model)
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Actualizado')
				this.$bvModal.hide('unidades-entregadas')
				this.$bvModal.hide('sale')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error(err)
			})
		}
	}
}
</script>