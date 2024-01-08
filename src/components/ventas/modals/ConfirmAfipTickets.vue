<template>
<div>
    <b-modal
    hide-footer
    title="Confirmar"
    size="md"
    id="confirm-make-afip-tickets">
    	<h5>
    		{{ text_confirm }}
    	</h5>

    	<hr>

    	<b-form-group
    	label="Seleccione el punto de venta desde el cual se van a emitir las facturas">
	    	<b-form-select
	    	v-model="afip_information_id"
			:options="getOptions({key: 'afip_information_id', text: 'Punto de Venta'})"></b-form-select>
    	</b-form-group>

    	<b-button
    	block 
    	variant="primary"
    	@click="makeAfipTicket">
    		Emitir Facturas
    	</b-button>
    </b-modal>

    <b-modal
    hide-footer
    title="Emitiendo facturas"
    size="sm"
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
			afip_tickets_for_make: [],
		}
	},
	methods: {
		async makeAfipTicket() {
			if (this.check()) {
				this.afip_tickets_for_make = []
				this.setAfipTicketsForMake()

				this.$bvModal.show('make-afip-tickets')
				
				for (var i = 0; i < this.selected_sales.length; i++) {
					console.log('enviando sale_id: '+this.selected_sales[i].id)
					let res = await this.$api.post('afip-ticket', {
						sale_id: this.selected_sales[i].id,
						afip_information_id: this.afip_information_id
					})
					console.log('se facturo sale_id: '+this.selected_sales[i].id)
					this.$store.commit('sale/add', res.data.sale)
					this.afip_tickets_for_make[i].maked = true
					// .catch(err => {
					// 	this.$toast.error('Error al emitir factura para la venta N° '+this.selected_sales[i].num)
					// 	this.afip_tickets_for_make = []
					// })
				}
			}
		},
		check() {
			if (this.afip_information_id == 0) {
				this.$toast.error('Seleccione un punto de venta')				
				return false
			}
			return true
		},
		setAfipTicketsForMake() {
			this.selected_sales.forEach(sale => {
				this.afip_tickets_for_make.push({
					sale: sale,
					maked: false,
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