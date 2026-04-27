<template>
<div>
    <b-modal
    id="modal-consolidar-facturacion"
    title="Consolidar ventas para facturar"
    size="lg"
    hide-footer
    @hidden="onHidden">

        <!-- Flujo búsqueda: filtros de cliente y fechas; oculto cuando viene de la grilla. -->
        <b-row
        v-if="!modo_desde_seleccion"
        class="m-b-15">
            <b-col cols="12" md="4">
                <b-form-group label="Cliente">
                    <!-- Selector de cliente reutilizando el store de clientes -->
                    <b-form-select
                    v-model="client_id"
                    :options="client_options"
                    @change="onClientChange">
                        <template #first>
                            <b-form-select-option :value="null" disabled>Seleccione un cliente</b-form-select-option>
                        </template>
                    </b-form-select>
                </b-form-group>
            </b-col>
            <b-col cols="12" md="3">
                <b-form-group label="Desde">
                    <b-form-datepicker
                    v-model="from_date"
                    :date-format-options="date_format_options"
                    placeholder="Sin límite" />
                </b-form-group>
            </b-col>
            <b-col cols="12" md="3">
                <b-form-group label="Hasta">
                    <b-form-datepicker
                    v-model="until_date"
                    :date-format-options="date_format_options"
                    placeholder="Sin límite" />
                </b-form-group>
            </b-col>
            <b-col cols="12" md="2" class="d-flex align-items-end">
                <b-button
                block
                variant="outline-primary"
                :disabled="!client_id || loading"
                @click="buscarVentas">
                    <b-spinner v-if="loading" small class="m-r-5" />
                    Buscar
                </b-button>
            </b-col>
        </b-row>

        <!-- Flujo grilla: resumen del cliente sin permitir cambiar criterio aquí. -->
        <b-alert
        v-if="modo_desde_seleccion && nombre_cliente_consolidacion"
        show
        variant="info"
        class="m-b-15">
            <strong>Cliente:</strong> {{ nombre_cliente_consolidacion }}
            <br>
            <span class="text-muted">Ventas tomadas de la selección múltiple. Podés desmarcar las que no quieras incluir.</span>
        </b-alert>

        <!-- Lista de ventas elegibles -->
        <div v-if="ventas_por_consolidar.length">

            <hr>

            <!-- Cabecera con selección masiva -->
            <div class="j-between align-center m-b-10">
                <strong>Ventas a incluir en la factura consolidada</strong>
                <div>
                    <b-button
                    size="sm"
                    variant="outline-secondary"
                    class="m-r-5"
                    @click="seleccionarTodas">
                        Seleccionar todas
                    </b-button>
                    <b-button
                    size="sm"
                    variant="outline-secondary"
                    @click="deseleccionarTodas">
                        Deseleccionar
                    </b-button>
                </div>
            </div>

            <!-- Tabla de ventas elegibles -->
            <b-table
            small
            hover
            :items="ventas_por_consolidar"
            :fields="tabla_campos"
            :tbody-tr-class="rowClass">
                <!-- Columna de selección -->
                <template #cell(seleccionada)="{ item }">
                    <b-form-checkbox
                    :checked="estaSeleccionada(item.id)"
                    @change="toggleSale(item.id)" />
                </template>
                <!-- Columna de número formateado -->
                <template #cell(num)="{ item }">
                    N° {{ item.num }}
                </template>
                <!-- Columna de fecha -->
                <template #cell(created_at)="{ item }">
                    {{ formatDate(item.created_at) }}
                </template>
                <!-- Columna de total -->
                <template #cell(total)="{ item }">
                    {{ price(item.total) }}
                </template>
            </b-table>

            <!-- Resumen del total seleccionado -->
            <div class="m-t-10 text-right">
                <strong>
                    Total seleccionado: {{ price(total_seleccionado) }}
                    ({{ sale_ids_seleccionados.length }} venta/s)
                </strong>
            </div>

            <hr>

            <!-- Parámetros AFIP para la factura consolidada -->
            <b-row>
                <b-col cols="12" md="6">
                    <b-form-group label="Punto de venta (AFIP)">
                        <b-form-select
                        v-model="afip_information_id"
                        :options="afip_information_options">
                            <template #first>
                                <b-form-select-option :value="null" disabled>Seleccione punto de venta</b-form-select-option>
                            </template>
                        </b-form-select>
                    </b-form-group>
                </b-col>
                <b-col cols="12" md="6">
                    <b-form-group label="Tipo de comprobante">
                        <b-form-select
                        v-model="afip_tipo_comprobante_id"
                        :options="tipo_comprobante_options">
                            <template #first>
                                <b-form-select-option :value="null" disabled>Seleccione tipo</b-form-select-option>
                            </template>
                        </b-form-select>
                    </b-form-group>
                </b-col>
                <b-col cols="12" md="6">
                    <b-form-group
                    label="Fecha del comprobante"
                    description="Dejar en blanco para fecha actual">
                        <b-form-datepicker
                        v-model="afip_fecha_emision"
                        :date-format-options="date_format_options" />
                    </b-form-group>
                </b-col>
                <b-col cols="12" md="6">
                    <b-form-group
                    label="Forma de pago"
                    description="Opcional">
                        <b-form-input
                        v-model="forma_de_pago"
                        placeholder="Ej: Contado" />
                    </b-form-group>
                </b-col>
                <b-col cols="12">
                    <b-form-checkbox
                    v-model="agrupar_items"
                    class="m-b-15">
                        Agrupar artículos iguales sumando cantidades
                    </b-form-checkbox>
                </b-col>
            </b-row>

            <!-- Alerta de error -->
            <b-alert
            v-if="error"
            show
            variant="danger"
            class="m-t-10">
                {{ error }}
            </b-alert>

            <!-- Botón de confirmación -->
            <b-button
            block
            variant="primary"
            :disabled="!puede_consolidar || loading"
            @click="consolidar">
                <b-spinner v-if="loading" small class="m-r-5" />
                Generar factura consolidada
            </b-button>
        </div>

        <!-- Estado vacío cuando no hay ventas elegibles -->
        <div
        v-else-if="!modo_desde_seleccion && busqueda_realizada && !loading"
        class="text-center m-t-20">
            <p class="text-muted">
                No hay ventas pendientes de facturar para este cliente en el período seleccionado.
            </p>
        </div>

    </b-modal>
</div>
</template>

<script>
import generals from '@/common-vue/mixins/generals'
export default {
    mixins: [generals],
    data() {
        return {
            /** Indica si ya se hizo al menos una búsqueda (para mostrar el mensaje vacío). */
            busqueda_realizada: false,

            /** Opciones de formato de fechas para los datepickers. */
            date_format_options: { year: 'numeric', month: '2-digit', day: '2-digit' },

            /** Definición de columnas para la tabla de ventas. */
            tabla_campos: [
                { key: 'seleccionada', label: '' },
                { key: 'num',          label: 'N° Venta' },
                { key: 'created_at',   label: 'Fecha' },
                { key: 'total',        label: 'Total' },
            ],
        }
    },

    computed: {
        /** Estado del submódulo de consolidación. */
        consolidar_state() {
            return this.$store.state.sale.consolidar_facturacion
        },

        /**
         * true: datos cargados desde la selección múltiple; no se muestran fechas / Buscar.
         */
        modo_desde_seleccion() {
            return this.consolidar_state.modo_desde_seleccion
        },

        /**
         * Nombre del cliente de la venta en consolidación (id ya está en el store).
         */
        nombre_cliente_consolidacion() {
            const cid = this.client_id
            if (!cid) {
                return ''
            }
            const c = this.$store.state.client.models.find(x => x.id == cid)
            return c ? c.name : `Cliente #${cid}`
        },

        client_id: {
            get() { return this.consolidar_state.client_id },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setClientId', v) },
        },
        from_date: {
            get() { return this.consolidar_state.from_date },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setFromDate', v) },
        },
        until_date: {
            get() { return this.consolidar_state.until_date },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setUntilDate', v) },
        },
        afip_information_id: {
            get() { return this.consolidar_state.afip_information_id },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setAfipInformationId', v) },
        },
        afip_tipo_comprobante_id: {
            get() { return this.consolidar_state.afip_tipo_comprobante_id },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setAfipTipoComprobanteId', v) },
        },
        afip_fecha_emision: {
            get() { return this.consolidar_state.afip_fecha_emision },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setAfipFechaEmision', v) },
        },
        forma_de_pago: {
            get() { return this.consolidar_state.forma_de_pago },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setFormaDePago', v) },
        },
        agrupar_items: {
            get() { return this.consolidar_state.agrupar_items },
            set(v) { this.$store.commit('sale/consolidar_facturacion/setAgruparItems', v) },
        },

        ventas_por_consolidar() {
            return this.consolidar_state.ventas_por_consolidar
        },
        sale_ids_seleccionados() {
            return this.consolidar_state.sale_ids_seleccionados
        },
        loading() {
            return this.consolidar_state.loading
        },
        error() {
            return this.consolidar_state.error
        },

        /** Total acumulado de las ventas seleccionadas. */
        total_seleccionado() {
            return this.$store.getters['sale/consolidar_facturacion/total_seleccionado']
        },

        /** Opciones para el selector de clientes. */
        client_options() {
            return this.$store.state.client.models.map(c => ({
                value: c.id,
                text: c.name,
            }))
        },

        /** Opciones para el selector de punto de venta AFIP. */
        afip_information_options() {
            return this.$store.state.afip_information.models.map(a => ({
                value: a.id,

                text: a.description ? a.description : a.razon_social, 
            }))
        },

        /** Opciones para el selector de tipo de comprobante. */
        tipo_comprobante_options() {
            return this.$store.state.afip_tipo_comprobante.models.map(t => ({
                value: t.id,
                text: `${t.codigo} - ${t.name}`,
            }))
        },

        /**
         * Habilita el botón de consolidar solo cuando hay selección mínima y datos AFIP completos.
         */
        puede_consolidar() {
            return (
                this.sale_ids_seleccionados.length > 0
                && this.afip_information_id
                && this.afip_tipo_comprobante_id
            )
        },
    },

    methods: {
        /**
         * Limpia búsqueda al cerrar el modal.
         */
        onHidden() {
            this.$store.commit('sale/consolidar_facturacion/cerrarModal')
            this.busqueda_realizada = false
        },

        /**
         * Al cambiar el cliente limpia la lista de ventas y la selección previa.
         */
        onClientChange() {
            this.$store.commit('sale/consolidar_facturacion/setVentasPorConsolidar', [])
            this.$store.commit('sale/consolidar_facturacion/deseleccionarTodas')
            this.busqueda_realizada = false
        },

        /**
         * Dispara la carga de ventas elegibles desde la API.
         */
        async buscarVentas() {
            this.busqueda_realizada = false
            await this.$store.dispatch('sale/consolidar_facturacion/cargarVentasPorConsolidar')
            this.busqueda_realizada = true
        },

        /**
         * Alterna la selección de una venta individual.
         * @param {number} sale_id
         */
        toggleSale(sale_id) {
            this.$store.commit('sale/consolidar_facturacion/toggleSaleSeleccionado', sale_id)
        },

        /**
         * Devuelve true si la venta con el id dado está seleccionada.
         * @param {number} sale_id
         * @returns {boolean}
         */
        estaSeleccionada(sale_id) {
            return this.sale_ids_seleccionados.includes(sale_id)
        },

        /**
         * Selecciona todas las ventas visibles.
         */
        seleccionarTodas() {
            this.$store.commit('sale/consolidar_facturacion/seleccionarTodas')
        },

        /**
         * Deselecciona todas las ventas.
         */
        deseleccionarTodas() {
            this.$store.commit('sale/consolidar_facturacion/deseleccionarTodas')
        },

        /**
         * Dispara la consolidación y emite evento al componente padre si tuvo éxito.
         */
        async consolidar() {
            const ok = await this.$store.dispatch('sale/consolidar_facturacion/consolidar')
            if (ok) {
                this.$bvModal.hide('modal-consolidar-facturacion')
                this.$bvToast.toast(
                    'Se generó la factura consolidada correctamente.',
                    { title: 'Factura consolidada', variant: 'success', solid: true }
                )
            }
        },

        /**
         * Clases de fila: resalta visualmente las ventas seleccionadas.
         * @param {Object} item
         * @returns {string}
         */
        rowClass(item) {
            return this.estaSeleccionada(item.id) ? 'table-primary' : ''
        },

        /**
         * Formatea una fecha ISO a dd/mm/yyyy para mostrar en la tabla.
         * @param {string} date_string
         * @returns {string}
         */
        formatDate(date_string) {
            if (!date_string) return '-'
            const d = new Date(date_string)
            return d.toLocaleDateString('es-AR')
        },

    },
}
</script>
