<template>
<div>
	<modal
	:prop="prop"
	:model="model"></modal>	
	<b-form-input
	:placeholder="'Ingresar '+propText(prop)"
	v-model="model[prop.key]"
	@click="showModal"></b-form-input>
</div>
</template>
<script>
export default {
	components: {
		Modal: () => import('@/common-vue/components/model/google-geocoder/Modal'),
	},
	props: {
		prop: Object,
		model: Object,
	},
	methods: {
		showModal() {
			this.$bvModal.show('google-geocoder-modal-'+this.prop.key)
			setTimeout(() => {
				document.getElementById('google-geocoder-modal-input-'+this.prop.key).focus()
			}, 200) 
		}
	}
}
</script>