export default {
	computed: {
        price_types() {
            return this.$store.state.price_type.models
        },
        price_types_with_position() {
            return this.price_types.filter(model => model.position != null)
        },
        price_type_vender() {
            return this.$store.state.vender.price_type
        },
	},
	methods: {
        setPriceType(item, price) {
            if (this.price_types_with_position.length && this.checkService(item)) {
                let limit 
                if (this.price_type_vender) {
                    limit = this.price_type_vender
                    console.log('position limit de vender: '+limit.position)
                } else {
                    let last_position = 0
                    this.price_types_with_position.forEach(price_type => {
                        if (price_type.position > last_position) {
                            limit = price_type
                            last_position = price_type.position
                        }
                    })
                }
                this.price_types_with_position.forEach(price_type => {
                    if (price_type.position <= limit.position) {
                        price = Number(price) + Number(price * price_type.percentage / 100) 
                    }
                })
            }
            return price
        },
        checkService(item) {
            if (item.is_service) {
                return this.user_configuration.apply_price_type_in_services
            }
            return true
        },
	}
}