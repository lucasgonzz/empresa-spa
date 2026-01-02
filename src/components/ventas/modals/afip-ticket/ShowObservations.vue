<template>
<b-modal
title="Observaciones de Factura"
hide-footer
v-if="afip_ticket"
id="afip-ticket-observations">
	<div
	v-for="observation in afip_ticket.afip_observations">
		<p
		class="since">
			{{ date(observation.created_at) }}
		</p>
		<p>
			Codigo: {{ observation.code }}	
		</p>
		<p>
			<strong>
		 		{{ observation.message }}
			</strong>
		</p>
		<hr>
	</div>
</b-modal>
</template>
<script>
export default {
	computed: {
		afip_ticket() {
			return this.$store.state.afip_ticket.model
		}
	}
}
</script>