<template>
	<b-input-group
	v-if="hasExtencion('indicar_vendedor_en_vender')"
	prepend="Vendedor">
		<b-form-select
		v-model="seller_id"
		:options="getOptions({key: 'seller_id', text: 'Vendedor'})"></b-form-select>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		seller_id: {
			get() {
				return this.$store.state.vender.seller_id 
			},
			set(value) {
				this.$store.commit('vender/setSellerId', value)
			}
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
