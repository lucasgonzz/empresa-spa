<template>
	<div>
		<b-form-select
		:disabled="index_previus_sales > 0"
		:class="facturando ? 'verde' : 'rojo'"
		v-model="afip_information_id" 
		@change="change"
		:options="options"></b-form-select> 
	</div>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	methods: {
		change() {
			this.setTotal()

			if (this.afip_information_id) {

				this.afip_tipo_comprobante_id = 2 
			} else {

				this.afip_tipo_comprobante_id = 0 
			}
		},
	},
	computed: {
		facturando() {
			return this.afip_information_id != 0
		},
		options() {
			let options = [
				{
					value: 0,
					text: 'Seleccione Punto de Venta'
				}
			]
			let text 
			this.afip_information_filtered.forEach(afip_information => {
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
		afip_information_filtered() {
			if (this.address_id == 0) {
				return this.afip_informations
			} else {
				return this.afip_informations.filter(afip_information => {
					return !afip_information.address_id || afip_information.address_id == this.address_id 
				})
			}
		},
		afip_informations() {
			return this.$store.state.afip_information.models 
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.rojo 
	background: $red !important
	color: #FFF !important
	font-weight: bold !important
.verde 
	background: $green !important
	color: #FFF !important
	font-weight: bold !important
</style>
