<template>
<b-modal
title="Errores de Factura"
hide-footer
id="afip-ticket-errors">
	<div
	v-for="error in sale.afip_errors">
		<p
		class="since">
			{{ date(error.created_at) }}
		</p>
		<p>
			Codigo: {{ error.code }}	
		</p>
		<p>
			<strong>
		 		{{ error.message }}
			</strong>
		</p>
		<hr>
	</div>
</b-modal>
</template>
<script>
export default {
	computed: {
		sale() {
			return this.$store.state.sale.model
		}
	}
}
</script>