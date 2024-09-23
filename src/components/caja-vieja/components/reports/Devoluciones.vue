<template>
	<div
	v-if="total > 0"
	class="m-b-15">
		<p
		class="title text-left">
			Devoluciones
		</p>

		<p
		v-if="!loading"
		class="title text-left">
			Total: {{ price(total) }}
		</p>
		<b-skeleton
		v-else
		width="200px"
		type="button"></b-skeleton>
	</div> 
</template>
<script>
export default {
	computed: {
		model_name() {
			return 'report'
		},
		models() {
			return this.$store.state[this.model_name].models
		},
		loading() {
			return this.$store.state[this.model_name].loading
		},
		total() {
			return this.models.devoluciones
		},
	},
}
</script>