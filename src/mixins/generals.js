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


        surchages_id() {
            return this.$store.state.vender.surchages_id 
        },
        surchages_store() {
            return this.$store.state.surchage.models 
        },
        surcahges_models_vender() {

            let sale_surchages = []
            
            if (this.surchages_id.length) {
                
                this.surchages_id.forEach(id => {
                    sale_surchages.push(this.surchages_store.find(item => item.id == id))
                }) 

            }
            return sale_surchages
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
            let cajas_default = this.$store.state.default_payment_method_caja.models.filter(caja_default => {
                return caja_default.current_acount_payment_method_id == payment_method_id 
                    && caja_default.address_id == address_id
            })

            // console.log('cajas_default:')
            // console.log(cajas_default)

            // Si existe una caja por defecto, ordénala primero
            if (cajas_default.length) {

                let default_caja_for_employee = null
                cajas_default.forEach(caja => {
                    if (
                        caja.employee_id == this.user.id
                    ) {
                        default_caja_for_employee = caja
                    }
                })

                if (default_caja_for_employee) {
                    return default_caja_for_employee.caja_id 
                }

                // console.log('caja_default: '+cajas_default[0].caja_id)

                return cajas_default[0].caja_id 
            }
        },

        get_caja_options(payment_method_id = null, address_id = null, moneda_id = null) {

            let options = [{
                value: 0,
                text: 'Seleccione caja'
            }]

            let cajas_disponibles = this.$store.state.caja.models.filter(caja => caja.abierta)


            // Solo las cajas que tienen asignada y pertenecen a una sucursal 
            if (address_id) {
                cajas_disponibles = cajas_disponibles.filter(caja => {
                    if (caja.address_id) {
                        return caja.address_id == address_id
                    } else {
                        return true
                    }
                })
            }

            // Solo las cajas que tienen asignada y pertenecen a una moneda 
            if (moneda_id) {
                cajas_disponibles = cajas_disponibles.filter(caja => {
                    if (caja.moneda_id !== null) {
                        return caja.moneda_id == moneda_id
                    } else {
                        return true
                    }
                })
            }


            // Solo las cajas a las que el usuario tiene acceso
            cajas_disponibles = cajas_disponibles.filter(caja => {

                // Si es administrador, siempre va a tener acceso
                if (this.is_admin) {
                    return true
                }

                // Si la caja tiene asignados empleados con acceso, se cheque que el usuario logeado este en esa lista
                if (caja.users.length) {

                    let usuario_con_acceso = false

                    caja.users.forEach(user_caja => {

                        if (user_caja.id == this.user.id) {
                            usuario_con_acceso = true 
                        } 
                    })

                    return usuario_con_acceso
                }
                return true 
            })

            // Formate de nombres, se agrega nombre de empleado (en caso que pertenezca a uno) y la moneda (en caso de que sea USD) y la sucursal
            cajas_disponibles.forEach(caja => {
                let name = caja.name 
                if (caja.employee) {
                    name += ' (' + caja.employee.name + ')' 
                }
                if (caja.moneda_id == 2) {
                    name += ' (USD)' 
                }
                if (caja.address_id) {
                    let address = this.$store.state.address.models.find(a => a.id == caja.address_id)
                    if (typeof address != 'undefined') {

                        name += ' (' + address.street + ')' 
                    }
                }
                options.push({
                    value: caja.id,
                    text: name,
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

                let text = caja.name 

                if (caja.employee) {
                    text += ' ' + caja.employee.name 
                }

                options.push({
                    value: caja.id,
                    text: text
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
        /**
         * Indica si el dueño (owner) tiene activado el modo listas de precio.
         * Usa user.listas_de_precio del owner; equivale a la antigua extensión de listas.
         *
         * @returns {boolean}
         */
        ownerUsesListasDePrecio() {
            if (!this.authenticated || !this.owner) {
                return false
            }
            const v = this.owner.listas_de_precio
            return v === 1 || v === true || v === '1'
        },
        hasExtencion(slug, check_has_one_extencion_permission = true) {
            if (slug === 'articulo_margen_de_ganancia_segun_lista_de_precios') {
                return this.ownerUsesListasDePrecio()
            }
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
        /*
            Obtiene el porcentaje de IVA numerico para un item de venta.
            Prioriza la relacion iva del item y luego cae al iva_id / pivot.iva_id.
        */
        get_item_iva_percentage(item) {
            // Porcentaje de IVA normalizado para usar en calculos.
            let iva_percentage = 0

            if (item && item.iva && typeof item.iva.percentage != 'undefined') {
                iva_percentage = this.normalize_iva_percentage(item.iva.percentage)
            } else if (item && item.iva_id) {
                iva_percentage = this.get_iva_percentage_from_store(item.iva_id)
            } else if (item && item.pivot && item.pivot.iva_id) {
                iva_percentage = this.get_iva_percentage_from_store(item.pivot.iva_id)
            }

            return iva_percentage
        },
        /*
            Busca el porcentaje de IVA desde el store usando el iva_id.
            Si no existe el IVA o no es numerico, devuelve 0.
        */
        get_iva_percentage_from_store(iva_id) {
            // Lista de IVA disponible en store para resolver alicuotas por id.
            let iva_models = this.$store.state.iva ? this.$store.state.iva.models : []
            // Modelo de IVA encontrado a partir del id recibido.
            let iva_model = iva_models.find(model => {
                return model.id == iva_id
            })

            if (typeof iva_model == 'undefined') {
                return 0
            }

            return this.normalize_iva_percentage(iva_model.percentage)
        },
        /*
            Normaliza el valor de porcentaje de IVA a numero.
            Maneja etiquetas de exento/no gravado y formatos string.
        */
        normalize_iva_percentage(percentage) {
            if (
                percentage === null
                || percentage === ''
                || percentage == 'Exento'
                || percentage == 'Extento'
                || percentage == 'No Gravado'
            ) {
                return 0
            }

            // Valor de porcentaje convertido a numero para operar.
            let parsed_percentage = Number(String(percentage).replace(',', '.'))

            if (isNaN(parsed_percentage)) {
                return 0
            }

            return parsed_percentage
        },
        /*
            Obtiene el contexto de iva_aplicado actual y guardado.
            Se usa para evitar doble descuento al editar ventas previas.
        */
        get_iva_aplicado_context(from_pivot) {
            // Valor actual del checkbox iva_aplicado en store vender.
            let current_iva_aplicado = this.$store.state.vender.iva_aplicado == 1 ? 1 : 0
            // Venta previa cargada en store al actualizar una venta existente.
            let previus_sale = this.$store.state.vender.previus_sales.previus_sale
            // Presupuesto cargado en vender al usar "Actualizar en VENDER" u operar sobre un budget existente.
            let budget = this.$store.state.vender.budget
            // Define si hay una venta previa real sobre la que comparar flags.
            let has_previus_sale = from_pivot && previus_sale && previus_sale.id
            // Misma idea que la venta previa: ítems desde pivot al editar un presupuesto ya guardado.
            let has_previus_budget = from_pivot && budget && budget.id
            // Valor de iva_aplicado persistido en la venta o presupuesto que se esta editando.
            let saved_iva_aplicado = current_iva_aplicado

            if (has_previus_sale) {
                saved_iva_aplicado = previus_sale.iva_aplicado == 1 ? 1 : 0
            } else if (has_previus_budget) {
                if (typeof budget.iva_aplicado !== 'undefined' && budget.iva_aplicado !== null) {
                    saved_iva_aplicado = budget.iva_aplicado == 1 ? 1 : 0
                }
            }

            return {
                current_iva_aplicado,
                saved_iva_aplicado,
            }
        },
        /*
            Ajusta el precio segun iva_aplicado actual vs guardado.
            Permite alternar IVA en nuevas ventas y en actualizacion sin doble descuento.
        */
        ajustar_precio_segun_iva_aplicado(item, price, from_pivot = false) {
            // Contexto actual/guardado del flag iva_aplicado.
            let iva_context = this.get_iva_aplicado_context(from_pivot)
            // Alicuota de IVA del item, en porcentaje.
            let iva_percentage = this.get_item_iva_percentage(item)

            if (iva_percentage <= 0) {
                return price
            }

            // Multiplicador para convertir entre neto y precio con IVA.
            let iva_multiplier = 1 + (iva_percentage / 100)

            if (iva_context.saved_iva_aplicado == iva_context.current_iva_aplicado) {
                if (!from_pivot && iva_context.current_iva_aplicado == 0) {
                    return Number(price) / iva_multiplier
                }
                return price
            }

            if (iva_context.saved_iva_aplicado == 1 && iva_context.current_iva_aplicado == 0) {
                return Number(price) / iva_multiplier
            }

            if (iva_context.saved_iva_aplicado == 0 && iva_context.current_iva_aplicado == 1) {
                return Number(price) * iva_multiplier
            }

            return price
        },
        getPriceVender(item, from_pivot = false) {
            // console.log('getPriceVender para '+item.name)
            // console.log(item)

            let price

            // Array de descripción del proceso de cálculo del precio para este item
            let item_des = []

            if (item.price_vender_personalizado) {

                price = item.price_vender_personalizado
                item_des.push('Precio personalizado: ' + this.price(price))

                // Ajuste IVA sobre el precio personalizado
                let price_before_iva = price
                price = this.ajustar_precio_segun_iva_aplicado(item, price, from_pivot)
                if (Number(price) !== Number(price_before_iva)) {
                    item_des.push('Ajuste IVA: ' + this.price(price_before_iva) + ' -> ' + this.price(price))
                }

            } else if (
                /*
                    Si es golonorte, no se usa el precio del articulo al momento de crear la venta.
                    Se omite este if y se aplica el precio actual de la lista de precio seleccionada
                */
                from_pivot 
                && item.pivot 
                && item.pivot.price
                && (
                    !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
                    || item.is_combo
                )
                // && (
                //     !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
                //     || !item.price_type_personalizado_id
                // )
            ) {

                price = item.pivot.price
                item_des.push('Precio del pivot (venta anterior): ' + this.price(price))

                // Ajuste IVA sobre el precio del pivot
                let price_before_iva = price
                price = this.ajustar_precio_segun_iva_aplicado(item, price, true)
                if (Number(price) !== Number(price_before_iva)) {
                    item_des.push('Ajuste IVA: ' + this.price(price_before_iva) + ' -> ' + this.price(price))
                }
            
            } else if (this.hasExtencion('articulos_precios_en_blanco') && item.is_article) {

                let afip_information_id = this.$store.state.vender.afip_information_id

                if (afip_information_id) {

                    // console.log('usando precio en blanco')
                    price = item.final_price_blanco
                    item_des.push('Precio en blanco (con AFIP): ' + this.price(price))
                    
                } else {

                    price = item.final_price
                    item_des.push('Precio en blanco (sin AFIP): ' + this.price(price))
                }

                // Ajuste IVA sobre el precio en blanco
                let price_before_iva = price
                price = this.ajustar_precio_segun_iva_aplicado(item, price)
                if (Number(price) !== Number(price_before_iva)) {
                    item_des.push('Ajuste IVA: ' + this.price(price_before_iva) + ' -> ' + this.price(price))
                }

            } else {

                // Flujo normal: precio final base con todas las transformaciones
                price = item.final_price
                item_des.push('Precio final base: ' + this.price(price))

                // Lista de precios (price type)
                let price_before_pt = price
                price = this.aplicar_tipos_de_precio(item, price)
                if (Number(price) !== Number(price_before_pt)) {
                    item_des.push('Lista de precios aplicada: ' + this.price(price_before_pt) + ' -> ' + this.price(price))
                }

                // Descuento por método de pago a nivel de item
                let price_before_pm = price
                price = this.aplicar_descuento_metodo_de_pago(item, price)
                if (Number(price) !== Number(price_before_pm)) {
                    item_des.push('Descuento metodo de pago: ' + this.price(price_before_pm) + ' -> ' + this.price(price))
                }

                // Recargos aplicados directo al item
                let price_before_rec = price
                price = this.aplicar_recargos(item, price)
                if (Number(price) !== Number(price_before_rec)) {
                    item_des.push('Recargo directo al item: ' + this.price(price_before_rec) + ' -> ' + this.price(price))
                }

                // Cuotas
                let price_before_cuotas = price
                price = this.check_cuotas(item, price)
                if (Number(price) !== Number(price_before_cuotas)) {
                    item_des.push('Cuotas aplicadas: ' + this.price(price_before_cuotas) + ' -> ' + this.price(price))
                }

                // Ajuste IVA
                let price_before_iva = price
                price = this.ajustar_precio_segun_iva_aplicado(item, price)
                if (Number(price) !== Number(price_before_iva)) {
                    item_des.push('Ajuste IVA: ' + this.price(price_before_iva) + ' -> ' + this.price(price))
                }

                // price = this.redondear(price)
            }
            
            // price = this.aplicar_recargos(item, price)

            price = Number(price)

            // Cotización de moneda (se aplica al final, fuera de todas las ramas)
            let price_before_moneda = price
            price = this.check_moneda(item, price, from_pivot)
            if (Number(price) !== Number(price_before_moneda)) {
                item_des.push('Cotizacion moneda: ' + this.price(price_before_moneda) + ' -> ' + this.price(price))
            }

            // Precio final del item después de todas las transformaciones
            item_des.push('Precio unitario final: ' + this.price(price))

            // Asignar el array de descripción al item para que setTotal lo use
            item.price_vender_description = item_des

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
                            // console.log('luego de cotizar_a_dolar: ')
                            // console.log(price)
                        } else {
                            if (this.owner.cotizar_precios_en_dolares) {
                                price = this.cotizar_a_dolar(price)
                                // console.log('luego de cotizar_a_dolar: ')
                                // console.log(price)
                            } else {
                                // console.log('no se cotizo a dolar')
                            }
                        } 

                    } else if (this.$store.state.vender.moneda_id == 1) {

                        // La venta es en pesos
                        
                        if (
                            item.cost_in_dollars
                            && !this.owner.cotizar_precios_en_dolares
                        ) {
                            price = this.cotizar_a_peso(price)
                            // console.log('luego de cotizar_a_peso: ')
                            // console.log(price)
                        } else {
                            // console.log('no se cotizo a peso')
                        }

                    }
                } else {
                    // console.log('no entro porque tiene pivot')
                }
            }
            
            return price
        },
        cotizar_a_peso(price) {
            // console.log('cotizar_a_peso: ')
            // console.log(price)
            return price = Number(price) * Number(this.$store.state.vender.valor_dolar) 
        },
        cotizar_a_dolar(price) {
            // console.log('cotizar_a_dolar:')
            // console.log(price)
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

            console.log('aplicar_tipos_de_precio a: ')
            console.log(item)
            if (item.is_article) {

                let price_vender_id = null

                // if (this.hasExtencion('cambiar_price_type_en_vender')) {

                    if (this.price_type_vender) {
                        console.log('usando price_type_vender id: '+this.price_type_vender.id)
                        price_vender_id = this.price_type_vender.id 
                    }

                // }

                // if (this.hasExtencion('cambiar_price_type_en_vender_item_por_item')) {

                    if (item.price_type_personalizado_id) {

                        price_vender_id = item.price_type_personalizado_id
                    }
                // }

                if (price_vender_id) {

                    if (this.hasExtencion('ventas_en_dolares')) {

                        let moneda_id = this.$store.state.vender.moneda_id

                        let article_price_type_moneda = item.price_type_monedas.find(ptm => {
                            return ptm.price_type_id == price_vender_id && ptm.moneda_id == moneda_id
                        })

                        if (typeof article_price_type_moneda != 'undefined') {
                            // console.log('usando price_type_moneda moneda_id: '+article_price_type_moneda.moneda_id+', price_type_id: '+article_price_type_moneda.price_type_id)
                            // console.log(article_price_type_moneda.final_price)
                            price = article_price_type_moneda.final_price
                        } else {
                            // console.log(`No se encontró price_type_moneda para artículo ${item.name}, PT: ${price_vender_id}, Moneda: ${moneda_id}`)
                        }

                    } else {

                        let article_price_type = item.price_types.find(price_type => {
                            return price_type.id == price_vender_id 
                        })

                        if (typeof article_price_type != 'undefined') {

                            price = article_price_type.pivot.final_price
                        } else {
                            // console.log('No se encontro price type para '+item.name)
                        }
                    }
                        
                }
            }

            return price
        },
        aplicar_recargos(item, price) {

            if (
                this.$store.state.vender.aplicar_recargos_directo_a_items
                && this.surcahges_models_vender.length
            ) {

                if (
                    item.is_article
                    || (
                        item.is_service 
                        && this.$store.state.vender.surchages_in_services
                    )
                ) { 

                    price = Number(price)

                    this.surcahges_models_vender.forEach(sur => {
                        console.log('Aplicando recargo al precio de')
                        console.log(Number(price))
                        console.log(Number(sur.percentage))
                        price += price * Number(sur.percentage) / 100
                    })
                }
            }

            return price
        },
        aplicar_descuento_metodo_de_pago(item, price) {
            if (this.current_acount_payment_method_discounts.length 
                && this.current_acount_payment_method_id) {

                // console.log('aplicar_descuento_metodo_de_pago')
                price = this.aplicar_monto_descuento(price, this.current_acount_payment_method_id)
            }
            return price
        },
        check_cuotas(item, price) {
            if (this.current_acount_payment_method_id) {

                price = this.aplicar_cuotas(price, this.current_acount_payment_method_id)
                console.log('price quedo en '+price)
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