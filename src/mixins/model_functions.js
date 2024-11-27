import moment from 'moment'
import dates from '@/common-vue/mixins/dates'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
    mixins: [select_payment_methods],
    computed: {
        cajas() {
            return this.$store.state.caja.models
        },
        cajas_abiertas() {
            return this.cajas.filter(caja => caja.abierta)
        },
    },
	methods: {
        // current_acount_btn_text(current_acount, prop) {
        //     console.log('current_acount_btn_text')
        //     console.log(current_acount)
        //     console.log(prop)
        //     if (current_acount)
        // },
        get_sale_payment_methods(sale, prop) {
            let metodos = ''

            sale.current_acount_payment_methods.forEach(payment_method => {
                metodos += payment_method.name + ' '
            })

            return metodos
        },
        get_hora(model, prop) {
            return this.hour(model.created_at)
        },
        get_address_stock_in_vender(article, prop) {
            if (typeof article != 'undefined' && typeof prop != 'undefined') {

                let address_id = prop.key.substr(8)

                let article_address = article.addresses.find(address => address.id == address_id)

                if (typeof article_address != 'undefined') {

                    return article_address.pivot.amount
                } 
                return null
            }
        },
        get_hora_from_created_at(model) {
            if (model.created_at) {
                return moment(model.created_at).format('h:mm')
            }
        },
        get_variants_for_deposit_movement(prop, article) {
            console.log('get_variants_for_deposit_movement, article:')
            console.log(article)

            let options = [{
                value: 0,
                text: 'Variante'
            }]

            article.article_variants.forEach(variant => {

                options.push({
                    value: variant.id,
                    text: variant.variant_description
                })
            })

            return options
        },
        get_cajas_abiertas_options(prop, model) {

            let options = [{
                value: 0,
                text: 'Seleccione Caja'
            }]

            this.cajas_abiertas.forEach(caja => {

                options.push({
                    value: caja.id,
                    text: caja.name,
                    // text: caja.name+' ('+this.price(caja.saldo)+')',
                })
            })

            return options
        },
        disabled_edit_pending(pending) {
            if (pending.es_recurrente) {
                console.log('no se puede editar el pending '+pending.detalle)
                return true
            }
            console.log('SI se puede editar el pending '+pending.detalle)
            return false
        },

        // Se llama para mostrar el precio en la tabla de resultados en modal vender
        get_price_formateado(article, prop) {

            return this.price(article.final_price)
        },
        
        btn_comision_venta(seller_commission, prop) {

            if (seller_commission.sale) {
                return 'Venta N° '+seller_commission.sale.num
            } else if (seller_commission.sale_id) {
                return 'Ver venta'
            }
            return ''
        },
        get_price_with_discount_in_vender(article, prop) {
            if (typeof article != 'undefined' && typeof prop != 'undefined') {

                let price = article.final_price

                price = this.aplicar_monto_descuento(price, prop.key.substr(15))
                
                return this.price(this.redondear(price))
            }
        },
        cajaGetColor(caja) {
            if (caja.abierta) {

                return 'caja-abierta'
            }
            return 'caja-cerrada'
        },
        pendingGetColor(pending) {
            if (pending.fecha_realizacion) {

                if (this.pending_vencido(pending)) {

                    return 'pending-vencida'
                }

                let dias_restantes_en_amarillo = this.$store.state.pending.dias_restantes_en_amarillo

                if (moment(pending.fecha_realizacion).diff(moment().startOf('day'), 'days') <= dias_restantes_en_amarillo) {

                    return 'pending-amarillo'
                }
            }
        },
        pending_tiempo_restantes(pending) {
            if (pending.fecha_realizacion) {

                console.log('fecha_realizacion de '+pending.detalle+': '+pending.fecha_realizacion)
                if (this.pending_vencido(pending)) {

                    return 'VENCIDO '+this.since(pending.fecha_realizacion)
                } 
                
                return this.until(pending.fecha_realizacion)
            }
            return null
        },
        pending_vencido(pending) {
            return moment(pending.fecha_realizacion).isBefore(moment().startOf('day'))
        },
        show_btn_repartir_stock(prop, article) {
            if (article.id
                && !article.addresses.length 
                && article.stock != null
                && article.stock > 0
                && !article.article_variants.length) {
                return true 
            }
            return false
        },
        saleGetColor(sale) {
            if (this.route_name == 'deposito-para-checkear' && sale.printed) {
                return 'sale-printed'
            }
        },
        search_from_api_in_provider_order() {
            return !this.download_articles
        },
        articles_to_search_in_recipe() {
            let articles = [] 
            this.$store.state.recipe.models.forEach(recipe => {
                articles.push(recipe.article)
            })
            return articles
        },
        get_articles_para_checkear_from_articles_pre_import(articles_pre_import) {
            return articles_pre_import.articles.length
        },
        articleRecipeHasAddresses(prop, recipe) {
            if (recipe.article) {
                let store_article = this.$store.state.article.models.find(_article => {
                    return _article.id == recipe.article_id 
                })
                if (typeof store_article != 'undefined') {
                    return store_article.addresses.length 
                }
            }
            return false 
        },
        checkOrderArticlesAddresses() {
            let ok = true
            console.log(this.owner)
            if (this.owner.online_configuration.save_sale_after_finish_order) {
                let order = this.$store.state.order.model 
                order.articles.forEach(order_article => {
                    let store_article = this.$store.state.article.models.find(_article => {
                        return _article.id == order_article.id 
                    })
                    if (typeof store_article != 'undefined' && store_article.addresses.length && !order_article.pivot.address_id) {
                        this.$toast.error('Indique deposito para el articulo '+order_article.name)
                        ok = false 
                    } 
                })
            }
            return ok
        },
        checkProviderOrderArticlesAddresses() {
            let ok = true

            // console.log('checkProviderOrderArticlesAddresses')

            // let provider_order = this.$store.state.provider_order.model

            // console.log('address_id: '+provider_order.address_id)
            
            // let addresses = this.$store.state.address.models 

            // if (addresses.length && !provider_order.address_id) {
            //     this.$toast.error('Indique deposito')
            //     ok = false 
            // }

            return ok
        },
		getFunctionValue(prop, model) {
			return this[prop.function](model, prop)
		},
        getOrderAddress(prop, model) {
            if (this.model.address) {
                return this.model.address.street+' '+this.model.address.street_number
            }
        },
        currentAcountStatus(current_acount) {
            if (current_acount.status == 'sin_pagar') {
                return 'Sin pagar'
            }
            if (current_acount.status == 'pagandose') {
                if (current_acount.pagandose > 0) {
                    return 'Pagandose ('+this.price(current_acount.pagandose)+')'
                }
            }
            if (current_acount.status == 'pagado') {
                return 'Pagado'
            }
            return null
        },
        totalBudgetItem(model) {
            let total = Number(model.pivot.price) * Number(model.pivot.amount)
            if (model.pivot.bonus) {
                total -= total * Number(model.pivot.bonus) / 100
            }
            console.log('totalBudgetItem '.total)
            return this.price(total)
        },
        showSellerCommissionSale(seller_commission) {
            this.$store.commit('auth/setMessage', 'Cargando venta')
            this.$store.commit('auth/setLoading', true)
            this.$api.get('sale/'+seller_commission.sale_id)
            .then(res => {
                this.setModel(res.data.model, 'sale')
            })
            .catch(err => {
                console.log(err)
            })
        },
        costoReal(article){
            let cost = Number(article.cost) 
            if (article.cost_in_dollars) {
                if (article.provider_id && this.getModelFromId('provider', article.provider_id) && this.getModelFromId('provider', article.provider_id).dolar) {
                    cost = cost * Number(this.getModelFromId('provider', article.provider_id).dolar)
                } else {
                    cost = cost * Number(this.owner.dollar) 
                }
            }
            article.article_discounts.forEach(discount => {
                cost -= cost * Number(discount.percentage / 100)
            })
            if (article.iva) {
                cost += cost * Number(article.iva.percentage / 100)
            }
            return this.price(cost)
        },
        getProductionMovementCostMateriales(production_movement, formated = true) {
            let total = 0
            if (production_movement.article) {
                let recipe = this.modelsStoreFromName('recipe').find(recipe => {
                    return recipe.article_id == production_movement.article_id 
                })
                if (typeof recipe != 'undefined') {
                    recipe.articles.forEach(article => {
                        if (article.pivot.order_production_status_id == production_movement.order_production_status_id) {
                            total += Number(article.final_price) * Number(article.pivot.amount) * Number(production_movement.amount) 
                        } 
                    })
                }
            }
            if (formated) {
                return this.price(total) 
            }
            return total
        },
        getProductionMovementCostManoDeObra(production_movement, formated = true) {
            let total = 0
            if (production_movement.article) {
                let recipe = this.modelsStoreFromName('recipe').find(recipe => {
                    return recipe.article_id == production_movement.article_id 
                })
                if (typeof recipe != 'undefined') {
                    recipe.articles.forEach(article => {
                        if (article.pivot.order_production_status_id == production_movement.order_production_status_id) {
                            console.log('article costo_mano_de_obra')
                            console.log(article.costo_mano_de_obra)
                            if (article.costo_mano_de_obra) {
                                total += Number(article.costo_mano_de_obra) * Number(article.pivot.amount) * Number(production_movement.amount) 
                            }
                        } 
                    })
                }
            }
            if (formated) {
                return this.price(total) 
            }
            return total
        },
        getProductionMovementCostNeto(production_movement) {
            let total = 0
            if (production_movement.article) {
                total += this.getProductionMovementCostMateriales(production_movement, false)            
                total += this.getProductionMovementCostManoDeObra(production_movement, false)            
            }
            return this.price(total) 
        },
        get_recipe_cost_materiales(recipe, formated = true) {
            let total = 0
            recipe.articles.forEach(article => {
                total += Number(article.final_price) * Number(article.pivot.amount)
            })
            if (formated) {
                return this.price(total) 
            }
            return total
        },
        get_recipe_cost_mano_de_obra(recipe, formated = true) {
            let total = 0
            recipe.articles.forEach(article => {
                if (article.costo_mano_de_obra) {
                    total += Number(article.costo_mano_de_obra) * Number(article.pivot.amount)
                }
            })
            if (formated) {
                return this.price(total) 
            }
            return total
        },
        get_recipe_cost_neto(recipe) {
            let total = 0
            total += this.get_recipe_cost_materiales(recipe, false)
            total += this.get_recipe_cost_mano_de_obra(recipe, false)
            return this.price(total) 
        },
        orderPaymentMethodDetails(model) {
            if (model.payment_method && model.payment_method.name == 'MercadoPago') {
                this.$store.dispatch('order_payment_method_detail/getModel', model)
                this.$bvModal.show('order-payment-method-details')
            } else if (model.payment_method && model.payment_method.name == 'Payway') {
                console.log('mostrando payment-card-info')
                this.setModel(model, 'order')
                this.$bvModal.show('payment-card-info')
            }
        },
        orderTotal(model, formated = true) {
            let total = 0 
            model.articles.forEach(article => {
                let total_article = Number(article.pivot.price) * Number(article.pivot.amount)
                total += total_article
            })
            if (model.payment_method_discount) {
                total -= total * model.payment_method_discount / 100
            }
            if (model.payment_method_surchage) {
                total += total * model.payment_method_surchage / 100
            }
            if (model.cupon) {
                if (model.cupon.percentage) {
                    total -= total * model.cupon.percentage / 100
                } else if (model.cupon.amount) {
                    total -= model.cupon.amount
                }
            }
            if (model.delivery_zone && model.delivery_zone.price) {
                total += Number(model.delivery_zone.price)
            }
            if (formated) {
                return dates.methods.price(total)
            } 
            return total  
        },
        sendWhatsApp(model) {
            window.open('https://wa.me/'+model.phone)
        },
        sendMessage(model) {
            this.$store.commit('message/setSelectedBuyer', model)
            this.$router.push({name: 'online', params: {view: 'mensajes'}})
        },
        budgetTotal(model, formated = true) {
            let total = 0 
            if (model.articles) {
                model.articles.forEach(article => {
                    let total_article = article.pivot.price * article.pivot.amount
                    if (article.pivot.bonus) {
                        total_article = total_article - (total_article * article.pivot.bonus / 100)
                    }
                    total += total_article
                })
            }
            if (model.discounts) {
                model.discounts.forEach(discount => {
                    if (discount.pivot) {
                        total -= total * discount.pivot.percentage / 100
                    } else {
                        total -= total * discount.percentage / 100
                    }
                }) 
            }
            if (model.surchages) {
                model.surchages.forEach(surchage => {
                    if (surchage.pivot) {
                        total += total * surchage.pivot.percentage / 100
                    } else {
                        total += total * surchage.percentage / 100
                    }
                }) 
            }
            if (formated) {
                return dates.methods.price(total)
            } 
            return total  
        },
		totalSale(sale, formated = true) {
			let total = 0
            let total_item = 0

            if (sale.total) {
                total = sale.total 
            } else {
                
                if (!sale.nota_credito_afip_ticket) {
        			sale.articles.forEach(article => {
        				total_item = this.getTotalItem(article, true)
                        // if (sale.discounts) {
                            sale.discounts.forEach(discount => {
                                total_item -= total_item * Number(discount.pivot.percentage) / 100    
                            })
                        // }
                        sale.surchages.forEach(surchage => {
                            total_item += total_item * Number(surchage.pivot.percentage) / 100    
                        })
                        total += total_item
        			})
        			sale.services.forEach(service => {
        				total_item = this.getTotalItem(service, true)
                        if (sale.discounts_in_services) {
                            sale.discounts.forEach(discount => {
                                total_item -= total_item * Number(discount.pivot.percentage) / 100    
                            })
                        }
                        if (sale.surchages_in_services) {
                            sale.surchages.forEach(surchage => {
                                total_item += total_item * Number(surchage.pivot.percentage) / 100    
                            })
                        }
                        total += total_item
        			})
        			sale.combos.forEach(combo => {
        				total_item = this.getTotalItem(combo, true)
                        sale.discounts.forEach(discount => {
                            total_item -= total_item * Number(discount.pivot.percentage) / 100    
                        })
                        sale.surchages.forEach(surchage => {
                            total_item += total_item * Number(surchage.pivot.percentage) / 100    
                        })
                        total += total_item
        			})
                    sale.current_acount_payment_methods.forEach(payment_method => {
                        if (payment_method.pivot.discount_amount) {
                            total -= Number(payment_method.pivot.discount_amount)
                        }
                    })
                }
            }

            if (formated) {
                return dates.methods.price(total)
            }
            return total
		},
        total_facturado(sale) {
            return this.price(sale.total_a_facturar)
            if (sale.afip_ticket) {
                return this.price(sale.afip_ticket.importe_total)
            }
        },
        getTotalItem(item, from_pivot = true) {
            let price 
            let amount 
            let discount
            let returned_amount = 0
            if (from_pivot) {
                price = item.pivot.price
                amount = item.pivot.amount
                discount = item.pivot.discount
                returned_amount = item.pivot.returned_amount
            } else {

                // calculated_price_vender es el que se usa
                // cuando agergo varios precios
                if (item.calculated_price_vender) {
                    price = item.calculated_price_vender 
                    amount = 1
                    
                } else {
                    price = item.price_vender 
                    amount = item.amount
                }
                discount = item.discount
            }
           
            let total = price * amount
            if (discount && discount != '') {
                total -= total * Number(discount) / 100
            }
            return total
        },
        showClientCurrentAcount(sale) {
            this.$store.commit('current_acount/setFromModelName', 'client')
            this.$store.commit('current_acount/setFromModel', sale.client)
            this.$store.dispatch('current_acount/getModels')
            this.$bvModal.show('current-acounts')
        },
        showProviderCurrentAcount(provider_order) {
            this.$store.commit('current_acount/setFromModelName', 'provider')
            this.$store.commit('current_acount/setFromModel', provider_order.provider)
            this.$store.dispatch('current_acount/getModels')
            this.$bvModal.show('current-acounts')
        },
        provider_order_total(model, formated = true) {
            let total = 0 
            if (model.total_from_provider_order_afip_tickets) {
                model.provider_order_afip_tickets.forEach(afip_ticket => {
                    total += Number(afip_ticket.total) 
                    console.log('sumando '+afip_ticket.total+' de la boleta al total de '+total)
                })
            } else {

                model.articles.forEach(article => {
                    let total_article = 0
                    let cost = article.pivot.cost 

                    if (cost) {

                        if (article.pivot.cost_in_dollars) {
                            if (model.provider.dolar) {
                                cost = cost * model.provider.dolar 
                            } 
                        } 

                        total_article = cost * article.pivot.amount

                        if (model.total_with_iva && article.pivot.iva_id && article.pivot.iva_id != 0) {
                            let iva = this.modelsStoreFromName('iva').find(model => {
                                return model.id == article.pivot.iva_id
                            })
                            if (typeof iva != 'undefined' && iva.percentage != 'Exento' && iva.percentage != 'No Gravado' && iva.percentage != 0) {
                                total_article += total_article * iva.percentage / 100       
                            } 
                        }
                    } else {

                        total_article = Number(article.pivot.price) * Number(article.pivot.received)
                    }
                    
                    if (article.pivot.bonus) {
                        total_article = total_article - (total_article * article.pivot.bonus / 100)
                    }
                    total += total_article
                })
            }
            model.provider_order_extra_costs.forEach(extra_cost => {
                total += Number(extra_cost.value)                
            })

            this.$store.commit('provider_order/totales/set_total', total)
            console.log('seteando total de provider_order con: ')
            console.log(total)
            if (formated) {
                return dates.methods.price(total)
            } 

            return total  
        },
	}
}