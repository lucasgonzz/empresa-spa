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
    	@click="makeAfipTicket">
    		Emitir Facturas
    	</b-button>
    </b-modal>

    <b-modal
    hide-footer
    title="Emitiendo facturas"
    size="md"
    id="make-afip-tickets">
    	<div 
    	v-for="afip_ticket in afip_tickets_for_make"
    	class="afip-ticket-for-make">
    		<div
    		class="cont-sale-info"
    		v-if="afip_ticket.sale">
	    		<i 
	    		v-if="afip_ticket.maked"
	    		class="icon-check text-success"></i>
	    		<b-spinner
	    		v-else
	    		variant="primary"></b-spinner>
	    		<span
	    		class="p-l-15">
	    			Venta N° {{ afip_ticket.sale.num }}
	    		</span>
	    		<strong
	    		class="p-l-5"
	    		v-if="afip_ticket.maked">| Factura emitida</strong>

	    		<strong
	    		class="p-l-5 text-danger"
	    		v-if="afip_ticket.errors">| Con errores</strong>
	    		<strong
	    		class="p-l-5 text-danger"
	    		v-if="afip_ticket.observations">| Con Observaciones</strong>
    		</div>
    	</div>
    </b-modal>
</div>
</template>
<script>
export default {
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
	},
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
	data() {
		return {
			afip_information_id: 0,
			afip_tipo_comprobante_id: 0,
			afip_tickets_for_make: [],
		}
	},
	methods: {
		quitar_seleccionable() {
			this.$store.commit('sale/setIsSelecteable', false)
			this.$store.commit('sale/setSelected', [])
		},	
		async makeAfipTicket() {
			if (this.check()) {
				this.afip_tickets_for_make = []
				this.setAfipTicketsForMake()

				this.$bvModal.show('make-afip-tickets')
				
				for (var i = 0; i < this.selected_sales.length; i++) {
					console.log('i: '+i)	
					try {
						let res = await this.send_request(i)
						console.log('i: '+i)
						console.log(res)
						console.log(i)
						console.log(this.selected_sales)
						console.log(this.selected_sales[i])

						console.log('se facturo sale_id: '+this.selected_sales[i].id)

						this.$store.commit('sale/add', res.data.sale)

						this.afip_tickets_for_make[i].maked = true

						if (res.data.sale.afip_errors.length) {
							this.afip_tickets_for_make[i].errors = true
						}
						if (res.data.sale.afip_observations.length) {
							this.afip_tickets_for_make[i].observations = true
						}

					} catch (err) {
						console.log('errror:')
						console.log(err)
					}
					
				}

				setTimeout(() => {

					this.$store.commit('sale/setIsSelecteable', 0)
					this.$store.commit('sale/setSelected', [])
					this.$bvModal.hide('confirm-make-afip-tickets')
					this.$bvModal.hide('sale')
				}, 2000)

			}
		},
		send_request(index) {
			console.log('send_request i: '+index)
			console.log('enviando sale_id: '+this.selected_sales[index].id)
			return this.$api.post('afip-ticket', {
				sale_id: this.selected_sales[index].id,
				afip_information_id: this.afip_information_id,
				afip_tipo_comprobante_id: this.afip_tipo_comprobante_id,
			})
			.catch(err => {
				this.$toast.error('Error al emitir factura para la venta N° '+this.selected_sales[index].num)
				this.afip_tickets_for_make[index].maked = false
			})
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
		setAfipTicketsForMake() {
			this.selected_sales.forEach(sale => {
				this.afip_tickets_for_make.push({
					sale: sale,
					maked: false,
					errors: false,
					observations: false,
				})
			})
			console.log('afip_tickets_for_make')
			console.log(this.afip_tickets_for_make)
		}
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