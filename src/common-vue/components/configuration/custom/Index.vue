<template>
<b-card
v-if="show && view == 'avanzado'"
header="Avanzado"
class="m-t-15 m-b-15 s-1">
	<model-form
	input_full_width
	:show_btn_delete="false"
	:model="model"
	:properties="modelPropertiesFromName('configuration')"
	model_name="configuration"></model-form>
</b-card>
</template>
<script>
import ModelForm from '@/common-vue/components/model/ModelForm'
export default {
	components: {
		ModelForm,
	},
	computed: {
		show() {
			return this.custom_configuration_page
		},
		model() {
			return this.$store.state.configuration.model 
		},
		models() {
			return this.$store.state.configuration.models
		},
	},
	created() {
		if (this.show) {
			this.$store.dispatch('configuration/getModels')
			.then(() => {
				console.log('se mando:')
				console.log(this.models[0])
				this.setModel(this.models[0], 'configuration')
				console.log('se seteo modelo')
			})
		}
	}
}
</script>