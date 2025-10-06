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
        owner_extencions() {
            if (this.is_owner) {
                return this.user.extencions 
            } else {
                return this.user.owner_extencions 
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

        set_expense_caja_id(prop_payment_method, model) {

            let payment_method_id = model[prop_payment_method.key]

            let caja_id = this.get_caja_por_defecto(payment_method_id)

            let _model = this.$store.state.expense.model

            console.log('model:')
            console.log(_model)

            if (caja_id) {
                this.$store.state.expense.model.caja_id = caja_id
            }
        },

        get_caja_por_defecto(payment_method_id, address_id = null) {

            if (!address_id) {
                address_id = this.$cookies.get('address_id')
            }

            // Obtén la caja por defecto
            let caja_default = this.$store.state.default_payment_method_caja.models.find(caja_default => {
                return caja_default.current_acount_payment_method_id == payment_method_id 
                    && caja_default.address_id == address_id
            })

            // Si existe una caja por defecto, ordénala primero
            if (caja_default) {

                return caja_default.caja_id 
            }
        },

        get_caja_options(payment_method_id = null) {

            // if (!payment_method_id) {
            //     payment_method_id = this.$store.state.expense.model.current_acount_payment_method_id
            // }

            let options = [{
                value: 0,
                text: 'Seleccione caja'
            }]

            let cajas_abiertas = this.$store.state.caja.models.filter(caja => caja.abierta)

            cajas_abiertas.forEach(caja => {

                options.push({
                    value: caja.id,
                    text: caja.name,
                })
            })

            return options
        },

        get_cajas_abiertas_options() {
             let cajas_abiertas = this.$store.state.caja.models.filter(caja => caja.abierta)

             let options = []
             options.push({
                 value: 0,
                 text: 'Seleccione Caja'
             })

             cajas_abiertas.forEach(caja => {
                 options.push({
                     value: caja.id,
                     text: caja.name
                 })
             })

             return options
        },
        get_store_model(model_name, model_id) {
            let model = this.$store.state[model_name].models.find(_model => {
                return _model.id == model_id
            })
            if (typeof model != 'undefined') {
                return model 
            }
            return null
        },
        venta_cobrada(sale) {
            if (!sale.client_id) {
                return true
            }
            if (sale.omitir_en_cuenta_corriente) {
                return true 
            }
            if (sale.current_acount) {
                if (sale.current_acount.status == 'pagado') {
                    return true 
                }
            } 
            return false
        },
        get_perfil_usuario(id) {
            if (id == this.owner_id) {
                return this.owner 
            }
            return this.$store.state.employee.models.find(employee => employee.id == id)
        },
        hasExtencion(slug, check_has_one_extencion_permission = true) {
            if (
                this.authenticated 
                && this.owner_extencions
            ) {
                let index = this.owner_extencions.findIndex(extencion => {
                    return extencion.slug == slug
                })
                return index != -1 
            }
        },
        getPriceVender(item, from_pivot = false) {
            console.log('getPriceVender para '+item.name)
            // console.log(item)

            let price 

            if (item.price_vender_personalizado) {

                price = item.price_vender_personalizado

            } else if (
                /*
                    Si es golonorte, no se usa el precio del articulo al momento de crear la venta.
                    Se omite este if y se aplica el precio actual de la lista de precio seleccionada
                */
                from_pivot 
                && item.pivot 
                && item.pivot.price
                && !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
                // && (
                //     !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
                //     || !item.price_type_personalizado_id
                // )
            ) {

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

                price = this.aplicar_tipos_de_precio(item, price)

                price = this.apicar_descuento_metodo_de_pago(item, price)

                price = this.redondear(price)
            }

            
            price = Number(price)

            console.log('antes de llamar a check_moneda')
            price = this.check_moneda(item, price, from_pivot)
            console.log('luego de llamar a check_moneda')

            return price
        },
        check_moneda(item, price, from_pivot) {

            if (
                typeof item.price_type_monedas == 'undefined'
                || !item.price_type_monedas.length
            ) {

                if (typeof item.pivot == 'undefined') {

                    if (this.$store.state.vender.moneda_id == 2) {
                        // La venta es en dolares


                        if (!item.cost_in_dollars) {
                            price = this.cotizar_a_dolar(price)
                            console.log('luego de cotizar_a_dolar: ')
                            console.log(price)
                        } else {
                            if (this.owner.cotizar_precios_en_dolares) {
                                price = this.cotizar_a_dolar(price)
                                console.log('luego de cotizar_a_dolar: ')
                                console.log(price)
                            } else {
                                console.log('no se cotizo a dolar')
                            }
                        } 

                    } else if (this.$store.state.vender.moneda_id == 1) {

                        // La venta es en pesos
                        
                        if (
                            item.cost_in_dollars
                            && !this.owner.cotizar_precios_en_dolares
                        ) {
                            price = this.cotizar_a_peso(price)
                            console.log('luego de cotizar_a_peso: ')
                            console.log(price)
                        } else {
                            console.log('no se cotizo a peso')
                        }

                    }
                } else {
                    console.log('no entro porque tiene pivot')
                }
            }
            
            return price
        },
        cotizar_a_peso(price) {
            console.log('cotizar_a_peso: ')
            console.log(price)
            return price = Number(price) * Number(this.$store.state.vender.valor_dolar) 
        },
        cotizar_a_dolar(price) {
            console.log('cotizar_a_dolar:')
            console.log(price)
            return price = Number(price) / Number(this.$store.state.vender.valor_dolar) 
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
        aplicar_tipos_de_precio(item, price) {

            if (item.is_article) {

                let price_vender_id = null

                if (this.hasExtencion('cambiar_price_type_en_vender')) {

                    if (this.price_type_vender) {
                        console.log('usando price_type_vender id: '+this.price_type_vender.id)
                        price_vender_id = this.price_type_vender.id 
                    }

                }

                if (this.hasExtencion('cambiar_price_type_en_vender_item_por_item')) {

                    if (item.price_type_personalizado_id) {

                        price_vender_id = item.price_type_personalizado_id
                    }
                }

                if (price_vender_id) {

                    if (this.hasExtencion('ventas_en_dolares')) {

                        let moneda_id = this.$store.state.vender.moneda_id

                        let article_price_type_moneda = item.price_type_monedas.find(ptm => {
                            return ptm.price_type_id == price_vender_id && ptm.moneda_id == moneda_id
                        })

                        if (typeof article_price_type_moneda != 'undefined') {
                            console.log('usando price_type_moneda moneda_id: '+article_price_type_moneda.moneda_id+', price_type_id: '+article_price_type_moneda.price_type_id)
                            console.log(article_price_type_moneda.final_price)
                            price = article_price_type_moneda.final_price
                        } else {
                            console.log(`No se encontró price_type_moneda para artículo ${item.name}, PT: ${price_vender_id}, Moneda: ${moneda_id}`)
                        }

                    } else {

                        let article_price_type = item.price_types.find(price_type => {
                            return price_type.id == price_vender_id 
                        })

                        if (typeof article_price_type != 'undefined') {

                            price = article_price_type.pivot.final_price
                        } else {
                            console.log('No se encontro price type para '+item.name)
                        }
                    }
                        
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