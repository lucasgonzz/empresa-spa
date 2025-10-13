<template>
	<b-input-group
	prepend="Canal:">
		<b-form-select
		v-model="sale_channel_id"
		:options="options"></b-form-select>
	</b-input-group>
</template>
<script>
export default {
	computed: {
		sale_channel_id: {
			get() {
				return this.$store.state.reportes.article_purchase.sale_channel_id
			},
			set(value) {
				return this.$store.commit('reportes/article_purchase/set_sale_channel_id', value)
			},
		},
		options() {
			let options = this.get_options_simple('sale_channel')
			options[0].text = 'Todos'
			return options
		}
	}
}
</script>