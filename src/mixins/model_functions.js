import dates from '@/common-vue/mixins/dates'
export default {
	methods: {
        saleGetColor(sale) {
            if (this.route_name == 'deposito-para-checkear' && sale.printed) {
                return 'sale-printed'
            }
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
                return store_article.addresses.length 
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
            let provider_order = this.$store.state.provider_order.model 
            provider_order.articles.forEach(order_article => {
                let store_article = this.$store.state.article.models.find(_article => {
                    return _article.id == order_article.id 
                })
                if (typeof store_article != 'undefined' && store_article.addresses.length && order_article.pivot.address_id == 0) {
                    this.$toast.error('Indique deposito para el articulo '+order_article.name)
                    ok = false 
                } 
            })
            return ok
        },
		getFunctionValue(prop, model) {
			return this[prop.function](model)
		},
        getOrderAddress(prop, model) {
            if (this.model.address) {
                return this.model.address.street+' '+this.model.address.street_number
            }
        },
        setBudgetArticlePrice(budget, article) {
            if (budget.client) {
                this.$store.commit('vender/setPriceType', budget.client.price_type)
                return this.setPriceType(article, article.final_price)
            } 
            return article.final_price
        },
        currentAcountStatus(current_acount) {
            if (current_acount.status == 'sin_pagar') {
                if (current_acount.pagandose > 0) {
                    return 'Pagandose ('+this.price(current_acount.pagandose)+')'
                }
                return 'Sin pagar'
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
                let total_article = article.pivot.price * article.pivot.amount
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
            // if (sale.discounts.length) {
            //     sale.discounts.forEach(discount => {
            //         total -= total * discount.pivot.percentage / 100
            //     })
            // }
            // if (sale.surchages.length) {
            //     sale.surchages.forEach(surchage => {
            //         total += total * surchage.pivot.percentage / 100
            //     })
            // }
            if (formated) {
                return dates.methods.price(total)
            }
            return total
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
                if (item.calculated_price_vender) {
                    price = item.calculated_price_vender 
                    amount = 1
                    // if (item.amount == '') {
                    //     amount = 1
                    // } else {
                    //     amount = item.amount
                    // }
                    // console.log('')
                } else {
                    price = item.price_vender 
                    amount = item.amount
                }
                discount = item.discount
                returned_amount = item.returned_amount
            }
            if (returned_amount > 0) {
                amount -= returned_amount
            }
            let total = price * amount
            if (discount && discount != '') {
                total -= total * Number(discount) / 100
            }
            // console.log('getTotalItem')
            // console.log(total)
            return total
        },
        showClientCurrentAcount(sale) {
            this.$store.commit('current_acount/setFromModelName', 'client')
            this.$store.commit('current_acount/setFromModel', sale.client)
            this.$store.dispatch('current_acount/getModels')
            this.$bvModal.show('current-acounts')
        },
        providerOrderTotal(model, formated = true) {
            let total = 0 
            if (model.total_from_provider_order_afip_tickets) {
                model.provider_order_afip_tickets.forEach(afip_ticket => {
                    total += Number(afip_ticket.total) 
                    console.log('sumando '+afip_ticket.total+' de la boleta al total de '+total)
                })
            } else {
                model.articles.forEach(article => {
                    let cost = article.pivot.cost 
                    if (article.pivot.received_cost) {
                        cost = article.pivot.received_cost
                    }
                    if (article.pivot.cost_in_dollars) {
                        if (model.provider.dolar) {
                            cost = cost * model.provider.dolar 
                        } 
                    } 
                    let total_article = cost * article.pivot.received
                    if (model.total_with_iva && article.pivot.iva_id && article.pivot.iva_id != 0) {
                        let iva = this.modelsStoreFromName('iva').find(model => {
                            return model.id == article.pivot.iva_id
                        })
                        if (typeof iva != 'undefined' && iva.percentage != 'Exento' && iva.percentage != 'No Gravado' && iva.percentage != 0) {
                            total_article += total_article * iva.percentage / 100       
                        } 
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
            if (formated) {
                return dates.methods.price(total)
            } 
            return total  
        },
	}
}