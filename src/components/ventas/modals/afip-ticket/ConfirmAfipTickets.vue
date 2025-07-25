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
	    	id="select_punto_de_venta"
	    	v-model="afip_information_id"
			:options="options"></b-form-select>
    	</b-form-group>

    	<b-form-group
    	label="Seleccione el tipo de comprobante">
	    	<b-form-select
	    	id="select_tipo_comprobante"
	    	v-model="afip_tipo_comprobante_id"
			:options="getOptions({key: 'afip_tipo_comprobante_id', text: 'Tipo Comprobante'})"></b-form-select>
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
export default {
	mixins: [afip_ticket],
	computed: {
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
	methods: {
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
			if (this.afip_information_id == 0) {
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