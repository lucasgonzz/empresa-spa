<template>
<div
class="cc-lista">
    <!--
        La caja con radio, sombra y recorte se pone SOLO cuando hay movimientos. Cuando no los hay,
        lo que dibuja TableComponent es el estado vacio de mas abajo, y una tarjeta con sombra
        alrededor de un cartel que dice "no hay nada" es justo lo contrario de lo que ese cartel
        tiene que comunicar.
    -->
    <div
    :class="['cc-tabla-wrapper', {'cc-tabla-wrapper--con-datos': models.length}]">
        <table-component
        :loading="loading"
        :models="models"
        :properties="properties"
        :model_name="model_name"
        model_name_spanish="cuentas corrientes"
        id="table-current-acounts"
        :set_model_on_row_selected="false"
        :show_btn_edit="false"
        emit_selected_with_model_empty
        @showDetails="showDetails"
        @showPagadoPor="showPagadoPor"
        @onRowSelected="onRowSelected">

            <!--
                Estado vacio propio. El slot lo agrega TableComponent y su contenido por defecto es
                el de siempre ("No hay Cuentas corrientes" con el ojo tachado de 4em en azul), asi
                que las demas pantallas que usan esa tabla no cambian en nada.
                Aca se reemplaza por el mismo lenguaje que ya usan el estado vacio del modal de
                busqueda y el del campo de imagenes: circulo con el icono, titulo y detalle, en los
                grises del sistema en vez de un azul que grita mas que el resto del modal.
            -->
            <template v-slot:estado_vacio>
                <div class="cc-vacio">
                    <div class="cc-vacio__icono">
                        <i class="bi bi-journal-text"></i>
                    </div>
                    <p class="cc-vacio__titulo">
                        Sin movimientos
                    </p>
                    <p class="cc-vacio__detalle">
                        Todavía no hay movimientos registrados en esta cuenta corriente.
                    </p>
                </div>
            </template>

            <template v-slot:default="slotProps">

                <b-badge
                v-if="show_badge_facturado(slotProps.model)"
                variant="success">Facturado</b-badge>
                <b-badge
                v-if="show_badge_facturado_error(slotProps.model)"
                variant="danger">Factura sin cae</b-badge>

                <cerrar-venta
                v-if="slotProps.model.sale"
                :sale="slotProps.model.sale"></cerrar-venta>

                <b-badge
                v-if="slotProps.model.sale && slotProps.model.sale.en_acopio"
                variant="danger">Acopio</b-badge>

                <btn-payment-methods-info
                :model="slotProps.model"></btn-payment-methods-info>

                <b-button
                size="sm"
                v-if="canDelete(slotProps.model)"
                title="Eliminar este movimiento"
                @click="deleteCurrentAcount(slotProps.model)"
                variant="danger">
                    <i class="bi bi-trash"></i>
                </b-button>
            </template>
        </table-component>
    </div>
</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'

import current_acounts from '@/mixins/current_acounts' 
import print from '@/mixins/current_acounts/print' 
export default {
    mixins: [current_acounts, print],
    components: {
        TableComponent,
        BtnPaymentMethodsInfo: () => import('@/components/common/current-acounts/BtnPaymentMethodsInfo'),
        CerrarVenta: () => import('@/components/ventas/components/table-buttons/CerrarVenta'),
    },
    computed: {
        model_name() {
            return 'current_acount'
        },
        model_name_spanish() {
            return 'cuentas corrientes'
        },
        loading() {
            return this.$store.state[this.model_name].loading
        },
        to_show() {
            return this.$store.state[this.model_name].to_show
        },
        models() {
            return this.$store.state[this.model_name].models
        },
        properties() {
            return require(`@/models/${this.model_name}`).default.properties 
        },
    },
    methods: {
        show_badge_facturado(current_acount) {
            if (
                current_acount.sale 
                && current_acount.debe
                && current_acount.sale.afip_tickets.length
            ) {
                let sin_cae = current_acount.sale.afip_tickets.find(a => !a.cae)
                if (typeof sin_cae == 'undefined') {
                    return true 
                } 
                return false
            }

            if (
                current_acount.afip_ticket 
                && current_acount.status == 'nota_credito'
                && current_acount.afip_ticket.cae
            ) {
                return true
            }
            return false
        },
        show_badge_facturado_error(current_acount) {
            if (
                current_acount.sale 
                && current_acount.debe
                && current_acount.sale.afip_tickets.length
            ) {
                let sin_cae = current_acount.sale.afip_tickets.find(a => !a.cae)
                if (typeof sin_cae != 'undefined') {
                    return true 
                } 
            }

            if (
                current_acount.afip_ticket 
                && current_acount.status == 'nota_credito'
                && current_acount.afip_ticket.cae
            ) {
                return false
            }
            return false
        },
        showPaymentMethods(current_acount) {
            this.$store.commit('current_acount/setToShowPaymentMethods', current_acount)
            this.$bvModal.show('payment-methods-details')
        },
        canDelete(current_acount) {
            return current_acount.status == 'pago_from_client' 
                    || (
                        current_acount.status == 'nota_credito'
                        && !current_acount.afip_ticket
                        // && !current_acount.sale_id
                    ) 
                    || current_acount.detalle == 'Nota de debito' 
                    || current_acount.detalle == 'Saldo inicial'
        },
        deleteCurrentAcount(current_acount) {
            this.$store.commit('current_acount/setDelete', current_acount)
            this.$bvModal.show('delete-current-acount')
        },
        showButtonDebe(current_acount) {
            return current_acount.status != 'pago_from_client' && current_acount.status != 'nota_credito'
        },
        updateDebe(current_acount) {
            this.$store.commit('clients/current_acounts/setUpdateDebe', current_acount)
            this.$bvModal.show('update-debe')
        },
        showDetails(current_acount) {
            let model_name = null
            let model_id 
            if (current_acount.status == 'nota_credito' || current_acount.status == 'pago_from_client') {
                this.printPago(current_acount)
            } else if (current_acount.sale_id) {
                model_name = 'sale'
                model_id = current_acount.sale_id
            } else if (current_acount.budget_id) {
                model_name = 'budget'
                model_id = current_acount.budget_id
            } else if (current_acount.provider_order_id) {
                model_name = 'provider_order'
                model_id = current_acount.provider_order_id
            }
            if (model_name) {
                this.show_model(model_name, model_id)
            }
        },
        showPagadoPor(current_acount) {
            console.log(current_acount)
            if (current_acount.debe) {
                this.$store.commit('pagado_por/setDebeId', current_acount.id)
            } else {
                this.$store.commit('pagado_por/setHaberId', current_acount.id)
            }
            this.$store.dispatch('pagado_por/getModels', {model_name: this.from_model_name, model_id: this.from_model.id})
            this.$bvModal.show('pagado-por')
        },
        onRowSelected(current_acount) {
            if (!current_acount) {
                this.$store.commit('current_acount/setSelected', [])
            } else if (current_acount.sale_id) {
                this.$store.commit('current_acount/setSelected', [current_acount])
            } else if (current_acount.status == 'sin_pagar') {
                this.$store.commit('current_acount/setSelected', [current_acount])
            } 
        },
        getDetalleColorText(current_acount) {
            if (current_acount.status == 'pagandose') {
                return 'text-success'
            }
            if (current_acount.status == 'pagado') {
                return 'text-info'
            }
            if (current_acount.status.includes('nota_credito') || current_acount.status == 'pago') {
                return 'text-danger'
            }
        }
    }
}
</script>
<style lang="sass">
// ══════════════════════════════════════════════════════════════════════════════════════════════
// LA LISTA DE MOVIMIENTOS Y SU ESTADO VACIO (21/8/2026)
//
// El chasis de la tabla --radio, sombra, header oscuro, paddings, hover y fila seleccionada-- NO
// esta aca: vive en el <style> de Index.vue, anidado bajo `.cuenta-corriente-modal`. Tiene que ser
// asi porque esas reglas tienen que vencer a las de TableComponent.vue, que declara varios
// !important globales, y para eso necesitan la clase del modal sumando especificidad.
//
// Aca queda lo que es propio de esta lista: el aire alrededor de la tabla y el estado vacio.
//
// Sin `scoped`: el estado vacio se dibuja adentro de TableComponent, que es un componente hijo.
// ══════════════════════════════════════════════════════════════════════════════════════════════
.cc-lista
	padding: 16px 20px 20px

	// TableComponent envuelve todo en un `div.m-t-15`. Ese margen de arriba se suma al padding de
	// esta caja y deja la tabla despegada de la barra mas de lo que corresponde.
	> .cc-tabla-wrapper > div
		margin-top: 0 !important

	// ─── Estado vacio ────────────────────────────────────────────────────────────────────────
	// Reemplaza al `.text-with-icon` global (ojo tachado de 4em en azul claro, centrado): esa
	// clase la usan unas 30 pantallas y no se puede tocar desde aca, asi que el estado vacio se
	// dibuja entero por el slot. Mismo lenguaje que `.search-modal-estado` y que
	// `.images-field__vacio`: circulo con el icono, titulo y detalle, todo en los grises del
	// sistema.
	.cc-vacio
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 40px 16px
		background: var(--bg-section)
		border: 1px dashed var(--color-border)
		border-radius: 12px

	.cc-vacio__icono
		display: flex
		align-items: center
		justify-content: center
		width: 52px
		height: 52px
		border-radius: 50%
		background: var(--bg-card)
		color: var(--color-text-secondary)
		margin-bottom: 12px

		font-size: 1.35rem
		// Los iconos `icon-*` del sistema se dibujan con un ::before al que _generals.sass le
		// pone `top: .15em` y margenes laterales, pensado para un icono adentro de un parrafo.
		// En un boton flex el centrado lo da el contenedor, asi que se apaga. El reset va sobre
		// el ::before y no sobre el <i>: la regla global apunta al pseudoelemento, y sobre el <i>
		// no vencia nada. Los `bi bi-*` ni siquiera entran por ahi --el selector es
		// [class^='icon-'] y ellos empiezan con `bi`--, pero el resto de esta regla si los toca.
		i,
		i::before
			top: 0
			margin: 0
			line-height: 1

	.cc-vacio__titulo
		margin: 0
		font-size: 1rem
		font-weight: 600
		color: var(--color-text-primary)

	.cc-vacio__detalle
		margin: 6px 0 0
		max-width: 420px
		font-size: 0.85rem
		color: var(--color-text-secondary)
</style>
