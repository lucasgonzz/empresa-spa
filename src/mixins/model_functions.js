import moment from 'moment'
import dates from '@/common-vue/mixins/dates'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
import db from '@/offline/db'
import { normalizar_telefono } from '@/utils/whatsapp_phone'
import { es_perfil_de_ticket } from '@/constants/vender_print_shortcut_options'
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

        /**
         * Bruto de una alicuota de IVA de una factura de compra: `neto + iva_importe`.
         *
         * Mision `compras-factura-manual-alicuotas` (17/9/2026). Lo declara la prop `bruto` de
         * src/models/provider_order_afip_ticket_iva.js con `function`, y lo consume
         * `propertyText()` (common-vue/mixins/generals.js:955), que despues le aplica el formato
         * de precio porque la prop es `is_price`.
         *
         * 🔴 Existe porque `bruto` NO es una columna de la base: el modelo que devuelve la API no
         * trae la clave, asi que sin esto la columna de la tabla saldria vacia en toda fila ya
         * guardada. Es display puro -- no escribe nada en el modelo, no viaja en ningun request y
         * no hay un tercer numero que se pueda desincronizar de los otros dos.
         *
         * Vacio (no cero) cuando la fila todavia no tiene ninguno de los dos importes: un "0,00"
         * en una fila recien creada se lee como un dato cargado, y no lo es.
         *
         * @param {Object} model la alicuota (provider_order_afip_ticket_iva).
         * @param {Object} prop la propiedad que declara esta funcion.
         * @returns {Number|String}
         */
        bruto_de_alicuota_de_factura(model, prop) {
            if (!model) {
                return ''
            }

            let neto = Number(model.neto)
            let iva_importe = Number(model.iva_importe)

            if (isNaN(neto)) {
                neto = 0
            }
            if (isNaN(iva_importe)) {
                iva_importe = 0
            }

            let sin_neto = model.neto === null || model.neto === '' || typeof model.neto == 'undefined'
            let sin_iva = model.iva_importe === null || model.iva_importe === '' || typeof model.iva_importe == 'undefined'

            if (sin_neto && sin_iva) {
                return ''
            }

            return neto + iva_importe
        },

        /**
         * Columna "Banco" de la tabla de cheques (prop `banco` de src/models/cheque.js, misión
         * cheques-endoso-y-bancos, 21/9/2026).
         *
         * El banco pasó de texto libre a un catálogo, pero la columna `cheques.banco` no se
         * saca: es la compatibilidad hacia atrás y lo que el asistente lee para unificar. Por
         * eso acá gana el nombre del banco del catálogo si el cheque ya tiene uno, y si no se
         * muestra el texto de siempre. Es display puro: no escribe nada en el modelo.
         *
         * 🔴 La relación se llama `cheque_banco` y NUNCA `banco`: toArray() del backend mergea
         * las relaciones sobre los atributos y una relación `banco` pisaría el texto legacy.
         *
         * @param {Object} model el cheque.
         * @returns {String}
         */
        cheque_banco_texto(model) {
            if (!model) {
                return ''
            }

            if (model.cheque_banco && model.cheque_banco.name) {
                return model.cheque_banco.name
            }

            if (model.banco === null || typeof model.banco == 'undefined') {
                return ''
            }

            return model.banco
        },

        /**
         * Columna "Endosado en el gasto" de la solapa Endosados de cheques recibidos (prop
         * `endosado_en_expense_id` de src/models/cheque.js). Un cheque recibido puede endosarse
         * al registrar un GASTO, donde no hay proveedor: acá se muestra el gasto en su lugar,
         * "Gasto N° 12 — Flete" (decisión 1 de Lucas, misión cheques-endoso-y-bancos).
         *
         * La relación `endosado_en_expense` (con `expense_concept`) la trae GET cheque. Si por
         * lo que sea viniera solo el id, se muestra igual que hay un gasto y no una celda vacía
         * que se lea como "no está endosado".
         *
         * @param {Object} model el cheque.
         * @returns {String}
         */
        cheque_endosado_en_gasto_texto(model) {
            if (!model || !model.endosado_en_expense_id) {
                return ''
            }

            let gasto = model.endosado_en_expense

            if (!gasto) {
                return 'Gasto'
            }

            let texto = 'Gasto'

            if (gasto.num) {
                texto += ' N° ' + gasto.num
            }

            if (gasto.expense_concept && gasto.expense_concept.name) {
                texto += ' — ' + gasto.expense_concept.name
            }

            return texto
        },

        show_budget_sale_status_id(prop, model) {
            return this.$store.state.sale_status.models.length
        },

        add_production_batch_id(model) {
            // console.log('add_production_batch_id model:')
            // console.log(model)
            let production_batch_id = this.$store.state.production_batch.model.id
            model.production_batch_id = production_batch_id
            return model
        },

        search_recipe_route(info_to_send_to_api) {
            console.log('search_recipe_route')
            let recipe_id = this.$store.state.production_batch.recipe_id

            if (
                recipe_id
                && typeof recipe_id != 'undefined'
            ) {
                info_to_send_to_api.recipe_id = recipe_id
                console.log('agregando recipe_id: '+recipe_id)
            }
            return info_to_send_to_api
            
        },

        movimiento_entre_cajas_options(prop, caja) {
            let text = caja.name 

            if (caja.employee_id) {
                text += ' '+ caja.employee ? caja.employee.name : ''
            }
            return text
        },

        get_employee(model, prop) {
            if (model.employee_id) {
                let employee = this.$store.state.employee.models.find(e => e.id == model.employee_id)
                if (typeof employee != 'undefined') {
                    return employee.name 
                }
            }
            if (this.owner) {
                return this.owner.name 
            }
            return null
        },

        stock_suggestionGetColor(model) {
            return this.syncs_meli_color(model)
        },
        sync_to_tn_articleGetColor(model) {
            return this.syncs_meli_color(model)
        },
        sync_from_meli_orderGetColor(model) {
            return this.syncs_meli_color(model)
        },
        sync_to_meli_articleGetColor(model) {
            return this.syncs_meli_color(model)
        },
        sync_from_meli_articleGetColor(model) {
            return this.syncs_meli_color(model)
        },
        syncs_meli_color(model) {
            if (model.status == 'pendiente' || model.status == 'en_progreso') {
                return 'sync-meli-warning'
            }

            if (
                model.status == 'exitosa'
                || model.status == 'terminado'
            ) {
                return 'sync-meli-success'
            }

            if (model.status == 'error') {
                return 'sync-meli-danger'
            }
        },
        go_to_sync_from_meli_order() {
            this.$router.push({name: 'mercado_libre', params: {view: 'sinc-pedido-entrantes'}})
            this.$store.dispatch('sync_from_meli_order/getModels')
        },
        go_to_sync_from_meli() {
            this.$router.push({name: 'mercado_libre', params: {view: 'sinc-articulo-entrantes'}})
            this.$store.dispatch('sync_from_meli_article/getModels')
        },
        toast_article_provider_order_unidades_individuales(result) {
            if (
                result.model 
                && result.model.unidades_individuales
            ) {
                this.$toast.warning(this.numero_es(result.model.unidades_individuales)+' unidades individuales')
            }
        },
        async search_articles_offline(query) {
            if (typeof query != 'undefined') {
                
                const keywords = query.trim().toLowerCase().split(/\s+/)

                // Traer todos los artículos activos (si tenés un campo status)
                const articles = await db.articles
                    .filter(article => {
                        const name = (article.name || '').toLowerCase()
                        return keywords.every(keyword => name.includes(keyword))
                    })
                    .toArray()

                return articles
            }
        },
        async get_articles_offline() {
            return await db.articles.toArray()
        },
        article_iva_id() {
            if (this.owner.default_article_iva_id) {
                return this.owner.default_article_iva_id
            }
            return 2
        },
        set_article_price_types(_prop) {

            console.log('set_article_price_types, _prop:')
            console.log(_prop)

            let prop = {
                ..._prop,
                value: []
            }

            let price_types = this.$store.state.price_type.models 

            price_types.forEach(price_type => {
                prop.value.push({
                    ...price_type,
                    pivot: {
                        incluir_en_excel_para_clientes: price_type.incluir_en_lista_de_precios_de_excel,
                        setear_precio_final: price_type.setear_precio_final,
                        // Mision catalogo-por-lista-tienda (5/10/2026): un articulo nuevo nace sin
                        // habilitar en la tienda para ninguna lista. Mismo default que el otro
                        // constructor de este pivote (init_article_price_type de
                        // components/listado/components/price-type-input/Index.vue).
                        visible_en_tienda: 0,
                    }
                })
            })

            console.log('asi quedo la prop:')
            console.log(prop)

            return prop 
        },
        get_sale_payment_methods(sale, prop) {
            let metodos = ''

            if (sale.current_acount_payment_method) {
                metodos = sale.current_acount_payment_method.name
            
            } else {

                sale.current_acount_payment_methods.forEach(payment_method => {
                    metodos += payment_method.name + ' '
                })
            }


            return metodos
        },
        get_hora(model, prop) {
            return this.hour(model.created_at)
        },
        /**
         * Texto legible de las fuentes verificables de una descripcion generada por IA.
         * `ai_sources` es un array de objetos `{source, url, title}` (ver
         * ArticleDescriptionAiService::build_sources en empresa-api) — nunca un array
         * de strings. Devuelve texto plano (sin HTML): esta misma funcion se usa tanto
         * en la tabla del HasMany generico (Tr.vue, interpola con {{ }}, escapa HTML)
         * como en el campo de solo lectura del formulario de edicion (ModelForm.vue,
         * renderiza con v-html) — un link clickeable ahi se veria como tag literal
         * en la tabla.
         *
         * @param {Object} model Descripcion (debe tener ai_generated y ai_sources).
         * @return {String} Fuentes separadas por " · ", o '' si no hay fuentes de IA.
         */
        get_description_ai_sources_text(model) {
            // Sin descripcion generada por IA o sin fuentes guardadas: no hay nada que mostrar.
            if (!model || !model.ai_generated || !Array.isArray(model.ai_sources) || !model.ai_sources.length) {
                return ''
            }
            // Arma un array de textos legibles a partir de cada objeto fuente,
            // priorizando url, luego title y luego source como fallback.
            let sources_text = []
            model.ai_sources.forEach(source => {
                let text = ''
                if (source && typeof source === 'object') {
                    text = source.url || source.title || source.source || ''
                } else {
                    text = source || ''
                }
                if (text !== '') {
                    sources_text.push(text)
                }
            })
            return sources_text.join(' · ')
        },
        get_address_stock_in_vender(article, prop) {
            if (typeof article != 'undefined' && typeof prop != 'undefined') {

                let address_id = prop.key.substr(8)

                let article_address = article.addresses.find(address => address.id == address_id)

                if (typeof article_address != 'undefined') {

                    /*
                        🔴 Devuelve el valor CRUDO, no el texto formateado. Quien le pone los
                        separadores es propertyText(), en su rama de prop.function.

                        El motivo: las props que usan esta funcion llevan `is_stock: true`
                        (buscador-articulos/Index.vue y remito/header-form/ArticleName.vue), y
                        TableComponent decide con ese valor si la celda va en rojo. Si esta funcion
                        devuelve '1.234,50', el numero deja de poder leerse y toda la columna se
                        pinta como si no hubiera stock.
                    */
                    return article_address.pivot.amount
                }
                return null
            }
        },
        get_price_type_price_in_search_modal(article, prop) {
            if (typeof article == 'undefined' || typeof prop == 'undefined' || !prop.key) {
                return ''
            }
            const price_type_id = Number(prop.key.substr('price_type_'.length))
            if (!article.price_types || !article.price_types.length) {
                return ''
            }
            if (this.hasExtencion('ventas_en_dolares')) {
                const price_type_monedas = (article.price_type_monedas || []).filter(_price_type => {
                    return _price_type.price_type_id == price_type_id
                })
                if (!price_type_monedas.length) {
                    return ''
                }
                let display = ''
                const pesos = price_type_monedas.find(p => p.moneda_id == 1)
                if (
                    pesos
                    && typeof pesos.final_price != 'undefined'
                    && pesos.final_price !== ''
                    && pesos.final_price !== null
                    && pesos.final_price != 0
                ) {
                    display = this.price(pesos.final_price)
                }
                const dolar = price_type_monedas.find(p => p.moneda_id == 2)
                if (
                    dolar
                    && typeof dolar.final_price != 'undefined'
                    && dolar.final_price !== ''
                    && dolar.final_price !== null
                    && dolar.final_price != 0
                ) {
                    display += (display ? ' | ' : '') + this.price(dolar.final_price) + ' USD'
                }
                return display
            }
            const article_price_type = article.price_types.find(_price_type => {
                return _price_type.id == price_type_id
            })
            if (typeof article_price_type == 'undefined') {
                return ''
            }
            return this.price(article_price_type.pivot.final_price)
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

        /*
           Movimientos de deposito (mision movimientos-deposito-auditoria, 3/10/2026).

           Funciones globales que consumen src/models/deposit_movement.js (disabled_function) y
           src/models/deposit_movement_status.js (form_disabled_to_edit_function y nota_function),
           mas los componentes de src/components/listado/components/horizontal-nav/deposit-movements/.

           🔴 Los nombres llevan el prefijo `deposit_movement_` a proposito: este archivo es un mixin
           GLOBAL, y un metodo de un mixin local con el mismo nombre pisa al global en silencio.

           La guarda real esta en el backend (DepositMovementController@update y @move_stock); estas
           funciones solo reflejan en la pantalla lo que el backend va a aceptar, para que el
           usuario no edite algo que despues le van a rechazar.
        */

        /**
         * Si el stock de un movimiento de deposito YA SE MOVIO. Es el UNICO criterio de "stock
         * movido" de la SPA: lo usan los bloqueos de abajo, el boton "Mover stock", el distintivo
         * de la fila, el aviso del formulario, la tabla de solo lectura y el boton Eliminar.
         *
         * 🔴 Cuenta `stock_moved_at` O `recibido_at`, igual que el backend (ajuste del 3/10/2026,
         * compatibilidad con el frente viejo). Mientras un cliente tenga los dos frentes andando
         * sobre la misma base, el frente con el codigo anterior traslada el stock al pasar el
         * movimiento a "Recibido" y solo escribe `recibido_at`: no conoce `stock_moved_at`. Si aca
         * se mirara solo `stock_moved_at`, ese movimiento seguiria mostrando "Mover stock" y se
         * podria trasladar dos veces. Al reves tambien esta cubierto: el "Mover stock" nuevo llena
         * `recibido_at`, que es lo que el frente viejo mira para no volver a trasladar.
         *
         * @param {Object} model el movimiento de deposito.
         * @returns {Boolean} true si el stock ya se movio por cualquiera de los dos caminos.
         */
        deposit_movement_stock_movido(model) {
            return !!(model && (model.stock_moved_at || model.recibido_at))
        },

        /**
         * Si los DATOS de un movimiento de deposito ya creado (empleado, estado y notas) quedan
         * de solo lectura.
         *
         * Se bloquean cuando el movimiento ya existe y el usuario no tiene el permiso
         * `deposit_movement.update` ("Editar movimientos de deposito (estado, depositos y notas)").
         * En un alta nunca se bloquean: crear un movimiento no pide ese permiso. El dueño pasa
         * siempre, porque `can()` le devuelve true.
         *
         * @param {Object} model el movimiento de deposito que muestra el formulario.
         * @returns {Boolean} true si los campos tienen que quedar deshabilitados.
         */
        deposit_movement_datos_bloqueados(model) {
            if (!model || !model.id) {
                return false
            }
            return !this.can('deposit_movement.update')
        },

        /**
         * Si los depositos de ORIGEN y DESTINO de un movimiento ya creado quedan de solo lectura.
         *
         * Igual que los datos (sin permiso de edicion) y, ademas, cuando el stock del movimiento
         * ya se movio (`deposit_movement_stock_movido`): el traslado se hizo entre ESOS dos
         * depositos, y cambiarlos dejaria el registro diciendo algo que no paso. El backend lo
         * rechaza con un 422.
         *
         * @param {Object} model el movimiento de deposito que muestra el formulario.
         * @returns {Boolean} true si los selects de deposito tienen que quedar deshabilitados.
         */
        deposit_movement_depositos_bloqueados(model) {
            if (!model || !model.id) {
                return false
            }
            if (this.deposit_movement_datos_bloqueados(model)) {
                return true
            }
            return this.deposit_movement_stock_movido(model)
        },

        /**
         * Si los ARTICULOS de un movimiento ya creado quedan bloqueados (no se agregan, no se
         * quitan, no se cambian cantidades).
         *
         * Se bloquean por cualquiera de dos motivos:
         * - el stock del movimiento ya se movio (`deposit_movement_stock_movido`: boton "Mover
         *   stock", o "Recibido" desde el frente viejo): los articulos son el registro de lo que
         *   se traslado, y a partir de ahi no cambian nunca mas;
         * - el usuario no tiene el permiso `deposit_movement.update_articles`.
         *
         * La consume el prop `articles` del modelo (apaga el buscador) y los slots `#articles` del
         * modal del listado y de las alertas, que en ese caso cambian la tabla editable por una de
         * solo lectura (ArticulosSoloLectura.vue).
         *
         * @param {Object} model el movimiento de deposito.
         * @returns {Boolean} true si los articulos no se pueden tocar.
         */
        deposit_movement_articulos_bloqueados(model) {
            if (!model || !model.id) {
                return false
            }
            if (this.deposit_movement_stock_movido(model)) {
                return true
            }
            return !this.can('deposit_movement.update_articles')
        },

        /**
         * Texto de cuando y quien movio el stock de un movimiento: "el 03/10/2026 14:35 por Juan".
         *
         * - Con `stock_moved_at` (boton "Mover stock"): esa fecha, y "por Nombre" si se sabe quien
         *   fue. Los movimientos viejos que la migracion marco como movidos tienen el usuario en
         *   NULL: para esos sale solo la fecha ("el 03/10/2026 14:35").
         * - Con solo `recibido_at` (el frente viejo lo traslado al pasarlo a "Recibido", ver
         *   `deposit_movement_stock_movido`): esa fecha, sin "por", porque el frente viejo no
         *   registra quien.
         *
         * Las dos columnas no estan casteadas en el modelo de Laravel, asi que llegan como texto
         * "AAAA-MM-DD hh:mm:ss" en la hora de la app (Argentina) y moment las lee como hora local
         * del navegador. Si algun dia se castean, llegan en ISO con zona y moment las convierte
         * igual: el texto no cambia.
         *
         * @param {Object} model el movimiento de deposito.
         * @returns {String} el texto, o '' si el stock todavia no se movio.
         */
        deposit_movement_stock_movido_texto(model) {
            if (!model) {
                return ''
            }
            if (model.stock_moved_at) {
                let texto = 'el ' + moment(model.stock_moved_at).format('DD/MM/YYYY HH:mm')
                if (model.stock_moved_user && model.stock_moved_user.name) {
                    texto += ' por ' + model.stock_moved_user.name
                }
                return texto
            }
            if (model.recibido_at) {
                return 'el ' + moment(model.recibido_at).format('DD/MM/YYYY HH:mm')
            }
            return ''
        },

        /**
         * Si un estado de movimiento de deposito es uno de los FIJOS del sistema ("En proceso" y
         * "Recibido"): las filas globales con `user_id` en NULL.
         *
         * Esos dos no se renombran ni se borran: en las bases compartidas los usan muchos comercios
         * a la vez. La consume src/models/deposit_movement_status.js como
         * `form_disabled_to_edit_function` (deja todo el formulario de solo lectura) y
         * src/common-vue/views/Abm.vue para esconder Guardar y Eliminar. El backend igual
         * responde 403 si alguien lo intenta.
         *
         * @param {Object} model el estado de movimiento de deposito.
         * @returns {Boolean} true si es un estado fijo ya guardado.
         */
        deposit_movement_status_es_fijo(model) {
            return !!(model && model.id && !model.user_id)
        },

        /**
         * Nota permanente debajo del campo "Nombre" de un estado de movimiento de deposito
         * (`nota_function` de src/models/deposit_movement_status.js): avisa por que un estado fijo
         * no se deja editar. Para los estados propios no dice nada.
         *
         * @param {Object} model el estado de movimiento de deposito.
         * @returns {String} el aviso, o '' si el estado es propio o todavia no se guardo.
         */
        deposit_movement_status_nota_fijo(model) {
            if (this.deposit_movement_status_es_fijo(model)) {
                return 'Este estado viene con el sistema: no se puede cambiar ni eliminar.'
            }
            return ''
        },
        /**
         * Opciones del select "Estado" de cada insumo de una ruta de receta.
         *
         * Filtra los estados por el grupo de la ruta que se esta editando. Si la ruta no tiene
         * grupo, devuelve todos los estados de la cuenta, que es como funcionaba hasta ahora.
         *
         * El segundo argumento es el ARTICULO de la fila (asi lo llama PivotProp.vue), no la
         * ruta: la ruta se lee del store, que es donde el formulario deja el modelo que se esta
         * editando (display.js -> setModel -> commit('recipe_route/setModel')).
         *
         * Si no se puede resolver la ruta, devuelve TODOS los estados. Nunca una lista vacia:
         * dejaria al usuario sin poder cargar el insumo.
         *
         * @param {Object} prop Definicion declarativa del campo (va por firma comun, no se usa).
         * @param {Object} article Articulo insumo de la fila (va por firma comun, no se usa).
         * @returns {Array<{value: number, text: string}>}
         */
        opciones_de_estados_del_grupo_de_la_ruta(prop, article) {
            let options = [{ value: 0, text: 'Seleccione Estado' }]
            let route = this.$store.state.recipe_route.model
            let group_id = route && route.order_production_status_group_id ? route.order_production_status_group_id : null

            this.$store.state.order_production_status.models.forEach(status => {
                if (group_id && status.order_production_status_group_id != group_id) {
                    return
                }
                options.push({ value: status.id, text: status.name })
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

                // 🔴 Sin redondear, y es a proposito. Esta es la columna con el nombre del metodo
                // de pago en el buscador de Vender: el numero que el vendedor le lee al cliente.
                // El precio que llega aca ya tiene aplicado el descuento por forma de pago, y el
                // backend NUNCA redondea despues de un descuento -- ArticleHelper::redondear() se
                // aplica una sola vez, sobre el precio de catalogo. El importe que la venta cobra
                // tampoco se redondea. Cuando esto llamaba a redondear(), un cliente con "de a 50"
                // y 12% de descuento veia $900 en esta columna y el sistema le cobraba $880.
                // La regla, decidida el 11/8/2026: la SPA no redondea, muestra lo que se cobra.
                return this.price(price)
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
            console.log('articleRecipeHasAddresses')
            console.log(recipe)
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
        // checkOrderArticlesAddresses() {
        //     let ok = true
        //     console.log(this.owner)
        //     if (this.owner.online_configuration.save_sale_after_finish_order) {
        //         let order = this.$store.state.order.model 
        //         let addresses = this.$store.state.address.models 
                
        //         if (addresses.length && !order.address_id) {
                    
        //             this.$toast.error('Indique un deposito')
        //             ok = false 
        //         } 
        //     }
        //     return ok
        // },
		getFunctionValue(prop, model) {
			return this[prop.function](model, prop)
		},
        getOrderAddress(prop, model) {
            if (this.model.address) {
                return this.model.address.street+' '+this.model.address.street_number
            }
        },
        /**
         * Etiqueta legible de la modalidad de entrega del pedido online.
         *
         * @param {object} order
         * @returns {string}
         */
        getOrderDeliverLabel(order) {
            if (this.order_envio_opcion(order)) {
                return 'Envío a domicilio (Zipnova)'
            }
            if (Number(order.deliver) === 1) {
                return 'Envio a domicilio'
            }
            return 'Retiro por local'
        },
        /**
         * Opción de envío por correo que eligió el comprador (`orders.envio_opcion`, §2.4 del plan
         * zipnova-envios), o null si el pedido no la tiene.
         *
         * Tolera que venga como string JSON (un backend sin el cast `array`) para que el listado
         * no se rompa en un cliente con la SPA nueva y la API vieja.
         *
         * @param {object} order
         * @returns {object|null}
         */
        order_envio_opcion(order) {
            if (!order || !order.envio_opcion) {
                return null
            }
            if (typeof order.envio_opcion == 'string') {
                try {
                    return JSON.parse(order.envio_opcion)
                } catch (e) {
                    return null
                }
            }
            return order.envio_opcion
        },
        /**
         * Columna "Envío" del listado de pedidos: en qué está el envío por correo.
         *
         * @param {object} order
         * @returns {string}
         */
        getOrderEnvioEstado(order) {
            if (order.envio) {
                let texto = order.envio.status_name
                    ? order.envio.status_name
                    : (order.envio.status ? order.envio.status : 'Generado')
                if (order.envio.status == 'error') {
                    texto += ' ⚠'
                }
                return texto
            }
            if (this.order_envio_opcion(order)) {
                return 'Sin generar'
            }
            if (Number(order.deliver) === 1) {
                return 'Envío propio'
            }
            return 'Retiro'
        },
        /**
         * "Envío elegido" del formulario del pedido: "{correo} · {servicio} · $ {precio} · llega
         * {dd/mm}" para una opción de Zipnova, o el nombre de la zona de reparto del negocio.
         *
         * @param {object} order
         * @returns {string}
         */
        getOrderEnvioResumen(order) {
            let opcion = this.order_envio_opcion(order)
            if (opcion) {
                let partes = []
                if (opcion.carrier_name) {
                    partes.push(opcion.carrier_name)
                }
                if (opcion.service_name) {
                    partes.push(opcion.service_name)
                }
                if (opcion.envio_gratis || Number(opcion.precio) === 0) {
                    partes.push('Gratis')
                } else if (opcion.precio) {
                    partes.push(this.price(opcion.precio))
                }
                if (opcion.estimated_delivery) {
                    partes.push('llega ' + moment(opcion.estimated_delivery).format('DD/MM'))
                }
                return partes.join(' · ')
            }
            if (order.delivery_zone && order.delivery_zone.name) {
                let texto = order.delivery_zone.name
                if (order.delivery_zone.price) {
                    texto += ' · ' + this.price(order.delivery_zone.price)
                }
                return texto
            }
            return ''
        },
        /**
         * Formulario del cheque (misión cheque-edicion-acotada, 8/10/2026): el Cliente de solo
         * lectura se muestra únicamente en un cheque recibido. Es v_if_function y no `v_if` porque
         * showProperty() compara `typeof v_if == 'array'`, que nunca se cumple.
         *
         * @param {object} prop
         * @param {object} model El cheque.
         * @returns {boolean}
         */
        cheque_es_recibido(prop, model) {
            return !!model && model.tipo === 'recibido'
        },
        /**
         * Idem para el Proveedor de solo lectura: solo en un cheque emitido.
         *
         * @param {object} prop
         * @param {object} model El cheque.
         * @returns {boolean}
         */
        cheque_es_emitido(prop, model) {
            return !!model && model.tipo === 'emitido'
        },
        /**
         * `v_if_function` del formulario de Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026):
         * esconde los campos que un ticket de comandera no tiene ("Predeterminado WhatsApp (remito)",
         * "Predeterminado WhatsApp (factura ARCA)", "Predeterminado Tienda (ecommerce)" y "Mostrar
         * pie de página en cada hoja") cuando el tipo de hoja elegido es un rollo (`sheet_type.height`
         * null, D2 del plan). El selector "Hoja o comandera" deja el objeto en `model.sheet_type` al
         * elegir, así que se esconden en el momento, sin guardar. La API igual los fuerza en false en
         * un ticket (D4).
         *
         * Va en un mixin GLOBAL a propósito: showProperty() también se evalúa en la tabla del ABM
         * (Tr.vue), y un v_if_function que no existe ahí rompe el render de la fila.
         *
         * @param {object} prop
         * @param {object} model El diseño de PDF.
         * @returns {boolean}
         */
        pdf_column_profile_campo_de_hoja(prop, model) {
            return !es_perfil_de_ticket(model)
        },
        /**
         * `v_if_function` de "Envío elegido": solo tiene sentido en un pedido con envío a
         * domicilio.
         *
         * @param {object} prop
         * @param {object} model
         * @returns {boolean}
         */
        mostrar_order_envio_resumen(prop, model) {
            return !!model && Number(model.deliver) === 1
        },
        /**
         * "Descuentos y recargos del cliente" del formulario del pedido (misión
         * descuentos-recargos-por-cliente, 23/9/2026): "Descuento Mayorista 10% · Recargo Flete 5%.
         * Los precios del pedido ya los incluyen."
         *
         * El porcentaje sale del PIVOT del pedido (la foto que sacó la tienda al crearlo), no del
         * descuento de hoy: si el dueño lo cambió después, el pedido se cobró con el viejo.
         *
         * 🔴 La aclaración de que los precios ya los incluyen no es decorativa: sin ella, quien
         * mira el pedido tiende a restar el descuento otra vez del total. Al confirmar, la venta
         * recibe estos mismos ajustes con los renglones a precio sin ajustar.
         *
         * @param {object} order
         * @returns {string}
         */
        getOrderAjustesDelCliente(order) {
            let self = this
            let porcentaje = function (model) {
                let valor = model.pivot && model.pivot.percentage != null ? model.pivot.percentage : model.percentage
                return self.porcentaje_es(valor) + '%'
            }
            let partes = []
            ;(order.discounts || []).forEach(function (discount) {
                partes.push('Descuento ' + discount.name + ' ' + porcentaje(discount))
            })
            ;(order.surchages || []).forEach(function (surchage) {
                partes.push('Recargo ' + surchage.name + ' ' + porcentaje(surchage))
            })
            if (!partes.length) {
                return ''
            }
            return partes.join(' · ') + '. Los precios del pedido ya los incluyen.'
        },
        /**
         * `v_if_function` de "Descuentos y recargos del cliente": solo si el pedido tiene alguno.
         * Un pedido de una tienda vieja, o de un comprador sin cliente, no los tiene (y en un
         * cliente sin las tablas, el back ni siquiera manda las relaciones).
         *
         * @param {object} prop
         * @param {object} model
         * @returns {boolean}
         */
        mostrar_order_ajustes_del_cliente(prop, model) {
            if (!model) {
                return false
            }
            let discounts = Array.isArray(model.discounts) ? model.discounts.length : 0
            let surchages = Array.isArray(model.surchages) ? model.surchages.length : 0
            return discounts + surchages > 0
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
        /*
            Botón "WhatsApp" de la tabla de Compradores de la tienda online. El botón no vive en
            ningún .vue: se declara en src/models/buyer.js y la tabla genérica lo despacha por
            acá (callMethod -> getFunctionValue -> this[prop.button.function]). Como no hay
            componente ni template en el que colgar una prop, el enganche del sidebar tiene que
            entrar adentro de este método; por eso abrir_chat_whatsapp() vive en un mixin GLOBAL
            y no se importa.

            🔴 LA RAMA wa.me NO ES CÓDIGO MUERTO. No la borres.

            WhatsApp es una extensión que se contrata aparte, y hay negocios que no la tienen
            pero usan este botón todos los días para saltar al WhatsApp Web del comprador. El
            arreglo "obvio" —ponerle if_has_extencion: 'whatsapp' a la entrada de
            src/models/buyer.js, que es lo que el sistema de tablas ofrece para gatear un botón—
            le haría DESAPARECER el botón a todos ellos. Eso es una regresión, no una mejora, y
            es exactamente por eso que src/models/buyer.js quedó sin tocar y el botón se
            reemplaza por dentro: un solo archivo modificado y cero pérdida de funcionalidad.

            Con la extensión, el teléfono se normaliza a solo dígitos porque es lo que espera
            POST api/whatsapp-chats. Sin ella se conserva el model.phone CRUDO de siempre, sin
            normalizar: cambiarlo sería tocarle el link a quien hoy funciona, y este método no
            está para arreglar eso.

            display_name se manda y se guarda: es lo que hace que el comprador aparezca con su
            nombre y no como un numero pelado, porque aca no hay cliente del ERP de donde sacarlo.
            Y no se manda client_id a proposito: un Buyer de la tienda no es un Client del ERP.
        */
        sendWhatsApp(model) {
            if (this.hasExtencion('whatsapp')) {
                this.abrir_chat_whatsapp({
                    phone: normalizar_telefono(model.phone),
                    display_name: model.name,
                })
                return
            }
            window.open('https://wa.me/'+model.phone)
        },
        /*
            Botón "Mensaje" de la tabla de Clientes de Tienda Online (se declara en
            src/models/buyer.js). Abre la conversación con el comprador en el sidebar de Mensajes,
            sin salir de la pantalla: mismo camino que el botón de WhatsApp de al lado, por el mismo
            motivo (acá no hay componente propio, así que el enganche vive en un mixin global).
            Antes navegaba al módulo viejo de mensajes, que se borró en la misión
            mensajes-tienda-online (28/9/2026).
        */
        sendMessage(model) {
            this.abrir_chat_tienda(model)
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
        /**
         * Costo total de un renglón de una venta: costo unitario congelado × cantidad vendida.
         * Devuelve null si el renglón no tiene costo (la celda muestra "-", no un costo cero).
         *
         * @param {Object} item  Artículo con su pivot de la venta (pivot.cost, pivot.amount).
         * @return {number|null}
         */
        get_sale_item_cost_total(item) {
            if (!item || !item.pivot || this.pivot_value_is_empty(item.pivot.cost)) {
                return null
            }
            return Number(item.pivot.cost) * Number(item.pivot.amount)
        },
        /**
         * Precio unitario CON IVA de un renglón de venta. `article_sale.price` ya se guarda con IVA
         * incluido (el neto sale de dividirlo, ver SaleHelper::get_price_sin_iva en la API), así que
         * es el mismo valor que la columna "Precio unitario": se ofrece con el nombre explícito.
         *
         * @param {Object} item  Artículo con su pivot de la venta.
         * @return {number|null}
         */
        get_sale_item_price_con_iva(item) {
            if (!item || !item.pivot || this.pivot_value_is_empty(item.pivot.price)) {
                return null
            }
            return Number(item.pivot.price)
        },
        /**
         * Precio total CON IVA de un renglón: unitario × cantidad menos el descuento de línea.
         * Es el mismo cálculo que la columna "Precio total" (getTotalItem).
         *
         * @param {Object} item  Artículo con su pivot de la venta.
         * @return {number|null}
         */
        get_sale_item_price_con_iva_total(item) {
            if (!item || !item.pivot || this.pivot_value_is_empty(item.pivot.price)) {
                return null
            }
            return this.getTotalItem(item)
        },
        /**
         * Precio unitario SIN IVA de un renglón de venta. Usa el neto congelado al vender
         * (pivot.price_sin_iva); en ventas viejas que no lo tienen lo calcula con la alícuota
         * congelada (pivot.iva_percentage). Si tampoco hay alícuota devuelve null: no se inventa un
         * IVA para restar. Una alícuota no numérica (Exento / No Gravado) deja el precio como está.
         *
         * @param {Object} item  Artículo con su pivot de la venta.
         * @return {number|null}
         */
        get_sale_item_price_sin_iva(item) {
            if (!item || !item.pivot) {
                return null
            }
            const pivot = item.pivot
            if (!this.pivot_value_is_empty(pivot.price_sin_iva)) {
                return Number(pivot.price_sin_iva)
            }
            if (this.pivot_value_is_empty(pivot.price) || this.pivot_value_is_empty(pivot.iva_percentage)) {
                return null
            }
            const alicuota = Number(pivot.iva_percentage)
            if (isNaN(alicuota) || alicuota == 0) {
                return Number(pivot.price)
            }
            return Number(pivot.price) / (1 + alicuota / 100)
        },
        /**
         * Precio total SIN IVA de un renglón: neto unitario × cantidad menos el descuento de línea.
         *
         * @param {Object} item  Artículo con su pivot de la venta.
         * @return {number|null}
         */
        get_sale_item_price_sin_iva_total(item) {
            const unitario = this.get_sale_item_price_sin_iva(item)
            if (unitario === null) {
                return null
            }
            let total = unitario * Number(item.pivot.amount)
            if (!this.pivot_value_is_empty(item.pivot.discount)) {
                total -= total * Number(item.pivot.discount) / 100
            }
            return total
        },
        /**
         * Informa si un valor del pivot viene vacío (null, undefined o ''). El 0 NO es vacío:
         * un costo de 0 es un dato, no una ausencia.
         *
         * @param {*} value
         * @return {boolean}
         */
        pivot_value_is_empty(value) {
            return value === null || typeof value === 'undefined' || value === ''
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
        /**
         * Nombre del artículo en el detalle de venta (pivot.name o catálogo + variante).
         *
         * @param {Object} article  Artículo con pivot de la venta.
         * @param {Object} prop     Definición de columna del modelo sale.
         * @return {string}
         */
        get_sale_article_display_name(article, prop) {
            return this.getItemDisplayName(article, true)
        },
        /**
         * Nombre del artículo en el detalle de presupuesto (pivot.name o catálogo + variante).
         * Equivalente a get_sale_article_display_name pero para presupuestos.
         * Conserva key:'name' y show_in_input_if para permitir edición de artículos inactivos.
         *
         * @param {Object} article  Artículo con pivot del presupuesto.
         * @param {Object} prop     Definición de columna del modelo budget.
         * @return {string}
         */
        get_budget_article_display_name(article, prop) {
            return this.getItemDisplayName(article, true)
        },
        showCurrentAcount(client, credit_account) {

            this.$store.commit('current_acount/setFromModelName', 'client')
            this.$store.commit('current_acount/setFromModel', client)
            this.$store.commit('current_acount/set_from_credit_account', credit_account)
            this.$store.dispatch('current_acount/getModels')
            this.$bvModal.show('current-acounts')
        },
        showClientCurrentAcount(sale) {

            let client = sale.client 

            let credit_account = client.credit_accounts.find(ca => ca.moneda_id == sale.moneda_id)

            this.$store.commit('current_acount/setFromModelName', 'client')
            this.$store.commit('current_acount/setFromModel', sale.client)
            this.$store.commit('current_acount/set_from_credit_account', credit_account)
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

            this.$store.commit('provider_order/set_total', total)
            console.log('seteando total de provider_order con: ')
            console.log(total)
            if (formated) {
                return dates.methods.price(total)
            } 

            return total  
        },

        /* ══════════════════════════════════════════════════════════════════════════════════════
           COMBOS CALCULADOS (mision combos-calculados, 30/9/2026)

           Funciones globales que consume src/models/combo.js (v_if_function, disabled_function,
           nota_function, function, value_function, dynamic_options_function). Los motores del
           formulario las resuelven por nombre contra los mixins globales, por eso viven aca.

           El front NO calcula costo ni precio del combo: con el check prendido lo calcula el
           servidor al guardar (una sola implementacion, la de empresa-api). Estas funciones solo
           deciden que campos se muestran, cuales se bloquean y como se ve el resultado.
           ══════════════════════════════════════════════════════════════════════════════════════ */

        /**
         * Si el combo esta marcado para calcularse desde sus articulos.
         *
         * Number() y no un chequeo de verdad a secas: el check del formulario escribe 1/0, la API
         * puede devolver el tinyint como 1/0 o como true/false segun el cast del modelo, y un "0"
         * string es truthy en JS.
         *
         * @param {Object} combo
         * @returns {Boolean}
         */
        combo_se_calcula_desde_articulos(combo) {
            return !!combo && Number(combo.calcular_desde_articulos) === 1
        },

        /**
         * disabled_function de `cost` y `price` del combo: con el check prendido esos dos campos
         * los escribe el servidor al guardar, asi que se bloquean para que nadie tipee un numero
         * que se va a pisar en silencio.
         *
         * @param {Object} combo
         * @returns {Boolean}
         */
        combo_costo_y_precio_bloqueados(combo) {
            return this.combo_se_calcula_desde_articulos(combo)
        },

        /**
         * nota_function de `cost` y `price` del combo: la leyenda permanente debajo del campo
         * bloqueado. Sin ella el campo queda gris (con el valor viejo o vacio) sin explicar por que.
         *
         * @param {Object} combo
         * @param {Object} prop `cost` o `price`
         * @returns {String} '' cuando el combo es manual y el campo se edita normalmente
         */
        combo_nota_de_campo_calculado(combo, prop) {
            if (!this.combo_se_calcula_desde_articulos(combo)) {
                return ''
            }
            if (prop && prop.key == 'cost') {
                return 'Se calcula al guardar: suma el costo de cada artículo por su cantidad. El descuento nunca toca el costo.'
            }
            let texto = 'Se calcula al guardar: suma el precio de cada artículo por su cantidad, menos el descuento.'

            /*
                El precio por lista solo existe en las cuentas con listas de precio comunes. Con
                listas por categoria o ventas en dolares el combo se calcula con un precio unico
                (lo avisa combo_nota_de_calculo_sin_listas, debajo del check): decir aca que hay un
                precio por cada lista contradeciria ese aviso.
            */
            if (!this.hasExtencion('lista_de_precios_por_categoria') && !this.hasExtencion('ventas_en_dolares')) {
                texto += ' Si tu cuenta usa listas de precios, se calcula un precio por cada lista.'
            }

            return texto
        },

        /**
         * nota_function del check "Calcular en base a los articulos": en las cuentas que usan
         * listas de precio por categoria o ventas en dolares, el combo calculado NO tiene un precio
         * por lista. El servidor lo calcula con el precio de venta base de cada articulo
         * (`final_price`), que es un unico numero, porque en esas extensiones el precio por lista no
         * vive en price_types. Sin este aviso el operador creeria que tiene un precio por lista
         * (es lo que dice la pantalla en cuentas comunes) y vende con uno solo.
         *
         * Solo con el check prendido: apagado no hay calculo y no hay nada que avisar.
         *
         * @param {Object} combo
         * @returns {String} '' si el combo es manual o la cuenta no usa ninguna de las dos extensiones
         */
        combo_nota_de_calculo_sin_listas(combo) {
            if (!this.combo_se_calcula_desde_articulos(combo)) {
                return ''
            }

            let por_categoria = this.hasExtencion('lista_de_precios_por_categoria')
            let en_dolares = this.hasExtencion('ventas_en_dolares')

            if (!por_categoria && !en_dolares) {
                return ''
            }

            let motivo = 'usa listas de precio por categoría'

            if (en_dolares && !por_categoria) {
                motivo = 'vende en dólares'
            } else if (en_dolares && por_categoria) {
                motivo = 'usa listas de precio por categoría y vende en dólares'
            }

            return 'Tu cuenta ' + motivo + ': el combo se calcula con un precio único (el precio de venta base de cada artículo) y no con las listas de precios.'
        },

        /**
         * v_if_function del tipo de descuento: solo tiene sentido con el check prendido, porque un
         * combo manual tiene el precio que se le escribio y no hay sobre que descontar.
         *
         * @param {Object} prop
         * @param {Object} combo
         * @returns {Boolean}
         */
        show_combo_descuento_tipo(prop, combo) {
            return this.combo_se_calcula_desde_articulos(combo)
        },

        /**
         * v_if_function del valor del descuento: ademas del check pide que ya se haya elegido si es
         * porcentaje o monto. Asi el servidor nunca recibe un valor suelto sin tipo, y el operador
         * no tiene un numero que no sabe si son pesos o por ciento.
         *
         * @param {Object} prop
         * @param {Object} combo
         * @returns {Boolean}
         */
        show_combo_descuento_valor(prop, combo) {
            return this.combo_se_calcula_desde_articulos(combo)
                && (combo.descuento_tipo == 'porcentaje' || combo.descuento_tipo == 'monto')
        },

        /**
         * nota_function del valor del descuento: aclara sobre que se aplica, que es lo que el
         * operador no puede deducir mirando el campo (decision de Lucas: el mismo descuento a cada
         * lista, y nunca sobre el costo).
         *
         * @param {Object} combo
         * @returns {String}
         */
        combo_nota_de_descuento(combo) {
            if (!this.show_combo_descuento_valor(null, combo)) {
                return ''
            }
            if (combo.descuento_tipo == 'porcentaje') {
                return 'Se descuenta este porcentaje al precio de venta de cada lista. El costo no cambia.'
            }
            return 'Se resta este monto al precio de venta de cada lista (nunca queda por debajo de $0). El costo no cambia.'
        },

        /**
         * Opciones del tipo de descuento. Van por dynamic_options_function y no por `options`
         * porque getOptions() le antepone siempre una opcion "Seleccione ..." con value 0, y un 0
         * como tipo de descuento no es un valor que el servidor entienda (solo acepta
         * 'porcentaje', 'monto' o null).
         *
         * @returns {Array}
         */
        combo_descuento_tipo_options() {
            return [
                { value: null, text: 'Sin descuento' },
                { value: 'porcentaje', text: 'Porcentaje (%)' },
                { value: 'monto', text: 'Monto fijo ($)' },
            ]
        },

        /**
         * value_function del tipo de descuento en un combo NUEVO. Sin esto, el motor le pone 0 a
         * todo select sin `value` (display.js::getSelectAndCheckboxProps), y el servidor recibiria
         * un tipo 0 que no existe. null = sin descuento.
         *
         * @returns {null}
         */
        combo_descuento_tipo_inicial() {
            return null
        },

        /**
         * value_function de un campo de fecha que arranca en el dia de hoy (hoy: la fecha de
         * emision de una factura de compra nueva). Corre al ABRIR el formulario, asi que no se
         * congela con la fecha en que se cargo la pestaña. Formato 'YYYY-MM-DD', el que espera el
         * <input type="date"> de common-vue/components/model/form/DatePicker.vue.
         *
         * @returns {String}
         */
        fecha_de_hoy_para_input() {
            return moment().format('YYYY-MM-DD')
        },

        /**
         * Stock del combo para la columna `stock_disponible` (tabla del ABM, buscador de Vender).
         *
         * Devuelve el numero CRUDO (o null), nunca texto: TableComponent decide con este valor si
         * la celda va en rojo (`is_stock`), y un '1.234' formateado dejaria de poder leerse como
         * numero. Los separadores se los pone propertyText().
         *
         * `null` no es cero: es "ningun componente lleva control de stock", el combo se puede
         * vender siempre. La columna declara `null_es_sin_control` para no pintarlo de rojo.
         *
         * @param {Object} combo
         * @returns {Number|null}
         */
        get_stock_disponible_del_combo(combo) {
            if (!combo || combo.stock_disponible === null || typeof combo.stock_disponible == 'undefined' || combo.stock_disponible === '') {
                return null
            }
            let stock = Number(combo.stock_disponible)
            return isNaN(stock) ? null : stock
        },

        /**
         * El mismo stock, pero como TEXTO para el formulario del ABM (campo de solo lectura). El
         * formulario no sabe pintar un null: mostraria un recuadro gris vacio, y "sin control" es
         * una informacion que el operador tiene que poder leer.
         *
         * @param {Object} combo
         * @returns {String}
         */
        get_stock_disponible_del_combo_en_formulario(combo) {
            let stock = this.get_stock_disponible_del_combo(combo)
            if (stock === null) {
                return 'Sin control de stock (ningún artículo del combo lleva stock)'
            }
            return stock + ' (cuántos combos se pueden armar con lo que hay)'
        },

        /**
         * v_if_function de los campos de solo lectura del combo (stock y precios por lista): un
         * combo que todavia no se guardo no tiene ni stock ni precios calculados que mostrar.
         *
         * @param {Object} prop
         * @param {Object} combo
         * @returns {Boolean}
         */
        show_combo_dato_calculado_si_esta_guardado(prop, combo) {
            return !!(combo && combo.id)
        },

        /**
         * v_if_function del detalle de precios por lista: ademas de estar guardado, el combo tiene
         * que tener filas por lista (solo las tienen los calculados de una cuenta con listas).
         *
         * @param {Object} prop
         * @param {Object} combo
         * @returns {Boolean}
         */
        show_combo_precios_por_lista(prop, combo) {
            return !!(combo && combo.id && Array.isArray(combo.price_types) && combo.price_types.length)
        },

        /**
         * Texto de solo lectura con el precio del combo en cada lista ("Mayorista: $ 900 · ...").
         * Se muestra en el formulario para que quien calcula el combo vea el resultado por lista
         * sin tener que ir a Vender.
         *
         * El nombre de la lista lo escribe el usuario y el campo de solo lectura dibuja con v-html:
         * se escapa antes de armar el texto.
         *
         * @param {Object} combo
         * @returns {String}
         */
        get_precios_por_lista_del_combo(combo) {
            if (!combo || !Array.isArray(combo.price_types)) {
                return ''
            }

            let escapar = texto => String(texto)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')

            let partes = []

            combo.price_types.forEach(price_type => {
                if (!price_type || !price_type.pivot || price_type.pivot.price === null || typeof price_type.pivot.price == 'undefined') {
                    return
                }
                partes.push(escapar(price_type.name) + ': ' + this.price(price_type.pivot.price))
            })

            return partes.join(' · ')
        },
	}
}