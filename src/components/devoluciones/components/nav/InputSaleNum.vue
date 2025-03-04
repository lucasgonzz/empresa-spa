<template>
	<b-input-group
	prepend="N° venta">
		<b-form-input
		id="sale-num"
		:disabled="venta_seleccionada"
		placeholder="N° de Venta"
		@keyup.enter="search_sale"
		v-model="num_sale"></b-form-input>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		num_sale: {
			get() {
				return this.$store.state.devoluciones.num_sale
			},
			set(value) {
				this.$store.commit('devoluciones/set_num_sale', value)
			}
		},
		venta_seleccionada() {
			if (this.sale) {
				return true 
			}
			return false
		},
		sale() {
			return this.$store.state.devoluciones.sale
		}
	},
	methods: {
		search_sale() {

			this.$store.dispatch('devoluciones/search_sale')
			.then(() => {
				if (!this.sale) {
					this.$toast.error('No se encontro venta')
				}
			})

			// this.$store.commit('auth/setMessage', 'Buscando venta')
			// this.$store.commit('auth/setLoading', true)
				
			// commit('sale/add', sale, {root: true})

			// this.$api.get('devoluciones/search-sale/'+this.num_sale)
			// .then(res => {
				
			// 	this.$store.commit('auth/setLoading', false)

			// 	let sale = res.data.sale  

			// 	if (sale) {

			// 		this.$store.commit('devoluciones/set_sale', sale)

			// 		if (sale.client) {

			// 			this.$store.commit('devoluciones/set_client', sale.client)
			// 		}

			// 		this.set_articles(sale)
			// 		// this.set_services(sale)
			// 	} else {

			// 		this.$store.commit('devoluciones/set_sale', null)
			// 		this.$toast.error('No se encontro venta')
			// 	}
			// })
			// .catch(err => {
			// 	this.$store.commit('auth/setLoading', false)
			// 	this.$toast.error('Error al buscar venta')
			// })
		},
		// set_articles(sale) {

		// 	let articles = []

		// 	sale.articles.forEach(article => {
		// 		articles.push({
		// 			...article,
		// 			is_article: true,
		// 			price_vender: article.pivot.price,
		// 			amount: article.pivot.amount,
		// 			discount: article.pivot.discount,
		// 			returned_amount: article.pivot.returned_amount,
		// 			ya_devueltas: article.pivot.returned_amount,
		// 		})
		// 	})

		// 	this.$store.commit('devoluciones/set_articles', articles)
		// }
	}
}
</script>