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
import { usa_precio_manual } from '@/utils/criterio_de_precio'

export default {
	computed: {
		article() {
			return this.$store.state.article.model
		},
		/*
		 * Mision 44: exige precio manual > 0, con el mismo criterio que el back
		 * (utils/criterio_de_precio.js es el espejo de CriterioDePrecioHelper.php).
		 * Antes bastaba con que price no fuera null ni cadena vacia, asi que un precio
		 * guardado en 0 bloqueaba el margen de ganancia sin que el back considerara que
		 * ese articulo tuviera precio manual.
		 */
		disabled() {
			return usa_precio_manual(this.article)
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