import dates from '@/common-vue/mixins/dates'
export default {
	methods: {
		getFunctionValue(prop, model) {
			return this[prop.function](model)
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
        getProductionMovementCost(production_movement) {
            let total = 0
            console.log('getProductionMovementCost')
            console.log(production_movement)
            if (production_movement.article) {
                let recipe = this.modelsStoreFromName('recipe').find(recipe => {
                    return recipe.article_id == production_movement.article_id 
                })
                console.log('recipe')
                console.log(recipe)
                if (typeof recipe != 'undefined') {
                    recipe.articles.forEach(article => {
                        if (article.pivot.order_production_status_id == production_movement.order_production_status_id) {
                            total += Number(article.final_price) * Number(article.pivot.amount) * Number(production_movement.amount) 
                        } 
                    })
                }
            }
            return this.price(total) 
        },
        getRecipeCost(recipe) {
            let total = 0
            recipe.articles.forEach(article => {
                total += Number(article.final_price) * Number(article.pivot.amount)
            })
            return this.price(total) 
        },
        orderPaymentMethodDetails(model) {
            if (model.payment_method && model.payment_method.name == 'MercadoPago') {
                this.$store.dispatch('order_payment_method_detail/getModel', model)
                this.$bvModal.show('order-payment-method-details')
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
        budgetTotal(model, formated = true) {
            let total = 0 
            model.articles.forEach(article => {
                let total_article = article.pivot.price * article.pivot.amount
                if (article.pivot.bonus) {
                    total_article = total_article - (total_article * article.pivot.bonus / 100)
                }
                total += total_article
            })
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
        getTotalItem(item, from_pivot = false) {
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
                price = item.price_vender 
                amount = item.amount
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
            if (formated) {
                return dates.methods.price(total)
            } 
            return total  
        },
	}
}