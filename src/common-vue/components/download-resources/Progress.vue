<template>
<!-- <div
class="recursos-progress-active"
id="recursos-progress"> -->
<div
class="recursos-progress-active"
id="recursos-progress">

	<div class="j-center align-center">

		<div 
		class="btn-cerrar c-p"
		v-if="terminado"
		@click="ocultar_tarjeta">
			<i class="icon-cancel"></i>
		</div>

		<strong
		class="text-success"
		v-if="terminado">
			Sistema listo para usar
		</strong>
		<span
		v-else>
			Descargando recursos...
		</span>

		<circle-progress
		class="m-l-20"
		:size="40"
		:porcentaje="percentage"></circle-progress>
	</div>
	

</div>
</template>
<script>
export default {
	props: {
		models_to_download: Array,
	},
	components: {
		CircleProgress: () => import('@/components/listado/modals/inventory-performance/CircleProgress'),
	},
	data() {
		return {
			tarjeta_mostrandose: false,
			tarjeta_minimizada: false,
		}
	},
	computed: {
		terminado() {
			return this.descargados == this.models_to_download.length
		},
		percentage() {
			return Math.round(this.descargados * 100 / this.models_to_download.length)
		},
		import_status() {
			return this.$store.state.import_status.model
		},
		descargados() {
			return this.models_to_download.filter(m => {
				
        		if (m.if_has_extencion) {

        			if (!this.hasExtencion(m.if_has_extencion)) {
        				return true
        			}
        		}

				return m.downloaded
			}).length
		},
		no_descargados() {
			return this.models_to_download.filter(m => {
				
				return !m.downloaded
			})
		}
	},
	watch: {
		models_to_download() {
			console.log('watch de models_to_download:')
			console.log(this.models_to_download)

			this.check_visibilidad()
		},
		terminado() {
			console.log('watch de terminado')
			this.check_visibilidad()
		},
	},
	methods: {
		check_visibilidad() {

			console.log(this.terminado)
			console.log(this.tarjeta_mostrandose)

			if (this.models_to_download && !this.tarjeta_mostrandose) {
				
				this.mostrar_tarjeta()

			} else if (
				this.terminado
				&& this.tarjeta_mostrandose
			) {
				
				setTimeout(() => {

					this.ocultar_tarjeta()

				}, 5000)
			
			} 
		},
		mostrar_tarjeta() {
			let el = document.getElementById('recursos-progress')
			
			el.classList.add('recursos-progress-active')
			this.tarjeta_mostrandose = true

			// alert('Mostrando tarjeta')
		},
		ocultar_tarjeta() {
			let el = document.getElementById('recursos-progress')
			console.log(el)
			el.classList.remove('recursos-progress-active')
			this.tarjeta_mostrandose = false
			// alert('ocultar_tarjeta')
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'

#recursos-progress
	width: 270px
	position: fixed 
	top: 10px
	right: -310px
	border-radius: 8px
	padding: 8px
	background: #FFF
	border: 2px solid rgba(0, 0, 0, .1)
	z-index: 1000
	box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px
	
	transition: all .2s


	.toggle
		position: absolute
		left: -10px
		top: 10px
		background: #FFF
		padding: 4px
		border: 2px solid rgba(0, 0, 0, .3)
		// box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px
		border-radius: 5px
		cursor: pointer


	.btn-cerrar
		position: absolute
		top: 2px
		left: 2px



.recursos-progress-active
	right: 20px !important

.recursos-progress-minimizada
	right: -280px !important

</style>