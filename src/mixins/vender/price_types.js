import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
	methods: {
		setPriceType() {
            if (this.price_types_with_position.length
                && !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')) {
                let price_type_para_vender 

                if (this.budget 
                	&& this.budget.price_type) {
                	price_type_para_vender = this.budget.price_type
                
                } else if (this.client && this.client.price_type) {
                    price_type_para_vender = this.client.price_type
                } else {
                    let last_position = 0
                    this.price_types_with_position.forEach(price_type => {
                        if (price_type.position > last_position) {
                            price_type_para_vender = price_type
                            last_position = price_type.position
                        }
                    })
                }
                this.$store.commit('vender/setPriceType', price_type_para_vender)
            }

		},
	}
}