<template>
<div
v-if="user.afip_information.iva_condition.name == 'Responsable Inscripto'"
class="s">
	<b-list-group
	v-if="!loading">
		<b-list-group-item>
			Importe gravado 
			<span 
			class="float-right">
				{{ price(importes.gravado) }}
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe iva
			<span 
			class="float-right">
				{{ price(importes.iva) }}
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe total
			<span 
			class="float-right">
				{{ price(importes.total) }}
			</span>
		</b-list-group-item>
	</b-list-group>
	<b-list-group
	v-else>
		<b-list-group-item>
			Importe gravado 
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe iva
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
		<b-list-group-item>
			Importe total
			<span 
			class="float-right">
				<b-skeleton width="100px"></b-skeleton>
			</span>
		</b-list-group-item>
	</b-list-group>
</div>
</template>
<script>
export default {
	computed: {
		importes() {
			return this.$store.state.sale.afip.importes
		},
		loading() {
			return this.$store.state.sale.afip.loading
		},
	},
}
</script>