<template>
	<b-form-select
	:options="options"
	@change="change"
	v-model="incoterms"></b-form-select>
</template>
<script>
export default {
	computed: {
		options() {
			return [

				{
					text: 'Condicion de venta',
					value: 0,
				},
				{
					text: 'Free on Board',
					value: 'FOB',
				},
				{
					text: 'Cost and Freight',
					value: 'CFR',
				},
				{
					text: 'Free Carrier',
					value: 'FCA',
				},
				{
					text: 'Free Alongside Ship',
					value: 'FAS',
				},
				
				{
					value: 'CIF',	
					text: 'Cost, Insurance and Freight',
				},
				
				{
					value: 'CPT',	
					text: 'Carriage Paid To',
				},
				
				{
					value: 'CIP',	
					text: 'Carriage and Insurance Paid To',
				},
				
				{
					value: 'DAF',	
					text: 'Delivered At Frontier',
				},
				
				{
					value: 'DES',	
					text: 'Delivered Ex Ship',
				},
				
				{
					value: 'DEQ',	
					text: 'Delivered Ex Quay',
				},
				
				{
					value: 'DDU',	
					text: 'Delivered Duty Unpaid',
				},
				
				{
					value: 'DDP',	
					text: 'Delivered Duty Paid',
				},
				
				{
					value: 'DAP',	
					text: 'Delivered At Port',
				},

			]
		}
	},
	data() {
		return {
			incoterms: 0
		}
	},
	methods: {
		change() {
			this.$emit('set_selected', this.incoterms)
		}
	}
}
</script>