<template>
	<div
	v-if="sellers.length"
	class="nav-clients">
		<horizontal-nav
		@setSelected="setSelectedSeller"
		:items="items"></horizontal-nav>
		<b-button
		@click="printClients"
		variant="danger">
			<i class="icon-print"></i>
		</b-button>
	</div>
</template>
<script>
import HorizontalNav from '@/components/common/horizontal-nav/Index'
export default {
	name: 'SellersNav',
	components: {
		HorizontalNav,
	},
	computed: {
		sellers() {
			return this.$store.state.seller.models
		},
		selected_seller() {
			return this.$store.state.clients.selected_seller
		},
		items() {
			let items = []
			this.sellers.forEach(seller => {
				items.push({
					name: seller.name 
				})
			})
			return items 
		}
	},
	methods: {
		setSelectedSeller(item) {
			let seller = this.sellers.find(s => {
				return s.name == item.name 
			})
			this.$store.commit('client/setSelectedSeller', seller)
			this.$store.commit('client/setToShow')
		},
		printClients() {
			let seller_id = this.isActive('mios') ? undefined : this.selected_seller.id
			let url = process.env.VUE_APP_API_URL+'/clients/pdf/'+seller_id
            window.open(url)
		}
	}
}
</script>
<style lang="sass">
.nav-clients
	display: flex
	align-items: center
	justify-content: space-between
	.nav-tabs
		width: 90%
</style>