<template>
	<b-row
	v-if="models.length">
		<b-col>
			<div
			class="j-between">
				<h3
				class="text-left">
					<strong>
						Total: {{ price(total) }}
					</strong>
				</h3>
				<h4>
					Unidades vendidas: {{ unidades_vendidas }}
				</h4>
			</div>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
	},
	computed: {
		total() {
			let total = 0

			this.models.forEach(model => {

				total += Number(model.price)
			})

			return total
		},
		unidades_vendidas() {
			let unidades_vendidas = 0

			this.models.forEach(model => {

				unidades_vendidas += Number(model.unidades_vendidas)
			})

			return unidades_vendidas
		},
		models() {
			return this.$store.state.reportes.article_purchase.articles 
		},
	}
}
</script>