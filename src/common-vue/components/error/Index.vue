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
	<div 
	v-if="loading"
	class="all-center-md">
		<b-spinner
		variant="primary"></b-spinner>
		<p>
			Notificando al administrador
		</p>
	</div>
	<div
	v-else>
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
		}
	},
    methods: {
        errorEvent(event) {
            console.log('LLEGO')
            let error = event.detail
            if (error.response.data.message != 'Unauthenticated.' && this.authenticated && error.response && error.response.data && error.response.data.message) {
            	console.log('entro')
	            this.$bvModal.show('error')
	            this.error = error 
            	console.log(this.error)
	            this.sendError()
            } else {
            	console.log('no entor en error')
            	console.log(this.authenticated)
            }
        },
        sendError() {
        	this.loading = true 
        	this.$api.post('error', {
        		message: this.error.response.data.message,
        		file: this.error.response.data.file,
        		line: this.error.response.data.line,
        	})
        	.then(() => {
        		this.loading = false 
        	})
        	.catch(err => {
        		this.$toast.error('Error al guardar el error X)')
        		this.loading = false 
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