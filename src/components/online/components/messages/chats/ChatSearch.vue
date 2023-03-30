<template>
	<autocomplete 
	:search="search" 
	:get-result-value="getResultValue"
	placeholder="Buscar un chat"></autocomplete>
</template>
<script>
import online from '@/mixins/online'
export default {
	mixins: [online],
	computed: {
		buyers() {
			return this.$store.state.buyer.models
		},
	},
	methods: {
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