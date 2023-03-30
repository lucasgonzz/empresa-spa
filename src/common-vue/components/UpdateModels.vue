<template>
<b-modal
:title="title"
hide-footer
id="update-models">
	<p
	class="text-center">
		Ha habido un cambio sustancial en la lista de {{ plural(model_name) }}
	</p>
	<p
	class="text-center">
		Se recomienda que actualice la misma para evitar conflictos.
	</p>
	<btn-loader
	:loader="loading"
	:text="'Actualizar '+plural(model_name)"
	@clicked="update" />
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		model_name() {
			return this.$store.state.general.model_name_to_update
		},
		title() {
			return 'Actualizar lista de '+this.plural(this.model_name)
		},
	},
	methods: {
		update() {
			this.loading = true
			this.$store.dispatch(this.model_name+'/getModels')
			.then(() => {
				this.loading = false 
				this.$bvModal.hide('update-models')
			})
			.catch(err => {
				console.log(err)
				this.loading = false
				this.$toast.error('Hubo un error al actualizar')
			})
		}
	}
}
</script>