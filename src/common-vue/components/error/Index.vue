<template>
<b-modal
title="Error en el sistema"
hide-footer
id="error">
	<div class="j-center">
		<img src="@/assets/error2.png"> 
	</div>
	<p
	class="text-center">
		Se ha producido un error en el sistema
	</p>
	<div>
		<p 
		class="text-with-icon">
			<i class="icon-check"></i>
			Ya notificamos al administrador de este error.
		</p>
		<p
		class="text-center">
			Puedes continuar usando el sistema.
		</p>
		<b-button
		@click="close"
		block
		variant="primary">
			Entendido
		</b-button>
	</div>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	created() {
        document.addEventListener(
            'errorEvent', this.errorEvent,
        )
	},
	data() {
		return {
			loading: false,
			error: null,
			guardar_error: true,
		}
	},
    methods: {
        errorEvent(event) {
        	console.log('errorEvent')

        	let error = event.detail
        	console.log(error)

        	let code = error.response.status
        	console.log('code')
        	console.log(code)

			if (error.response.data.message) {

				if (code >= 500) {

					this.$toast.error(error.response.data.message, {
						duration: 10000
					})

		        	if (error.response.data.message != 'Unauthenticated.' && this.authenticated && error.response && error.response.data && error.response.data.message) {
			        	this.$bvModal.show('error')
			        	this.sendError(error)
		        	}

				} else if (code >= 400 && code < 500) {

					this.$toast.warning(error.response.data.message, {
						duration: 10000
					})
				}
			} else {
				this.$toast.error('Hubo un Error')
				this.$toast.error(error.detail.message)
			}

        	// this.$toast.error(error.detail.message)
        	this.$store.commit('auth/setLoading', false)

        },
        sendError(error) {
        	
        	if (!this.guardar_error) return

        	this.loading = true 
        	this.$api.post('error', {
        		message: error.response.data.message,
        		file: error.response.data.file,
        		line: error.response.data.line,
        	})
        	.then(() => {
        		this.loading = false 
        	})
        	.catch(err => {
        		this.$toast.error('Error al guardar el error X)')
        		this.loading = false 

        		this.guardar_error = false
        		setTimeout(() => {
        			this.guardar_error = true
        		}, 10000)
        	})
        },
        close() {
        	this.$bvModal.hide('error')
        }
    }
}
</script>
<style lang="sass">
#error 
	img 
		width: 300px
		margin: 20px auto
</style>