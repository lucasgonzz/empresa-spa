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

			/*
			 * 🔴 Guarda de entrada. Este handler es el UNICO lugar de la aplicacion que apaga el
			 * loading global ante un error, asi que cualquier excepcion que se tire adentro deja el
			 * overlay tapando toda la pantalla hasta un F5. Antes se entraba directo a
			 * `error.response.status`: un error sin `response` (red caida, timeout) reventaba en esa
			 * linea. Hoy main.js ya no despacha `errorEvent` en ese caso —lo atiende el propio
			 * interceptor—, pero la guarda se queda igual: es una linea contra un cuelgue total.
			 */
			if (!error || !error.response) {
				this.$store.commit('auth/setLoading', false)
				return
			}

        	let code = error.response.status
        	console.log('code')
        	console.log(code)

			// Validación Laravel (422): el interceptor en main.js ya mostró el toast con todos los campos
			if (
				code === 422 &&
				error.response.data &&
				error.response.data.errors &&
				typeof error.response.data.errors === 'object' &&
				!Array.isArray(error.response.data.errors)
			) {
				this.$store.commit('auth/setLoading', false)
				return
			}

			// `data` puede no ser un objeto (una pagina de error de nginx llega como string), asi
			// que se pregunta por el antes de bajar a `.message`: es el mismo cuelgue de arriba.
			if (error.response.data && error.response.data.message) {

				if (code >= 500) {

					this.$toast.error(error.response.data.message, {
						duration: 10000
					})

		        	// if (error.response.data.message != 'Unauthenticated.' && this.authenticated && error.response && error.response.data && error.response.data.message) {
			        // 	this.$bvModal.show('error')
			        // 	this.sendError(error)
		        	// }

				} else if (code >= 400 && code < 500) {

					this.$toast.warning(error.response.data.message, {
						duration: 10000
					})
				}
			} else {
				/*
				 * 🔴 Acá abajo habia un segundo `this.$toast.error(error.detail.message)`. `error`
				 * YA ES `event.detail`, asi que `error.detail` era siempre undefined y esa linea
				 * tiraba un TypeError ADENTRO del handler de errores: cortaba la ejecucion antes
				 * del `setLoading(false)` de mas abajo y dejaba el overlay global prendido sobre
				 * toda la aplicacion. Era el peor caso del interceptor y se arregla borrandola.
				 */
				this.$toast.error('Hubo un error y no pudimos leer el detalle. Volvé a intentar; si sigue pasando, avisanos.', {
					duration: 10000
				})
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