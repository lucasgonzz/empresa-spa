import set_items_prices from '@/mixins/vender/set_items_prices'
export default {
	mixins: [set_items_prices],
	computed: {
		vender_items() {
			return this.$store.state.vender.items 
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id 
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id 
		},
		discounts_in_services: {
			get() {
				return this.$store.state.vender.discounts_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setDiscountsInServices', value)
				this.setTotal()
			},
		},
		budget() {
			return this.$store.state.vender.budget 
		},
		surchages_in_services: {
			get() {
				return this.$store.state.vender.surchages_in_services
			}, 
			set(value) {
				this.$store.commit('vender/setSurchagesInServices', value)
				this.setTotal()
			},
		},
		discounts_store() {
			return this.$store.state.discount.models 
		},
		surchages_store() {
			return this.$store.state.surchage.models 
		},
		from_pivot() {
			return this.index_previus_sales != 0 || this.budget
		},
		cuota_descuento() {
			return this.$store.state.vender.cuota_descuento 
		},
		cuota_recargo() {
			return this.$store.state.vender.cuota_recargo 
		},
		monto_credito() {
			return this.$store.state.vender.monto_credito 
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods 
		},
		descuento() {
			return this.$store.state.vender.descuento 
		},
	},
	data() {
		return {
			total_articles: 0,
			total_services: 0,
			total_combos: 0,
			total_promocion_vinoteca: 0,
		}
	},
	methods: {
		setTotal(total = null) {

			let sub_total = 0  

			if (!total) {

				total = 0
				
				this.total_articles = 0
				this.total_services = 0
				this.total_combos = 0
				this.total_promocion_vinoteca = 0
				
				let new_items = []

				this.setItemsPrices(false, this.from_pivot)

				this.vender_items.forEach(item => {
					if (item.is_service) {

						this.total_services += this.getTotalItem(item, false)

					} else if (item.is_article) {

						// console.log(this.getTotalItem(item, false))

						this.total_articles += this.getTotalItem(item, false)

					} else if (item.is_combo) {

						this.total_combos += this.getTotalItem(item, false)

					} else if (item.is_promocion_vinoteca) {

						this.total_promocion_vinoteca += this.getTotalItem(item, false)

					}
					// total += this.getTotalItem(item, false)
					new_items.push(item)
				})

				this.aplicar_descuento()

				this.aplicar_discounts()

				this.aplicar_surchages()

				this.$store.commit('vender/setItems', new_items)
				
				sub_total = this.total_articles + this.total_services + this.total_combos + this.total_promocion_vinoteca
				total = this.total_articles + this.total_services + this.total_combos + this.total_promocion_vinoteca

				total = this.aplicar_current_acount_payment_method_discounts(sub_total)

				this.set_monto_credito(total)

				total = this.aplicar_cuotas(total)
				
			}
			this.$store.commit('vender/setSubTotal', sub_total)
			this.$store.commit('vender/setTotal', total)
			
			// console.log('se puso el sub_total en '+sub_total)
			// console.log('se puso el total en '+total)
		},
		aplicar_cuotas(total) { 


			if (this.monto_credito) {

				/* 
					monto_credito_real: 
						Hace referencia al monto de credito con
							el descuento
							o el recargo
						Aplicados
				*/

				let monto_credito_real = null

				if (this.cuota_descuento) {

					let monto_descuento = this.monto_credito * Number(this.cuota_descuento) / 100

					monto_credito_real = this.monto_credito - monto_descuento

					this.$store.commit('vender/set_cuota_monto_descuento', monto_descuento)

					total -= monto_descuento
				
				} else if (this.cuota_recargo) {

					let monto_recargo = this.monto_credito * Number(this.cuota_recargo) / 100

					monto_credito_real = this.monto_credito + monto_recargo
				
					this.$store.commit('vender/set_cuota_monto_recargo', monto_recargo)

					total += monto_recargo
				}

				this.$store.commit('vender/set_monto_credito_real', monto_credito_real)
			}

			return total
		},
		set_monto_credito(total) {

			let monto_credito = null

			if (this.vender_current_acount_payment_method_id) {

				if (this.vender_current_acount_payment_method_id == 5) {

					monto_credito = total  
				}

			} else if (this.selected_payment_methods.length) {

				let credito = this.selected_payment_methods.find(payment_method => payment_method.id == 5)

				if (typeof credito != 'undefined') {

					monto_credito = credito.amount 
				}

			} 

			// console.log('set_monto_credito:')
			// console.log(monto_credito)

			this.$store.commit('vender/set_monto_credito', monto_credito)

		},
		aplicar_descuento() {
			if (this.descuento) {

				this.total_articles -= this.total_articles * Number(this.descuento) / 100 
				
				// if (this.discounts_in_services) {
				// 	this.total_services -= this.total_services * Number(discount.percentage) / 100 
				// }
			}
		},
		aplicar_discounts() {
			if (this.discounts_id.length) {

				let discounts_store_ = this.discounts_store 

				let sale_discounts = []

				this.discounts_id.forEach(discount_id => {

					let discount_to_add = discounts_store_.find(_discount => _discount.id == discount_id)

					sale_discounts.push(discount_to_add)

				}) 

				sale_discounts.forEach(discount => {
					this.total_articles -= this.total_articles * Number(discount.percentage) / 100 
					this.total_combos -= this.total_combos * Number(discount.percentage) / 100 
					this.total_promocion_vinoteca -= this.total_promocion_vinoteca * Number(discount.percentage) / 100 
					if (this.discounts_in_services) {
						this.total_services -= this.total_services * Number(discount.percentage) / 100 
					}
				})
			}

		},
		aplicar_surchages() {
			if (this.surchages_id.length) {
				let surchages = this.surchages_store 
				
				let sale_surchages = []
				
				this.surchages_id.forEach(id => {
					sale_surchages.push(surchages.find(item => item.id == id))
				}) 

				sale_surchages.forEach(_surchage => {
					this.total_articles += this.total_articles * Number(_surchage.percentage) / 100 
					this.total_combos += this.total_combos * Number(_surchage.percentage) / 100 
					this.total_promocion_vinoteca += this.total_promocion_vinoteca * Number(_surchage.percentage) / 100 
					if (this.surchages_in_services) {
						this.total_services += this.total_services * Number(_surchage.percentage) / 100 
					}
				})
			}
		}
	}
}