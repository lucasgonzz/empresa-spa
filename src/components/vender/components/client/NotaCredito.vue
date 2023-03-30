<template>
	<b-card
	class="s b-r-5"
	v-if="returned_articles.length"
	header="Nota de credito">
		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="save_nota_credito">
			Guardar nota de credito por los siguientes items
		</b-form-checkbox>
		<p
		class="m-b-0 m-l-10"
		v-for="article in returned_articles"
		:key="article.id">
			<i class="icon-right"></i>
			{{ article.returned_amount }} unidades devueltas de {{ article.name }}
		</p>
		<b-form-group
		class="m-t-15"
		label="Descripcion">
			<b-form-textarea
			v-model="nota_credito_description"></b-form-textarea>
		</b-form-group>
	</b-card>
</template>
<script>
export default {
	computed: {
		returned_articles() {
			return this.$store.state.vender.returned_articles
		},
		nota_credito_description: {
			get() {
				return this.$store.state.vender.nota_credito_description
			},
			set(value) {
				this.$store.commit('vender/setNotaCreditoDescription', value)
			}
		},
		save_nota_credito: {
			get() {
				return this.$store.state.vender.save_nota_credito
			},
			set(value) {
				this.$store.commit('vender/setSaveNotaCredito', value)
			}
		}
	},
}
</script>