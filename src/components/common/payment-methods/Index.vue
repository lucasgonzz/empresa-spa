<template>
    <div class="metodos-de-pago">

        <!--
            Barra de contexto: dice sobre QUE sucursal y sobre QUE moneda se estan ofreciendo las
            cajas de mas abajo. Antes las dos cosas eran invisibles y la lista de cajas parecia
            arbitraria: la moneda salia de la cuenta corriente o del gasto sin que se viera en
            ningun lado, y la sucursal salia de Vender sin poder cambiarse.
        -->
        <div
        v-if="show_sucursal_select || moneda_label"
        class="metodos-de-pago__contexto">

            <b-form-group
            v-if="show_sucursal_select"
            class="metodos-de-pago__contexto-campo"
            label="Sucursal">
                <b-form-select
                data-testid="metodos-de-pago-sucursal"
                :value="effective_address_id"
                :options="address_options"
                @change="set_address_id_local"
                ></b-form-select>
            </b-form-group>

            <div
            v-if="moneda_label"
            class="metodos-de-pago__moneda-chip"
            :class="{ 'metodos-de-pago__moneda-chip--usd': moneda_es_extranjera }"
            data-testid="metodos-de-pago-moneda">
                <!-- `icon-dolar`, con una sola L: es el nombre real del glifo en sass/fonts. -->
                <span class="metodos-de-pago__moneda-icono">
                    <i class="icon-dolar"></i>
                </span>
                <span>
                    <label>Moneda del comprobante</label>
                    <span class="metodos-de-pago__moneda-valor">{{ moneda_label }}</span>
                </span>
            </div>

            <p class="metodos-de-pago__ayuda">
                {{ texto_de_ayuda }}
            </p>
        </div>

        <payment-methods-step
            :payment_methods="payment_methods_proxy"
            :payment_method_options="__payment_method_options"
            :total_a_repartir="total_a_repartir"
            :base_moneda="base_moneda"
            :address_id="effective_address_id"
            :sobrante_a_repartir="sobrante_a_repartir"
            @add="add_payment_method"
            @remove="remove_payment_method"

            @update_amount="update_amount"
            @update_payment_method_id="update_payment_method_id"
            @update_moneda_id="update_moneda_id"
            @update_cotizacion="update_cotizacion"
            @update_amount_cotizado="update_amount_cotizado"
            @update_caja_id="update_caja_id"

            @update_payment_method_field="update_payment_method_field"
        >
            <template v-slot:details="{ payment_method }">
                <slot name="details" :payment_method="payment_method"></slot>
            </template>
        </payment-methods-step>

        <!-- Mensajes ayuda -->
        <div v-if="show_decimal_help" class="metodos-de-pago__decimales">
            <p>Para indicar decimales utilice un . (punto).</p>
            <p>Ejemplo: Para "1500 con 25", coloque 1500.25</p>
            <p>No coloque 1500,25 ni 1.500,25</p>
        </div>
    </div>
</template>

<script>
import PaymentMethodsStep from '@/components/common/payment-methods/PaymentMethodsStep'

export default {
    name: 'MultiPaymentMethods',
    components: {
        PaymentMethodsStep,
    },
    props: {
        value: {
            type: Array,
            required: true,
        },
        total_a_repartir: {
            type: Number,
            default: null
        },
        total_repartido: {
            type: Number,
            default: null
        },
        sobrante_a_repartir: {
            type: Number,
            default: null
        },
        show_decimal_help: {
            type: Boolean,
            default: true,
        },
        payment_method_factory: {
            type: Function,
            required: true,
        },
        payment_method_options: {
            type: Array,
            default: () => []
        },



        // NUEVO
        base_moneda: {
            type: Number,
            required: true,
        },
        show_cash_box: {
            type: Boolean,
            default: true,
        },
        // desacoplado: el padre decide la compatibilidad caja/moneda
        validate_cash_box_moneda: {
            type: Function,
            default: null,
        },


        address_id: {
            type: Number,
            default: null
        },
        /**
         * Si se informa, al abrirse ese `b-modal` (id) se vuelve a aplicar el factory
         * sobre las filas ya cargadas (cotización, moneda base, etc.) sin perder montos.
         */
        parent_modal_id: {
            type: String,
            default: null,
        },
    },
    computed: {
        __payment_method_options() {
            if (this.payment_method_options.length) {
                return this.payment_method_options
            }
            return this.$store.state.current_acount_payment_method.models
        },

        /**
         * Sucursales del comercio.
         *
         * @returns {Array}
         */
        addresses() {
            return this.$store.state.address.models
        },
        /**
         * El select de sucursal solo tiene sentido si hay sucursales cargadas. Mismo criterio que
         * el selector de sucursal de Vender (vender/.../payment-method-afip-information/Address.vue).
         *
         * @returns {boolean}
         */
        show_sucursal_select() {
            return this.addresses.length >= 1
        },
        address_options() {
            let options = [{
                value: null,
                text: 'Todas las sucursales',
            }]
            this.addresses.forEach(address => {
                options.push({
                    value: address.id,
                    text: address.street,
                })
            })
            return options
        },
        /**
         * Sucursal con la que se filtran las cajas de ESTE modal.
         *
         * Arranca en la que viene por prop --la de Vender, via cookie o via store-- y la pisa la
         * que el usuario elija acá. `address_id_local` es `undefined` mientras nadie tocó el
         * select, y puede ser `null` a proposito: `null` significa "todas las sucursales", que es
         * un valor valido y distinto de "no elegi nada todavia".
         *
         * 🔴 Esto NO escribe la cookie `address_id` ni `vender/setAddressId`, y es el punto del
         * pedido: cambiar la sucursal acá no puede mover la de Vender, que define el deposito de
         * stock de la venta en curso.
         *
         * @returns {number|null}
         */
        effective_address_id() {
            if (typeof this.address_id_local !== 'undefined') {
                return this.address_id_local
            }
            /*
             * El 0 se normaliza a null --"todas las sucursales"--. `vender.address_id` nace en 0
             * (store/vender/vender.js) y ahi se queda cuando el usuario no tiene `user.address_id`
             * ni cookie, y la cookie tambien puede valer "0". Ninguna opcion del select vale 0, asi
             * que sin esto el desplegable se dibuja VACIO: ni el nombre de una sucursal ni "Todas".
             */
            if (!this.address_id) {
                return null
            }
            return this.address_id
        },
        /**
         * El texto de ayuda no puede afirmar que se filtra por sucursal cuando se eligio "Todas",
         * ni prometer una sola moneda cuando la extension de dolares deja elegir otra por fila.
         *
         * @returns {string}
         */
        texto_de_ayuda() {
            let partes = []

            if (this.effective_address_id) {
                partes.push('Se ofrecen las cajas abiertas de esta sucursal')
            } else {
                partes.push('Se ofrecen las cajas abiertas de todas las sucursales')
            }

            if (this.hasExtencion('ventas_en_dolares')) {
                partes.push('en la moneda de cada método de pago')
            } else if (this.moneda_label) {
                partes.push('en ' + this.moneda_label.toLowerCase())
            }

            let texto = partes.join(', ') + '.'

            if (this.show_sucursal_select) {
                texto += ' Cambiar la sucursal acá no modifica la de Vender.'
            }

            return texto
        },
        /**
         * Nombre de la moneda por la que se filtran las cajas: la del comprobante que abrio el
         * modal (la cuenta corriente, el gasto, la venta o el ledger de comisiones).
         *
         * El catalogo de monedas es un __base_store y puede no estar cargado todavia, asi que hay
         * un respaldo para los dos ids que el resto del sistema ya trata como constantes (1 pesos,
         * 2 dolares: ver `caja.moneda_id == 2` en get_caja_options y `moneda_id === 1` en
         * check_moneda de PaymentMethodsStep).
         *
         * @returns {string}
         */
        moneda_label() {
            let moneda_id = Number(this.base_moneda) || 0
            if (!moneda_id) {
                return ''
            }

            let moneda = this.$store.state.moneda.models.find(m => Number(m.id) === moneda_id)
            if (typeof moneda !== 'undefined') {
                return moneda.name
            }

            if (moneda_id === 1) {
                return 'Pesos'
            }
            if (moneda_id === 2) {
                return 'Dólares'
            }
            return ''
        },
        /**
         * @returns {boolean} true si la moneda del comprobante no es la local (para el acento del chip).
         */
        moneda_es_extranjera() {
            return Number(this.base_moneda) === 2
        },


        // Fuente de verdad: el padre.
        payment_methods_proxy: {
            get() {
                return this.payment_methods_local
            },
            set(new_value) {
                this.is_emitting_update = true
                this.payment_methods_local = new_value


                this.$emit('input', new_value)

                this.$nextTick(() => {
                    this.is_emitting_update = false
                })
            },
        },
        /**
         * Cotización del dólar del comercio (owner), según la sesión actual en Vuex.
         * Cuando el owner la actualiza y otros usuarios reciben el refresh de usuario, esto cambia
         * y se vuelve a aplicar el factory sobre las filas de pago abiertas.
         *
         * @returns {number|null}
         */
        owner_dollar_reference() {
            const auth_user = this.$store.state.auth.user
            if (!auth_user) {
                return null
            }
            if (auth_user.owner_id && auth_user.owner) {
                const d = auth_user.owner.dollar
                return d === null || typeof d === 'undefined' ? null : Number(d)
            }
            const d = auth_user.dollar
            return d === null || typeof d === 'undefined' ? null : Number(d)
        },
    },
    data() {
        return {
            payment_methods_local: [],
            is_emitting_update: false,
            /*
             * `undefined` = nadie toco el select todavia, mandan la prop (la sucursal de Vender).
             * Un numero = la sucursal elegida acá. `null` = "todas las sucursales", que es una
             * eleccion valida y por eso no puede ser el valor inicial.
             */
            address_id_local: undefined,
        }
    },
    watch: {
        value: {
            immediate: true,
            handler(new_value) {
                if (this.is_emitting_update) return
                    
                this.payment_methods_local = Array.isArray(new_value) ? new_value : []
            }
        },
        /**
         * Si el owner cambia el dólar (p. ej. vía broadcast + refresh de sesión), las filas ya montadas
         * seguían mostrando `cotizacion` vieja en PaymentMethodsStep: se re-mergea con el factory del padre.
         *
         * @param {number|null} new_val Nuevo valor de cotización de referencia.
         * @param {number|null} old_val Valor anterior.
         * @returns {void}
         */
        owner_dollar_reference(new_val, old_val) {
            if (old_val === null || typeof old_val === 'undefined') {
                return
            }
            if (new_val === null || typeof new_val === 'undefined') {
                return
            }
            if (Number(new_val) === Number(old_val)) {
                return
            }
            if (!this.payment_methods_proxy || !this.payment_methods_proxy.length) {
                return
            }
            this.refresh_loaded_rows_with_factory()
        },
    },
    mounted() {
        // Si viene vacío (vender), igual mostramos 1 fila lista para usar.
        if (!this.payment_methods_proxy || !this.payment_methods_proxy.length) {
            this.payment_methods_proxy = [this.build_row()]
        }
        this.register_parent_modal_refresh_listener()
    },
    beforeDestroy() {
        this.unregister_parent_modal_refresh_listener()
    },
    methods: {
        /**
         * Escucha la apertura del modal padre para refrescar defaults del factory (dólar, moneda, etc.).
         *
         * @returns {void}
         */
        register_parent_modal_refresh_listener() {
            if (!this.parent_modal_id) {
                return
            }
            const self = this
            this._on_parent_modal_shown = function (bvEvent, modal_id) {
                if (modal_id !== self.parent_modal_id) {
                    return
                }
                /*
                 * La sucursal elegida a mano vale para ESA carga y nada mas: al volver a abrir el
                 * modal se arranca de nuevo en la de Vender. Si se conservara, el usuario que
                 * cambio de sucursal una vez seguiria viendo las cajas de la otra sin acordarse.
                 */
                self.address_id_local = undefined
                self.refresh_loaded_rows_with_factory()
            }
            this.$root.$on('bv::modal::shown', this._on_parent_modal_shown)
        },
        /**
         * @returns {void}
         */
        unregister_parent_modal_refresh_listener() {
            if (this._on_parent_modal_shown) {
                this.$root.$off('bv::modal::shown', this._on_parent_modal_shown)
                this._on_parent_modal_shown = null
            }
        },
        /**
         * Reaplica `payment_method_factory()` sobre cada fila existente: actualiza cotización/moneda
         * (y `__row_id` si el factory lo define) manteniendo montos y demás campos del usuario.
         *
         * @returns {void}
         */
        refresh_loaded_rows_with_factory() {
            const rows = this.payment_methods_proxy
            if (!Array.isArray(rows) || !rows.length) {
                this.payment_methods_proxy = [this.build_row()]
                this.$nextTick(() => {
                    this.$emit('changed', this.payment_methods_proxy)
                })
                return
            }
            const next = []
            for (let i = 0; i < rows.length; i++) {
                next.push(this.merge_payment_method_with_factory_defaults(rows[i]))
            }
            this.payment_methods_proxy = next
            this.$nextTick(() => {
                this.$emit('changed', next)
            })
        },
        /**
         * @param {Object} old_row Fila actual del v-model.
         * @returns {Object} Fila fusionada con defaults vigentes del factory.
         */
        merge_payment_method_with_factory_defaults(old_row) {
            const fresh = this.build_row()
            const patch = {
                moneda_id: fresh.moneda_id,
                cotizacion: fresh.cotizacion,
            }
            /*
             * El __row_id de una fila que YA existe no se pisa: es su identidad para el :key del
             * v-for, y cambiarlo hace que Vue destruya y vuelva a crear la fila entera. Este merge
             * corre tambien cuando el owner cambia la cotizacion del dolar mientras alguien esta
             * cargando el pago (watcher de owner_dollar_reference), asi que remontar seria sacarle
             * el foco del input que esta tipeando.
             *
             * Solo se toma el del factory cuando la fila no tenia ninguno, para que las filas
             * viejas tambien terminen con identidad propia.
             */
            if (!old_row.__row_id && Object.prototype.hasOwnProperty.call(fresh, '__row_id')) {
                patch.__row_id = fresh.__row_id
            }
            return Object.assign({}, old_row, patch)
        },

        update_payment_method_field(index, key, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])

            pm[key] = value

            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$nextTick(() => this.$emit('changed', next))
        },
        
        /**
         * Sucursal elegida en el modal. Solo toca el estado local: ver la nota de
         * `effective_address_id`.
         *
         * @param {number|null} value Id de la sucursal, o null para "todas".
         * @returns {void}
         */
        set_address_id_local(value) {
            if (value === null || value === '' || typeof value === 'undefined') {
                this.address_id_local = null
                return
            }
            this.address_id_local = Number(value)
        },

        add_payment_method() {
            let next = this.payment_methods_proxy.slice()

            /*
             * La fila que se AGREGA nace en blanco, no en Efectivo.
             *
             * Los cuatro factories del sistema devuelven current_acount_payment_method_id: 3
             * (Efectivo), que es lo correcto para la PRIMERA fila --el modal se abre listo para
             * usar--, pero no para la segunda: quien reparte un pago entre dos metodos casi nunca
             * usa el mismo dos veces, y una fila precargada se confirma sin querer. Pedido de Lucas
             * el 4/9/2026.
             *
             * Se pisa acá y no en cada factory a proposito: es UN solo lugar y les llega a las
             * cuatro pantallas que montan este bloque. Y se pisa solo en `add`: el `mounted()` y el
             * `remove_payment_method()` que vuelve a dejar una sola fila siguen usando el factory
             * tal cual, asi que la primera fila conserva su default.
             *
             * La caja tambien se limpia: sin metodo elegido no hay caja por defecto que valga.
             */
            let fila = Object.assign({}, this.build_row(), {
                current_acount_payment_method_id: 0,
                caja_id: 0,
            })

            next.push(fila)
            this.payment_methods_proxy = next
        },

        /**
         * Fila nueva a partir del factory del padre, garantizando que tenga `__row_id`.
         *
         * 🔴 El `__row_id` es la identidad de la fila para el `:key` del v-for de
         * PaymentMethodsStep. Sin el, TODAS las filas se renderizan con key `undefined` y caen al
         * indice: al agregar la segunda, Vue 2 reutiliza los nodos entre filas y los selects
         * --metodo, moneda y sobre todo CAJA-- se mezclan. El usuario elige una caja y se guarda
         * otra. Reportado el 21/8/2026 sobre una cuenta corriente en dolares.
         *
         * Se resolvio entonces agregando el `__row_id` a DOS de los cuatro factories (Vender y
         * cuenta corriente); los de gasto y comisiones de vendedor quedaron sin el. Se completa
         * acá, en el unico lugar por donde pasan las filas nuevas de las cuatro pantallas, en vez
         * de repetir el mismo campo en cada factory. Importa mas que antes: con la fila nueva en
         * blanco se agrega una segunda fila mucho mas seguido.
         *
         * @returns {Object}
         */
        build_row() {
            let fila = this.payment_method_factory()

            if (!fila.__row_id) {
                fila.__row_id = Date.now() + '_' + Math.random().toString(16).slice(2)
            }

            return fila
        },
        remove_payment_method(index) {
            let next = this.payment_methods_proxy.slice()
            next.splice(index, 1)
            if (!next.length) {
                next.push(this.build_row())
            }
            this.payment_methods_proxy = next
        },

        // Actualizaciones baratas (sin deep clone)
        update_amount(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.amount = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_payment_method_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.current_acount_payment_method_id = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },

        to_number(value) {
            if (value === '' || value === null || typeof value === 'undefined') {
                return 0
            }
            return Number(value) || 0
        },
        format_number(value) {
            return Number(value || 0).toFixed(2)
        },



        // NUEVO
        update_moneda_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])

            pm.moneda_id = value

            // si vuelve a base_moneda, reseteo cotizacion
            // if (pm.moneda_id === this.base_moneda) {
            //     pm.cotizacion = 1
            // } else {
            //     // si no hay, lo dejamos editable (el padre puede setearlo)
            //     if (pm.cotizacion === null || typeof pm.cotizacion === 'undefined' || pm.cotizacion === '') {
            //         pm.cotizacion = ''
            //     }
            // }

            // si la caja deja de ser válida, el padre decide. Igual, podemos limpiarla acá si hay validador:
            // if (this.validate_cash_box_moneda && pm.caja_id) {
            //     let ok = this.validate_cash_box_moneda(pm.caja_id, pm.moneda_id)
            //     if (!ok) {
            //         pm.caja_id = null
            //     }
            // }


            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:moneda_id', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_cotizacion(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.cotizacion = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:cotizacion', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_amount_cotizado(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.amount_cotizado = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:amount_cotizado', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_caja_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.caja_id = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:caja_id', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
    }
}
</script>