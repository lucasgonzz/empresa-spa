<template>
	<div
	v-if="authenticated">
		<b-alert
		class="alert-online m-t-15 c-p s-2 apretable"
		show
		v-if="provider_order_days_to_advise.length >= 1 && !is_provider_view"
		variant="danger">
			<div
			@click="toProviderOrders">
				<h4 >
					{{ provider_order_days_to_advise.length }} pedidos de proveedor sin recibir
				</h4>
			</div>
		</b-alert>
	</div>
</template>
<script>
export default {
	computed: {
		is_provider_view() {
			return this.route_name == 'provider'
		},
        provider_order_days_to_advise() {
			return this.$store.state.provider_order.days_to_advise_models 
        },
	},
	methods: {
		toProviderOrders() {
			this.$router.push({name: 'provider', params: {view: 'pedidos', sub_view: null}})
		},
	}
}
</script>
<style lang="sass">
.alert-online
	margin: 0 15px
	h4
		margin-bottom: 1em
		&:last-child
			margin-bottom: 0
</style>