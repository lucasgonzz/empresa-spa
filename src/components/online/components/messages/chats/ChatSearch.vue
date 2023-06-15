<template>
	<search-component
	class="m-t-15"
	model_name="buyer"
	placeholder="Buscar chat"
	@setSelected="setSelected"></search-component>
</template>
<script>
import online from '@/mixins/online'
export default {
	mixins: [online],
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	computed: {
		buyers() {
			return this.$store.state.buyer.models
		},
	},
	methods: {
		setSelected(result) {
			console.log(result)
			this.$store.commit('message/setSelectedBuyer', result.model)
		},
		getResultValue(buyer) {
			return `${buyer.name} ${buyer.surname}`
		},
		search(input) {
			if (input.length >= 2) {
				let buyers_to_show = this.buyers.filter(buyer => {
					return buyer.name.toLowerCase().includes(input.toLowerCase())
				})
				this.$store.commit('message/setChatsToShow', buyers_to_show)
			} else {
				this.$store.commit('message/setChatsToShow')
			}
			return []
		},
	}
}
</script>