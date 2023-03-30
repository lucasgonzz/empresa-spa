<template>
	<div>
		<b-form-group
		description="Seleccione un proveedor para asignarle a TODOS los articulos que importe. Deje en blanco para que no surta efecto"
		label="Proveedor de estos articulos">
			<b-form-select
			v-model="props_to_send.provider_id"
			:options="getOptions({key: 'provider_id', text: 'Proveedor'})"></b-form-select>
		</b-form-group>
		<hr>
	</div>
</template>
<script>
export default {
	props: {
		props_to_send: Object,
	},
}
</script>
<style lang="sass">
.cont-inputs
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: center
	// padding: .5em 0
	input 
		width: 100px
</style>