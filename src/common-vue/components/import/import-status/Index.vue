<template>
<!-- <div
class="import-status-active"
id="import-status"> -->
<div
id="import-status">

		<p>
			Estado: {{ status }}
		</p>
		
		<p
		v-if="import_status">
			{{ import_status.processed_chunks }} de {{ import_status.total_chunks }}
		</p>

		<circle-progress
		class="m-l-20"
		:size="80"
		:porcentaje="percentage"></circle-progress>

		<div
		v-if="import_status">
			<hr>
			<p
			class="text-left">
				Filas procesadas: {{ import_status.filas_procesadas }}
			</p>
			<p
			class="text-left">
				Articulos creados: {{ import_status.created_models }}
			</p>

			<p
			class="text-left">
				Articulos actualizados: {{ import_status.updated_models }}
			</p>

			<p
			class="text-left">
				Articulos macheados: {{ import_status.articles_match }}
			</p>

			
		</div>


		<div class="toggle"
		@click="toggle">
			<i 
			v-if="tarjeta_minimizada"
			class="icon-left"></i>
			<i 
			v-else
			class="icon-right"></i>
		</div>


</div>
</template>
<script>
export default {
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
		status() {
			if (this.import_status) {
				if (this.import_status.status == 'pendiente') {
					return 'En preparacion'
				}

				if (this.import_status.status == 'en_proceso') {
					return 'Procesandoce'
				}

				if (this.import_status.status == 'completado') {
					return 'Completado'
				}

				if (this.import_status.status == 'fallo') {
					return 'Fallido'
				}
			}
			return null
		},
		percentage() {
			if (this.import_status) {

				if (this.import_status.processed_chunks == this.import_status.total_chunks) return 100
				return Math.round(this.import_status.processed_chunks * 100 / this.import_status.total_chunks)
			}
			return 100
		},
		import_status() {
			return this.$store.state.import_status.model
		},
	},
	watch: {
		import_status() {
			console.log('watch de import_status:')
			console.log(this.import_status)

			if (this.import_status && !this.tarjeta_mostrandose) {
				
				this.mostrar_tarjeta()

			} else if (
				this.import_status 
				&& this.import_status.processed_chunks == this.import_status.total_chunks
				&& this.tarjeta_mostrandose
			) {
				
				setTimeout(() => {

					this.ocultar_tarjeta()

					this.$store.commit('import_status/setModel', null)
				}, 5000)
			
			} else if (
				this.import_status
				&& this.import_status.status == 'fallo'
			) {
				
				setTimeout(() => {

					this.ocultar_tarjeta()

					this.$store.commit('import_status/setModel', null)
				}, 5000)
			}
		},
	},
	methods: {
		toggle() {
			let el = document.getElementById('import-status')

			if (!this.tarjeta_minimizada) {
				el.classList.add('import-status-minimizada')
				this.tarjeta_minimizada = true
			} else {
				el.classList.remove('import-status-minimizada')
				this.tarjeta_minimizada = false

			}
		},
		mostrar_tarjeta() {
			let el = document.getElementById('import-status')
			console.log(el)
			el.classList.add('import-status-active')
			this.tarjeta_mostrandose = true
		},
		ocultar_tarjeta() {
			let el = document.getElementById('import-status')
			console.log(el)
			el.classList.remove('import-status-active')
			this.tarjeta_mostrandose = false
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'

#import-status
	width: 300px
	position: fixed 
	bottom: 50px
	right: -310px
	border-radius: 8px
	padding: 15px
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



.import-status-active
	right: 50px !important

.import-status-minimizada
	right: -280px !important

</style>