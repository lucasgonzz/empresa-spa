<template>
	<div>

		<p
		class="title text-left">
			Ingresos
		</p>

		<display
		:loading="loading"
		:set_table_height="false"
		show_models_if_empty
		:set_model_on_click="false"
		:show_created_at="false"
		:models="models_to_show"
		:model_name="model_name"></display>	

		<p
		v-if="!loading"
		class="title text-left">
			Total: {{ price(total) }}
		</p>
		<b-skeleton
		v-else
		width="200px"
		type="button"></b-skeleton>

		<hr>
	</div> 
</template>
<script>
export default {
	components: {
		Display: () => import('@/common-vue/components/display/Index'),
	},
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
		models_to_show() {
			if (this.models.ingresos) {
				return this.models.ingresos.payment_methods
			}
		},
		total() {
			return this.models.ingresos.total
		},
	},
}
</script>