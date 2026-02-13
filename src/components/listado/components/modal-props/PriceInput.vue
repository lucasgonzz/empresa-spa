<template>
	<div>
		<b-form-input
		:disabled="disabled"
		v-model="article.price"
		placeholder="Precio manual"></b-form-input>
		<p
		class="m-t-10"
		v-if="disabled">
			Elimine el margen de ganancia para poder fijar el precio manualmente
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		disabled() {
			return this.article && typeof this.article.percentage_gain != 'undefined' && this.article.percentage_gain !== null && this.article.percentage_gain != ''
		}
	},
	methods: {
		info() {
			this.$api.get('article/final-price-description/'+this.article.id)
			.then(res => {
				console.log(res)

				this.$store.commit('article/set_final_price_description', res.data.description)
				this.$bvModal.show('final-price-description')
			})
		}
	}
}
</script>