<template>
	<b-form-select
	v-model="afip_information_id" 
	:options="options"></b-form-select> 
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
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
