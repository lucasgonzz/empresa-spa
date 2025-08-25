<template>
<b-card
header="Datos del usuario"
class="m-t-15 m-b-15 s-1"
v-if="view == 'general'">
	asd
	<model-form
	input_full_width
	:show_btn_delete="false"
	:model="user"
	:properties="modelPropertiesFromName('user')"
	@modelSaved="modelSaved"
	model_name="user"></model-form>
</b-card>
</template>
<script>
import ModelForm from '@/common-vue/components/model/ModelForm'
export default {
	components: {
		ModelForm,
	},
	methods: {
		modelSaved() {
			console.log('Volviendo a cargar AUTH')
        	this.$store.dispatch('auth/me')
		}
	}
}
</script>