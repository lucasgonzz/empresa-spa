<template>
	<div>
    	<!-- <model
    	@modelSaved="modelSaved"
    	:model_name="model_name"></model> -->
		<b-button
		@click="callSetModel"
		size="sm"
		class="btn-create"
		variant="primary"> 
			<i class="icon-plus"></i>
			{{ create_spanish(model_name) }}
		</b-button>
	</div>
</template>
<script>
export default {
	components: {
		// Model: () => import('@/common-vue/components/model/Index')
	},
	props: {
		model_name: String,
		prop: Object,
		model: Object,
	},
	methods: {
		callSetModel() {
			let properties = []
			if (this.prop.is_between) {
				properties = [
					{
						key: this.prop.is_between.parent_model_prop+'_id',
						value: this.model[this.prop.is_between.parent_model_prop+'_id'],
					},
					{
						key: this.prop.is_between.parent_model_prop,
						value: this.model[this.prop.is_between.parent_model_prop],
					},
				]
			}
			this.setModel(null, this.model_name, properties)
		},
		modelSaved(model) {
			if (this.prop.is_between) {
				this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].concat([model]))
				this.$emit('callSearchModal')
			}
		}
	}
}
</script>
<style lang="sass">
.btn-create
	height: 100%
	white-space: nowrap
	margin-left: 10px
</style>