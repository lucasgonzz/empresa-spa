<template>
	<div
	class="input-group">
		<select-afip-information></select-afip-information>
		
		<select-afip-tipo-comprobante></select-afip-tipo-comprobante>

		<select-incoterms
		@set_selected="set_incoterms"
		v-if="afip_tipo_comprobante_id == 8"></select-incoterms>

		<b-input-group
		prepend="Forma de Pago"
		v-if="afip_tipo_comprobante_id == 8">
			<b-form-input
			v-model="forma_de_pago"></b-form-input>
		</b-input-group>

		<b-form-checkbox
		v-if="afip_tipo_comprobante_id == 8"
		value="S"
		unchecked-value="N"
		v-model="permiso_existente"
		class="ml-2 align-self-center">
			Permiso existente
		</b-form-checkbox>
	</div>
</template>
<script>
export default {
	components: {
		SelectAfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipInformation'),
		SelectAfipTipoComprobante: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipTipoComprobante'),
		SelectIncoterms: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectIncoterms'),
	},
	computed: {
		afip_tipo_comprobante_id() {
			return this.$store.state.vender.afip_tipo_comprobante_id
		},
		forma_de_pago: {
			get() {
				return this.$store.state.vender.forma_de_pago
			},
			set(value) {
				this.$store.commit('vender/set_forma_de_pago', value)
			},
		},
		permiso_existente: {
			get() {
				return this.$store.state.vender.permiso_existente
			},
			set(value) {
				this.$store.commit('vender/set_permiso_existente', value)
			},
		},
	},
	methods: {
		set_incoterms(incoterms) {
			console.log(incoterms)
			this.$store.commit('vender/set_incoterms', incoterms)
		}
	}
}
</script>
