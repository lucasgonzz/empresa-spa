<template>
	<div
	class="w-100">

	<b-input-group
	prepend="Factura">

		<b-form-select
		v-if="show"
		:class="facturando ? 'verde' : 'rojo'"
		v-model="afip_information_id" 
		@change="change"
		id="afip_information_id"
		:options="options"></b-form-select> 
	</b-input-group>
	</div>
</template>
<script>
import vender from '@/mixins/vender'
import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'
export default {
	mixins: [vender, set_afip_tipo_comprobante],
	methods: {
		change() {
			this.setTotal()

			this.set_afip_tipo_comprobante()
		}, 
	},
	computed: {
		afip_information_id: {
			get() {
				return this.$store.state.vender.afip_information_id 
			},
			set(value) {
				this.$store.commit('vender/setAfipInformationId', value) 
			}
		},
		show() {
			if (this.index_previus_sales > 0 || this.guardar_como_presupuesto) {
				return false
			}
			return true
		},
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
	background: #333 !important
	color: #FFF !important
	font-weight: bold !important
	
.verde 
	background: $green !important
	color: #FFF !important
	font-weight: bold !important
</style>
