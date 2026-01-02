<template>
<div>
    <b-modal
    hide-footer
    title="Confirmar"
    size="md"
    @hidden="quitar_seleccionable"
    id="confirm-make-afip-tickets">
    	<h5>
    		{{ text_confirm }}
    	</h5>

    	<hr>

    	<b-form-group
    	label="Seleccione el punto de venta desde el cual se van a emitir las facturas">
	    	<b-form-select
	    	:disabled="disabled"
	    	id="select_punto_de_venta"
	    	v-model="ventas_afip_information_id"
	    	@change="set_tipo_comprobante"
			:options="options"></b-form-select>
    	</b-form-group>

    	<b-form-group
    	label="Seleccione el tipo de comprobante">
	    	<b-form-select
	    	id="select_tipo_comprobante"
	    	v-model="afip_tipo_comprobante_id"
			:options="getOptions({key: 'afip_tipo_comprobante_id', text: 'Tipo Comprobante'})"></b-form-select>
    	</b-form-group>

    	<div
		v-if="afip_tipo_comprobante_id == 8">
    		
	    	<b-form-group
			class="m-b-15"
	    	label="Seleccione la condicion de venta">
				<select-incoterms
				@set_selected="set_incoterms"></select-incoterms>
	    	</b-form-group>
    		
	    	<b-form-group
			class="m-b-15"
	    	label="Forma de Pago">
				<b-form-input
				v-model="forma_de_pago"></b-form-input>
	    	</b-form-group>
    		
	    	<b-form-group
			class="m-b-15"
	    	label="Permiso existente">
				<b-form-checkbox
				value="S"
				unchecked-value="N"
				v-model="permiso_existente">
					Permiso existente
				</b-form-checkbox>
	    	</b-form-group>
    	</div>


    	
		<b-form-group
		v-if="afip_tipo_comprobante_id != 8"
    	label="Seleccione fecha del comprobante"
			description="Dejar en blanco para fecha actual"
			>
	    	<b-form-datepicker
	    	id="datepicker_fecha_comprobante"
				 :min="minDate()"
    		:max="maxDate()"
	    	v-model="afip_fecha_emision"
	 	/>
    	</b-form-group>

    	<b-form-group
    	v-if="selected_sales.length == 1 && afip_tipo_comprobante_id != 8"
    	:description="description_importe_a_facturar"
    	label="Monto a Facturar">
	    	<b-form-input
	    	placeholder="Monto a facturar"
	    	v-model="monto_a_facturar"></b-form-input>
    	</b-form-group>

    	<b-button
    	block 
    	variant="primary"
    	id="btn_enviar_a_facturar"
    	@click="emitir_facturas">
    		Emitir Facturas
    	</b-button>
    </b-modal>

</div>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'
export default {
	mixins: [afip_ticket, set_afip_tipo_comprobante],
	components: {
		SelectIncoterms: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectIncoterms'),
	},
	data() {
		return {
			afip_fecha_emision: null,
		}
	},
	computed: {
		disabled() {
			let addresses = this.$store.state.address.models 
			if (
				addresses.length > 0
				&& this.ventas_afip_information_id
			) {
				return true 
			}
			return false
		},
		description_importe_a_facturar() {
			let text = ''
			if (this.selected_sales.length == 1) {
				text = 'IMPORTANTE: Completar SOLO SI quiere facturar un importe distinto al importe original de la venta, en este caso, si lo deja en blanco se facturaran '+this.price(this.selected_sales[0].total)
			}
			return text
		},
		afip_information() {
			return this.$store.state.afip_information.models 
		},
		options() {
			let options = [
				{
					value: 0,
					text: 'Seleccione Punto de Venta'
				}
			]
			let text 
			this.afip_information.forEach(afip_information => {
				if (afip_information.description) {
					text = afip_information.description
				} else {
					text = afip_information.razon_social 	
				}
				options.push({
					value: afip_information.id, 
					text
				})
			})
			return options
		},
		selected_sales() {
			return this.$store.state.sale.selected
		},
		text_confirm() {
			return '¿Seguro que quiere emitir '+this.selected_sales.length+' facturas?'
		},
	},
	watch: {
		ventas_afip_information_id() {
			this.set_tipo_comprobante()
		}
	},
	methods: {
		set_incoterms(incoterms) {
			console.log(incoterms)
			this.$store.commit('afip_ticket/set_incoterms', incoterms)
		},
		minDate() {
			const today = new Date();
			const minDate = new Date(today);
    		minDate.setDate(minDate.getDate() - 5);
			return minDate.toISOString().split('T')[0]
		},
		maxDate() {
			const today = new Date();
			const maxDate = new Date(today);
    		maxDate.setDate(maxDate.getDate() + 5);
			return maxDate.toISOString().split('T')[0]
		},
		set_tipo_comprobante() {

			console.log('set_tipo_comprobante')

			if (this.selected_sales.length == 1) {

				let tipo_compobante_id = this.get_afip_tipo_comprobante(this.ventas_afip_information_id, this.selected_sales[0].client)

				this.afip_tipo_comprobante_id = tipo_compobante_id
			}

		},
		quitar_seleccionable() {
			this.$store.commit('sale/setIsSelecteable', false)
			this.$store.commit('sale/setSelected', [])
		},	
		async emitir_facturas() {
			if (this.check()) {
				
				this.enviar_afip_tickets()

			}
		},
		check() {
			if (this.ventas_afip_information_id == 0) {
				this.$toast.error('Seleccione un punto de venta')				
				return false
			}
			if (this.afip_tipo_comprobante_id == 0) {
				this.$toast.error('Seleccione un tipo de comprobante')				
				return false
			}
			return true
		},
	}
}
</script>	
<style lang="sass">
#make-afip-tickets
	.cont-sale-info
		display: flex 
		flex-direction: row 
		align-items: center
		justify-content: center
		.spinner-border 
			width: 20px !important
			height: 20px !important	
</style>