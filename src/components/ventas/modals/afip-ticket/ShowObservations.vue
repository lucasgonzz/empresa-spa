<template>
<b-modal
title="Observaciones de Factura"
hide-footer
id="afip-ticket-observations">
	<div
	v-for="observation in sale.afip_observations">
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
		sale() {
			return this.$store.state.sale.model
		}
	}
}
</script>