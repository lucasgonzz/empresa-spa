<template>
	<div class="cont-provider-cards">
		<b-form-input
		v-model="provider_query"
		@keyup.enter="filterProviders"
		placeholder="Buscar Proveedor"></b-form-input>
		<div 
		class="provider-cards">
			<div 
			v-for="provider in providers_formated.slice(0, 5)"
			@click="setProviderArticles(provider)"
			:class="isSelectedProvider(provider)"
			v-if="typeof provider != 'undefined'"
			class="card c-p apretable">
				<p class="name">
					{{ provider.name }}
				</p>
				<div class="data">
					<p>
						Vendido: {{ price(provider.total_prices) }}
					</p>
					<p>
						Rendimiento: {{ price(provider.total_prices - provider.total_costs) }}
					</p>
					<p>
						Unidades vendidas: {{ Math.round(provider.unidades_vendidas) }}
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	methods: {
		isSelectedProvider(provider) {
			return this.selected_provider && provider.id == this.selected_provider.id ? 'active-provider' : ''
		},
		filterProviders() {
			this.$store.commit('panel_control/setProvidersFormated', this.provider_query)
		}
	},
	data() {
		return {
			provider_query: '',
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.cont-provider-cards
	input 
		width: 300px
	.provider-cards 
		display: flex 
		flex-direction: row 
		justify-content: flex-start
		flex-wrap: wrap
		.card
			width: 300px
			margin: 10px
			border: 1.5px solid #DDDDDD
			display: flex
			align-items: center 
			justify-content: center
			padding: 20px 0
			border-radius: 10px  
			p 
				margin: 0
			.name 
				font-size: 2em
				margin-bottom: 15px

		.active-provider
			border: 4px solid $blue
</style>