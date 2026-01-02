<template>
<b-modal
title="Errores de Factura"
v-if="afip_ticket"
hide-footer
id="afip-ticket-errors">
	<div
	v-for="error in afip_ticket.afip_errors">
		<p>
			Punto de venta: {{ afip_information }}
		</p>
		<p>
			Tipo comprobante: {{ afip_tipo_comprobante }}
		</p>

		<p
		class="since">
			{{ date(error.created_at, true) }}
		</p>
		<p>
			Codigo: {{ error.code }}	
		</p>
		<p>
			<strong>
		 		{{ error.message }}
			</strong>
		</p>

		<p
		class="m-0">
			Request:
		</p>
		<b-form-textarea
		class="m-b-15"
		disabled
		rows="5"
		:value="error.request">
		</b-form-textarea>
		

		<p
		class="m-0">
			Response:
		</p>
		<b-form-textarea
		disabled
		rows="5"
		:value="error.response">
		</b-form-textarea>
		<hr>
	</div>
</b-modal>
</template>
<script>
export default {
	computed: {
		afip_ticket() {
			return this.$store.state.afip_ticket.model
		},
		afip_information() {
			let model = this.$store.state.afip_information.models.find(m => m.id == this.afip_ticket.afip_information_id)
			if (model) {
				return model.punto_venta
			}
			return null
		},
		afip_tipo_comprobante() {
			let model = this.$store.state.afip_tipo_comprobante.models.find(m => m.id == this.afip_ticket.afip_tipo_comprobante_id)
			if (model) {
				return model.name
			}
			return null
		},
	}
}
</script>