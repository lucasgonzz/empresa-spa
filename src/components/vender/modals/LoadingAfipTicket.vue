<template>
<div
id="loading-afip-ticket">
	<div
	v-if="afip_results && afip_results.length">

		<div
		class="text-with-icon-sm text-danger">
			<i class="icon-cancel"></i>
			<strong>
				Ocurrio algo inesperado
			</strong>
		</div>
		<p
		class="text-left"
		v-for="result in afip_results">
			<i class="icon-right"></i>
			{{ result.Msg }}
		</p>
		<b-button
		@click="ocultar_tarjeta"
		variant="primary"
		block>
			Cerrar
		</b-button>
	</div>

	<div
	v-else>
		<h3
		class="m-b-20">
			Enviando comprobante a AFIP
		</h3>
		
		<div class="loading-info j-center align-center">
			<b-spinner 
			variant="primary" 
			size="sm"></b-spinner>

			<p
			class="m-0 p-l-10">
				Aguarde, por favor...
			</p>
		</div>

		<div
		class="afip-notificacion afip-demorado">
			<i class="icon-clock text-danger"></i>
			<strong>
				Los servicios de AFIP estan demorados...
			</strong>
		</div>

		<div
		class="afip-notificacion afip-success">
			<i class="icon-check text-success"></i>
			<strong>
				Comprobante generado correctamente
			</strong>
		</div>
	</div>


</div>
</template>
<script>
import afip_ticket from '@/mixins/vender/guardar_venta/facturar'
export default {
	mixins: [afip_ticket],
	computed: {
		afip_results() {
			return this.$store.state.vender.afip_results
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'

#loading-afip-ticket
	width: 500px
	// height: 250px
	position: fixed 
	bottom: 50px
	right: -500px
	border-radius: 8px
	padding: 15px
	background: #FFF
	border: 2px solid rgba(0, 0, 0, .1)
	z-index: 1000
	box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px
	
	transition: all .2s

	.spinner-border 
		width: 30px
		height: 30px

	.afip-notificacion
		i 
			font-size: 60px

	.afip-demorado
		display: none

	.afip-success
		margin-top: -15px
		display: none


.loading-afip-ticket-active
	right: 50px !important

.loading-afip-ticket-success
	border: 5px solid $green !important

	.loading-info
		display: none

	.afip-success
		display: flex !important
		flex-direction: column
		align-items: center


.loading-afip-ticket-demorado

	.afip-demorado
		display: flex !important
		flex-direction: column
		align-items: center

</style>