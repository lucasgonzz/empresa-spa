<template>
	<b-form-select
	class="m-t-10"
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