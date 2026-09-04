<template>
    <div>
        <div class="metodos-de-pago__lista">
            <div
                v-for="(payment_method, index) in payment_methods"
                :key="payment_method.__row_id || index"
                class="metodo-pago-card"
            >

                <div class="metodo-pago-card__header">
                    <span class="metodo-pago-card__badge">{{ index + 1 }}</span>
                    <h6 class="metodo-pago-card__titulo">Método de pago</h6>

                    <b-button
                        v-if="show_add_remove && index > 0"
                        class="metodo-pago-card__quitar"
                        :data-testid="'pago-quitar-'+index"
                        title="Quitar este método de pago"
                        @click="$emit('remove', index)"
                    >
                        <i class="icon-trash"></i>
                        Quitar
                    </b-button>
                </div>

                <div class="metodo-pago-card__grid">

                    <!-- METODO DE PAGO -->
                    <b-form-group
                    :class="{ 'metodo-pago-card__campo--ancho': !hasExtencion('ventas_en_dolares') }"
                    label="Metodo de pago">

                        <!--
                            Los tres controles de una fila de pago (metodo, monto, caja) llevan el
                            indice en el data-testid porque este bloque se repite: un pago puede
                            repartirse entre varios metodos ("Agregar metodo de pago"). El primero es
                            siempre el 0.
                        -->
                        <b-form-select
                            :data-testid="'pago-metodo-'+index"
                            :value="payment_method.current_acount_payment_method_id"
                            :options="payment_method_select_options"
                            @change="set_payment_method_id(payment_method, index, $event)"
                        ></b-form-select>

                    </b-form-group>


                    <!-- MONEDA -->
                    <b-form-group
                    v-if="hasExtencion('ventas_en_dolares')"
                    label="Moneda">
                        <b-form-select
                            :data-testid="'pago-moneda-'+index"
                            :value="payment_method.moneda_id"
                            :options="moneda_options"
                            @change="set_moneda_id(payment_method, index, $event)"
                        ></b-form-select>
                    </b-form-group>


                    <!--
                        COTIZACION. Ocupa las dos columnas para que el par monto/caja de abajo
                        quede junto en su propia fila: si midiera una columna, el monto subiria a
                        su lado y la caja quedaria sola.
                    -->
                    <b-form-group
                        v-if="payment_method.moneda_id && payment_method.moneda_id !== base_moneda"
                        class="metodo-pago-card__campo--ancho"
                        label="Cotización"
                    >
                        <b-form-input
                            :value="payment_method.cotizacion"
                            placeholder="Cotización"
                            inputmode="decimal"
                            @input="set_cotizacion(payment_method, index, $event)"
                        ></b-form-input>
                        <p class="metodo-pago-card__nota text-muted">
                            Cotizado: <strong>{{ price(payment_method.amount_cotizado) }}</strong>
                        </p>
                    </b-form-group>


                    <!--
                        MONTO y CAJA van a ancho completo, no en dos columnas.

                        El modal mide 500px (el ancho por defecto del sistema), asi que una columna
                        queda en ~212px. El texto de una opcion de caja lo arma get_caja_options()
                        concatenando nombre + (empleado) + (USD) + (sucursal): es el string mas largo
                        del sistema, y truncado deja al usuario sin saber a que caja le esta mandando
                        la plata. El monto comparte fila con el boton "Completar".

                        Asi la tarjeta se lee en el mismo orden en que se llena: con que se paga, en
                        que moneda, cuanto, y a que caja entra.
                    -->
                    <b-form-group
                    class="metodo-pago-card__campo--ancho"
                    label="Monto">

                        <div class="metodo-pago-card__monto">
                            <b-form-input
                                class="payment-method-amount"
                                :data-testid="'pago-monto-'+index"
                                :value="payment_method.amount"
                                placeholder="Monto"
                                inputmode="decimal"
                                @paste.prevent
                                @input="set_amount(payment_method, index, $event)"
                            ></b-form-input>

                            <b-button
                            size="sm"
                            :data-testid="'pago-completar-'+index"
                            v-if="total_a_repartir"
                            @click="completar(index)"
                            variant="outline-primary">
                                Completar
                            </b-button>
                        </div>

                        <p
                        class="metodo-pago-card__nota text-success"
                        v-if="payment_method.discount_amount">
                            Descuento: {{ price(payment_method.discount_amount) }}
                        </p>
                        <p
                        class="metodo-pago-card__nota text-danger"
                        v-if="payment_method.surchage_amount">
                            Recargo: {{ price(payment_method.surchage_amount) }}
                        </p>
                    </b-form-group>


                    <!-- CAJA -->
                    <b-form-group
                        v-if="show_caja_select(payment_method)"
                        class="metodo-pago-card__campo--ancho"
                        label="Caja"
                    >
                        <b-form-select
                            :data-testid="'pago-caja-'+index"
                            :value="payment_method.caja_id"
                            :options="get_caja_options(payment_method.current_acount_payment_method_id, address_id, resolve_payment_method_moneda_id(payment_method))"
                            @change="update_caja_id(index, $event, payment_method)"
                        ></b-form-select>

                        <small
                            v-if="cash_box_moneda_error(payment_method)"
                            class="text-danger"
                        >
                            La caja seleccionada no es compatible con la moneda elegida.
                        </small>
                    </b-form-group>


                    <div class="metodo-pago-card__campo--ancho">
                        <cuotas
                        @field_change="on_check_field_change(index, $event)"
                        :payment_method="payment_method"></cuotas>

                        <check-info
                        @field_change="on_check_field_change(index, $event)"
                        :payment_method="payment_method"></check-info>

                        <slot name="details" :payment_method="payment_method"></slot>
                    </div>

                </div>
            </div>
        </div>

        <b-button
            v-if="show_add_remove"
            class="metodos-de-pago__agregar"
            data-testid="btn-agregar-metodo-pago"
            @click="$emit('add')"
        >
            <i class="icon-plus"></i>
            Agregar método de pago
        </b-button>
    </div>
</template>

<script>
import caja_por_defecto from '@/mixins/caja_por_defecto'
export default {
    mixins: [caja_por_defecto],
    name: 'PaymentMethodsStep',
    components: {

        CheckInfo: () => import('@/components/common/payment-methods/CheckInfo'),
        Cuotas: () => import('@/components/common/payment-methods/Cuotas'),
    },
    props: {
        payment_methods: {
            type: Array,
            required: true,
        },
        payment_method_options: {
            type: Array,
            required: true,
        },
        show_add_remove: {
            type: Boolean,
            default: true,
        },
        total_a_repartir: Number,
        total_repartido: Number,
        sobrante_a_repartir: Number,

        // NUEVO
        base_moneda: {
            type: Number,
            required: true,
        },
        show_cash_box: {
            type: Boolean,
            default: true,
        },
        validate_cash_box_moneda: {
            type: Function,
            default: null,
        },
        address_id: Number,
    },
    computed: {
        payment_method_select_options() {
            let options = [{
                value: 0,
                text: 'Seleccione el método de pago',
            }]
            this.payment_method_options.forEach(item => {
                options.push({
                    value: item.id,
                    text: item.name,
                })
            })
            return options
        },
        moneda_options() {
            return this.get_options_simple('moneda')
        },
        cajas() {
            return this.$store.state.caja.models
        },
    },
    watch: {
        /**
         * La sucursal se puede cambiar desde el propio modal (select de MultiPaymentMethods), asi
         * que las cajas ofrecidas cambian con el modal ya abierto y con filas cargadas. Una caja
         * elegida para la sucursal anterior puede dejar de estar en la lista, y el select se
         * quedaria en blanco con el `caja_id` viejo todavia en el modelo: el pago se mandaria
         * contra una caja que el usuario ya no ve.
         *
         * @returns {void}
         */
        address_id() {
            this.revalidar_cajas_por_sucursal()
        },
    },
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (
                modalId == 'payment-method-modal'
                ||modalId == 'current-acounts-pago'
            ) {
                let payment_method = this.payment_methods[0]
                let moneda_id = this.resolve_payment_method_moneda_id(payment_method)
                this.set_caja_por_defecto(0, payment_method.current_acount_payment_method_id, moneda_id)
            }
        })
    },
    methods: {

        /**
         * Moneda efectiva del método de pago para filtrar cajas y validar compatibilidad.
         * Sin extensión ventas_en_dolares se usa la moneda base del comprobante (pesos por defecto).
         *
         * @param {Object} payment_method Fila de método de pago del formulario.
         * @returns {number}
         */
        resolve_payment_method_moneda_id(payment_method) {
            if (!this.hasExtencion('ventas_en_dolares')) {
                return Number(this.base_moneda) || 1
            }

            const moneda_id = Number(payment_method.moneda_id)
            if (!Number.isNaN(moneda_id) && moneda_id) {
                return moneda_id
            }

            return Number(this.base_moneda) || 0
        },

        /**
         * El select de caja se dibuja si hay cajas cargadas y el metodo no es el id 1 (cuenta
         * corriente, que no mueve caja). Estaba escrito dos veces --en el v-if de la caja y de
         * forma implicita en el ancho del monto--; acá es uno solo.
         *
         * @param {Object} payment_method Fila de método de pago del formulario.
         * @returns {boolean}
         */
        show_caja_select(payment_method) {
            if (!this.cajas.length) {
                return false
            }

            let method_id = Number(payment_method.current_acount_payment_method_id) || 0

            /*
             * Sin metodo elegido no se dibuja la caja. La fila que se agrega nace en blanco desde
             * el 4/9/2026, y ofrecerle un desplegable con TODAS las cajas antes de saber con que se
             * paga es al reves del orden en que se llena la fila. Ojo con "arreglar" esto mirando
             * get_caja_options: ese helper ignora por completo su primer argumento (el metodo), asi
             * que no filtra nada por si solo.
             */
            if (!method_id) {
                return false
            }

            // El metodo 1 es cuenta corriente: no mueve caja.
            return method_id !== 1
        },

        /**
         * Repasa las filas cargadas cuando cambia la sucursal del modal: si la caja elegida ya no
         * figura entre las opciones de la sucursal nueva, se resuelve la caja por defecto de esa
         * sucursal (y si no hay, queda en 0, que el select muestra como "Seleccione caja").
         *
         * La caja que el usuario eligio a mano y SIGUE siendo valida no se toca: una caja sin
         * sucursal asignada es valida en todas, y pisarla seria deshacerle la eleccion.
         *
         * @returns {void}
         */
        revalidar_cajas_por_sucursal() {
            if (!Array.isArray(this.payment_methods)) {
                return
            }

            this.payment_methods.forEach((payment_method, index) => {
                if (!payment_method) {
                    return
                }

                let method_id = Number(payment_method.current_acount_payment_method_id) || 0
                let moneda_id = this.resolve_payment_method_moneda_id(payment_method)
                let caja_id = Number(payment_method.caja_id) || 0

                if (caja_id) {
                    let opciones = this.get_caja_options(method_id, this.address_id, moneda_id)
                    let sigue_valida = opciones.some(opcion => Number(opcion.value) === caja_id)

                    if (sigue_valida) {
                        return
                    }
                }

                this.set_caja_por_defecto(index, method_id, moneda_id)
            })
        },

        on_check_field_change(index, payload) {
            // payload = { key, value }
            this.$emit('update_payment_method_field', index, payload.key, payload.value)
        },

        set_payment_method_id(row, index, new_value) {
            let method_id = Number(new_value) || 0

            this.$emit('update_payment_method_id', index, method_id)

            this.$nextTick(() => {
                let pm = this.payment_methods[index]
                if (!pm) {
                    return
                }
                let moneda_id = this.resolve_payment_method_moneda_id(pm)
                this.set_caja_por_defecto(index, method_id, moneda_id)
            })
        },

        set_moneda_id(row, index, new_value) {
            let moneda_id = Number(new_value) || 0

            this.$emit('update_moneda_id', index, moneda_id)

            this.$nextTick(() => {
                let pm = this.payment_methods[index]
                if (!pm) return

                let method_id = Number(pm.current_acount_payment_method_id) || 0

                // Caja por defecto en base al estado real post-update
                this.set_caja_por_defecto(index, method_id, Number(pm.moneda_id) || 0)

                // Recalcular cotizado si ya hay monto cargado
                let amount = Number(pm.amount) || 0
                if (amount > 0) {
                    this.check_moneda(pm, index, amount)
                }
            })
        },

        set_amount(row, index, new_value) {
            let amount = Number(new_value) || 0

            this.$emit('update_amount', index, Number(amount))

            this.$nextTick(() => {
                this.check_moneda(this.payment_methods[index], index, Number(amount))
            })
        },

        set_cotizacion(row, index, new_value) {
            let cotizacion = Number(new_value) || 0

            this.$emit('update_cotizacion', index, Number(cotizacion))

            this.$nextTick(() => {
                this.check_moneda(this.payment_methods[index], index, Number(this.payment_methods[index].amount))
            })
        },

        check_moneda(payment_method, index, amount) {


            if (payment_method.moneda_id != this.base_moneda) {
                let amount_cotizado = 0
                let cotizacion = Number(this.payment_methods[index].cotizacion)

                if (payment_method.moneda_id == 1) {
                    amount_cotizado = amount / cotizacion
                } else {
                    amount_cotizado = amount * cotizacion
                }
                this.$emit('update_amount_cotizado', index, amount_cotizado)
            }
        },



        /*
         * Acá vivia un `cajas_options()` que nadie llamaba y que no podia funcionar: usaba una
         * variable `payment_method` que no existe en su scope, asi que la primera llamada habria
         * tirado un ReferenceError. Se borro el 4/9/2026 con el rediseño del bloque. Las opciones
         * de caja las arma get_caja_options() del mixin global (mixins/generals.js), que es el que
         * usa el template.
         */

        set_caja_por_defecto(index, method_id, moneda_id) {

            let caja_por_defecto = this.get_caja_por_defecto(method_id, this.address_id, moneda_id)

            if (!caja_por_defecto) {
                this.$emit('update_caja_id', index, 0)
                return
            }

            /*
             * 🔴 La caja que propone el mixin NO siempre esta en el desplegable, y el propio mixin
             * lo documenta (mixins/caja_por_defecto.js, nota de las lineas 82-98). Los dos criterios
             * divergen: get_caja_options descarta las cajas CERRADAS, las de otra sucursal y las que
             * el usuario no tiene permitidas; el mixin devuelve igual la primera candidata de la
             * configuracion `default_payment_method_caja`, que solo mira metodo + sucursal de la
             * CONFIGURACION, no de la caja.
             *
             * El sintoma es el peor posible: el select se ve VACIO y el modelo se lleva un caja_id
             * que el usuario nunca vio, asi que el pago impacta en una caja que no eligio. Con el
             * select de sucursal nuevo eso pasa a estar a un clic de distancia, asi que se corta acá
             * --en el unico consumidor-- en vez de tocar el mixin, que tambien usa la VENTA.
             */
            let opciones = this.get_caja_options(method_id, this.address_id, moneda_id)
            let esta_en_la_lista = opciones.some(opcion => Number(opcion.value) === Number(caja_por_defecto.id))

            if (!esta_en_la_lista) {
                this.$emit('update_caja_id', index, 0)
                return
            }

            this.$emit('update_caja_id', index, Number(caja_por_defecto.id))
        },

        /**
         * Completa el monto de la fila con el sobrante pendiente de repartir.
         *
         * El sobrante siempre está expresado en moneda base (total del comprobante).
         * Si el método usa otra moneda, hay que convertir: el campo amount va en la
         * moneda del método y amount_cotizado en base (misma regla que check_moneda).
         *
         * @param {number} index Índice de la fila en payment_methods
         * @returns {void}
         */
        completar(index) {
            let pm = this.payment_methods[index]
            if (!pm) {
                return
            }

            let sobrante_en_base = Number(this.sobrante_a_repartir) || 0
            let moneda_base = Number(this.base_moneda) || 0
            let moneda_metodo = Number(pm.moneda_id) || 0

            // Misma moneda que el comprobante: el monto del método coincide con el sobrante en base
            if (!moneda_metodo || moneda_metodo === moneda_base) {
                this.$emit('update_amount', index, sobrante_en_base)
                this.$nextTick(() => {
                    if (!this.payment_methods[index]) {
                        return
                    }
                    // Evita que quede un amount_cotizado viejo de otra moneda y duplique el total repartido
                    this.$emit('update_amount_cotizado', index, 0)
                })
                return
            }

            let cotizacion = Number(pm.cotizacion) || 0
            if (cotizacion <= 0) {
                this.$toast.error('Ingresá la cotización para poder completar en esta moneda')
                return
            }

            // Inverso de check_moneda: amount_cotizado deseado = sobrante_en_base
            let amount_en_moneda_metodo = 0
            if (moneda_metodo === 1) {
                amount_en_moneda_metodo = sobrante_en_base * cotizacion
            } else {
                amount_en_moneda_metodo = sobrante_en_base / cotizacion
            }

            this.$emit('update_amount', index, amount_en_moneda_metodo)

            this.$nextTick(() => {
                let pm_actualizado = this.payment_methods[index]
                if (!pm_actualizado) {
                    return
                }
                this.check_moneda(pm_actualizado, index, amount_en_moneda_metodo)
            })
        },



        cash_box_moneda_error(payment_method) {
            if (!this.validate_cash_box_moneda) return false
            if (!payment_method.caja_id) return false

            let moneda_id = this.resolve_payment_method_moneda_id(payment_method)
            if (!moneda_id) return false

            return !this.validate_cash_box_moneda(payment_method.caja_id, moneda_id)
        },

        update_caja_id(index, value, payment_method) {
            let caja_id = value === null || value === '' ? null : Number(value)

            // Permitir "sin caja"
            if (!caja_id) {
                this.$emit('update_caja_id', index, null)
                return
            }

            let caja = this.cajas.find(c => Number(c.id) === Number(caja_id))
            if (!caja) {
                // Caja inexistente: no cambiamos nada
                this.$toast.error('Caja inválida')
                // fuerza que vuelva al valor anterior (opcional)
                this.$emit('update_caja_id', index, Number(payment_method.caja_id) || null)
                return
            }

            // Validación: moneda de caja vs moneda efectiva del método (pesos si no hay extensión dólares)
            let moneda_metodo = this.resolve_payment_method_moneda_id(payment_method)
            if (caja.moneda_id !== null && Number(caja.moneda_id) !== moneda_metodo) {
                this.$toast.error('La caja seleccionada debe ser de la misma moneda que este método de pago')

                // Fuerza a que el select vuelva al valor anterior (opcional, pero deja el UI perfecto)
                this.$emit('update_caja_id', index, Number(payment_method.caja_id) || null)
                return
            }

            // OK: actualizar
            this.$emit('update_caja_id', index, caja_id)
        }
    }
}
</script>
