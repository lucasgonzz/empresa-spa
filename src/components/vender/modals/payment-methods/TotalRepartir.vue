<template>
	<div
	class="total-a-repartir-wrapper">
		<p class="total-a-repartir">
			Total a repartir: <strong>{{ price(total_a_repartir) }}</strong>
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : ''"
		class="total-a-repartir">
			Total repartido: {{ price(total_repartido) }}
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : 'text-danger'"
		class="total-a-repartir">
			Sobrante para repartir: <strong>{{price(sobrante_a_repartir)}}</strong>
		</p>
	</div>
</template>
<script>
export default {
	props: {
		total_a_repartir: Number,
		total_repartido: Number,
		sobrante_a_repartir: Number,
	},
}
</script>
<style lang="sass">
.total-a-repartir-wrapper
	p
		font-size: 20px !important
</style>