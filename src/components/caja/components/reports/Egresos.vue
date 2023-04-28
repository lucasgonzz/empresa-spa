<template>
	<div
	class="m-b-15">
		<p
		class="title text-left">
			Egresos
		</p>

		<display
		show_models_if_empty
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
			if (this.models.egresos) {
				return this.models.egresos.payment_methods
			}
		},
		total() {
			return this.models.egresos.total
		},
	},
}
</script>