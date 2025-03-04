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
            let env_var = process.env.VUE_APP_DOWNLOAD_ARTICLES
            if (typeof env_var != 'undefined') {
                if (env_var === 'true') {
                    return true
                }
                return false
            }
            return this.owner.download_articles
        },
    },
    methods: {
        get_perfil_usuario(id) {
            if (id == this.owner_id) {
                return this.owner 
            }
            return this.$store.state.employee.models.find(employee => employee.id == id)
        },
        hasExtencion(slug, check_has_one_extencion_permission = true) {
            if (
                this.authenticated 
                && this.owner
                && this.owner.extencions
            ) {
                let index = this.owner.extencions.findIndex(extencion => {
                    return extencion.slug == slug
                })
                return index != -1 
            }
        },
        getPriceVender(item, from_pivot = false) {
            console.log('getPriceVender para '+item.name)

            let price 

            if (item.price_vender_personalizado) {

                price = item.price_vender_personalizado

            } else if (from_pivot && item.pivot && item.pivot.price) {

                price = item.pivot.price 
            
            } else if (this.hasExtencion('articulos_precios_en_blanco') && item.is_article) {

                let afip_information_id = this.$store.state.vender.afip_information_id

                if (afip_information_id) {

                    // console.log('usando precio en blanco')
                    price = item.final_price_blanco
                    
                } else {

                    price = item.final_price
                }

            } else {

                price = item.final_price

                price = this.apicar_tipos_de_precio(item, price)

                price = this.apicar_descuento_metodo_de_pago(item, price)

                price = this.redondear(price)
            }
            price = Number(price)
            // console.log(this.price(price))
            return price
        },
        redondear(price) {
            if (this.owner.redondear_centenas_en_vender) {
                price = this.redondear_centenas(price)
            }
            return price
        },
        redondear_centenas(num) {
            return Math.ceil(num / 100) * 100;
        },
        apicar_tipos_de_precio(item, price) {

            // console.log('apicar_tipos_de_precio:')
                
            if (this.hasExtencion('cambiar_price_type_en_vender')) {

                let price_vender_id

                if (this.price_type_vender) {
                    price_vender_id = this.price_type_vender.id 
                }

                if (item.price_type_personalizado_id) {

                    // console.log('price_vender_personalizado: '+item.price_type_personalizado_id)

                    price_vender_id = item.price_type_personalizado_id
                }

                // console.log('is_article: '+item.is_article)
                // console.log('item.price_types: ')
                // console.log(item.price_types)

                if (item.is_article) {
                    
                    let article_price_type = item.price_types.find(price_type => {
                        return price_type.id == price_vender_id 
                    })

                    if (typeof article_price_type != 'undefined') {

                        // console.log('usando precio de la lista de precios personalizada: '+article_price_type.pivot.final_price)
                        price = article_price_type.pivot.final_price
                    }
                }


            } else {

                if (this.price_types_with_position.length && this.checkService(item)) {
                   
                    this.price_types_with_position.forEach(price_type => {
                        if (price_type.position <= this.price_type_vender.position) {
                            price = Number(price) + Number(price * this.getPriceTypePercetage(price_type, item) / 100) 
                        }
                    })
                }
            }

            return price
        },
        apicar_descuento_metodo_de_pago(item, price) {
            if (this.current_acount_payment_method_discounts.length 
                && this.current_acount_payment_method_id) {

                // console.log('apicar_descuento_metodo_de_pago')
                price = this.aplicar_monto_descuento(price, this.current_acount_payment_method_id)
            }
            return price
        },
        getPriceTypePercetage(price_type, item) {
            let sub_category_from_price_type = price_type.sub_categories.find(_sub_category => {
                return _sub_category.id == item.sub_category_id 
            })
            if (typeof sub_category_from_price_type != 'undefined') {
                // console.log('Se va a sumar el '+sub_category_from_price_type.pivot.percentage+'% de '+sub_category_from_price_type.name+' '+price_type.name)
                // console.log(Number(sub_category_from_price_type.pivot.percentage))
                return Number(sub_category_from_price_type.pivot.percentage)
            }
            // console.log('No hay porcentaje para '+price_type.name+' y la sub_category del articulo, sumando el '+price_type.percentage)
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