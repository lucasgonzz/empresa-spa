<template>
	<b-nav tabs class="m-b-10">
		<b-nav-item
		@click="setSelectedCommissioner(commissioner)"
		:active="isActive(commissioner)"
		v-for="commissioner in commissioners"
		:key="commissioner.id">
			{{ commissionerName(commissioner) }}
		</b-nav-item>
	</b-nav>
</template>
<script>
export default {
	name: 'CommissionersNav',
	computed: {
		commissioners() {
			return this.$store.state.commissioners.commissioners
		},
		selected_commissioner() {
			return this.$store.state.commissioners.selected_commissioner
		},
	},
	methods: {
		isActive(commissioner) {
			if (this.selected_commissioner.id == commissioner.id) {
				return true
			}
			return false
		},
		setSelectedCommissioner(commissioner) {
			this.$store.commit('commissioners/setSelectedCommissioner', commissioner)
			this.$store.dispatch('commissioners/getSelectedCommissioners')
		},
		commissionerName(commissioner) {
			if (commissioner.seller) {
				return commissioner.seller.name 
			}
			return commissioner.name
		}
	}
}
</script>