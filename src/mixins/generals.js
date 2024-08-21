import moment from 'moment'
export default {
    computed: {
        has_online() {
            return this.can('order.index') 
        },
        user_configuration() {
            if (this.is_owner) {
                return this.user.configuration 
            } else {
                return this.user.owner_configuration 
            }
        },
        today() {
            return moment().format('YYYY-MM-DD')
        },
        current_acount_payment_method_discounts() {
            return this.$store.state.current_acount_payment_method_discount.models
        },
        current_acount_payment_method_id: {
            get() {
                return this.$store.state.vender.current_acount_payment_method_id
            }, 
            set(value) {
                this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
            },
        },
        price_types() {
            return this.$store.state.price_type.models
        },
        price_types_with_position() {
            return this.price_types.filter(model => model.position != null)
        },
        price_type_vender() {
            return this.$store.state.vender.price_type
        },
        download_articles() {  
            return this.owner.download_articles
        },
    },
    methods: {
        hasExtencion(slug, check_has_one_extencion_permission = true) {
            if (this.authenticated) {
                let index = this.owner.extencions.findIndex(extencion => {
                    return extencion.slug == slug
                })
                return index != -1 
            }
        },
        getPriceVender(item, from_pivot = false) {
            console.log('getPriceVender')
            let price 
            if (from_pivot) {
                price = item.pivot.price 
                console.log('from_pivot: '+price)
            } else {
                console.log('va a llamar a apicar_tipos_de_precio')
                price = item.final_price

                // price = this.redondear(item, price)
                price = this.apicar_tipos_de_precio(item, price)
                price = this.apicar_descuento_metodo_de_pago(item, price)

                price = this.redondear(price)
            }
            console.log('return price: '+price)
            return price
        },
        redondear(price) {
            console.log('redondear: '+this.price(price))
            if (this.owner.redondear_centenas_en_vender) {
                price = this.redondear_centenas(price)
                console.log('quedo en '+this.price(price))
            }
            return price
        },
        redondear_centenas(num) {
            return Math.ceil(num / 100) * 100;
        },
        apicar_tipos_de_precio(item, price) {
            console.log('apicar_tipos_de_precio')
            console.log('price:')
            console.log(price)

            console.log('price_types_with_position:')
            console.log(this.price_types_with_position)
            if (this.price_types_with_position.length && this.checkService(item)) {
               
                console.log('price_type_vender:')
                console.log(this.price_type_vender)
                this.price_types_with_position.forEach(price_type => {
                    if (price_type.position <= this.price_type_vender.position) {
                        price = Number(price) + Number(price * this.getPriceTypePercetage(price_type, item) / 100) 
                    }
                })
            }
            return price
        },
        apicar_descuento_metodo_de_pago(item, price) {
            if (this.current_acount_payment_method_discounts.length 
                && this.current_acount_payment_method_id) {

                console.log('apicar_descuento_metodo_de_pago')
                price = this.aplicar_monto_descuento(price, this.current_acount_payment_method_id)
            }
            return price
        },
        getPriceTypePercetage(price_type, item) {
            let sub_category_from_price_type = price_type.sub_categories.find(_sub_category => {
                return _sub_category.id == item.sub_category_id 
            })
            if (typeof sub_category_from_price_type != 'undefined') {
                console.log('Se va a sumar el '+sub_category_from_price_type.pivot.percentage+'% de '+sub_category_from_price_type.name+' '+price_type.name)
                console.log(Number(sub_category_from_price_type.pivot.percentage))
                return Number(sub_category_from_price_type.pivot.percentage)
            }
            console.log('No hay porcentaje para '+price_type.name+' y la sub_category del articulo, sumando el '+price_type.percentage)
            return Number(price_type.percentage)
        },
        checkService(item) {
            if (item.is_service) {
                return this.user_configuration.apply_price_type_in_services
            }
            return true
        },
        hasRole(role) {
            let has_role = false
            this.user.roles.forEach(rol => {
                if (rol.name == role) {
                    has_role = true
                }
            })
            return has_role
        },
        articleCost(article, from_pivot = false) {
            if (this.can('articles.cost') && article.cost) {
                let cost
                if (from_pivot) {
                    cost = article.pivot.cost
                } else {
                    cost = article.cost
                }
                if (this.user.with_dolar) {
                    return this.price(cost)+' / '+this.price(cost * this.dolar_blue)
                }
                return this.price(cost)
            }
            return '-'
        },
        articlePrice(article, from_pivot = false, formated = true, in_dolars = false) {
            let price
            if (from_pivot) {
                price = article.pivot.price
            } else {
                price = article.price
            }
            if (!from_pivot && !in_dolars && article.with_dolar) {
                price = price * this.dolar_blue
            }
            if (from_pivot && !in_dolars && article.pivot.with_dolar) {
                price = price * article.pivot.with_dolar
            }
            if (formated) {
                return this.price(price)
            }
            return price
        },
        getBarCode(bar_code) {
            return bar_code.replace(/\s+/g, '')
        },
        amount(amount) {
            let punto_index = amount.indexOf('.')
            if (amount.substr(punto_index) == '.00') {
                return amount.substr(0, punto_index)
            }
            return amount
        },
        stock(article, formated = true) {
            if (article.variants && article.variants.length) {
                let stock = 0
                article.variants.forEach(variant => {
                    stock += variant.stock
                })
                return stock
            }
            if (article.stock) {
                return article.stock
            }
            if (formated) {
                return '-'
            } else {
                return null
            }
        },
        brand(article) {
            if (article.brand) {
                return article.brand.name
            }
            return '-'
        },
    }
}