<template>
	<div>
		<b-form-input
		:disabled="disabled"
		v-model="article.percentage_gain"
		placeholder="Margen de ganancia"></b-form-input>
		<p
		class="m-t-10"
		v-if="disabled">
			Elimine el precio manual para poder indicar el margen de ganancia
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
			return this.article && this.article.price !== null && this.article.price != ''
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