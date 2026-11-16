<template>
	<!-- «Seguir con Soporte» (misión prueba-ayuda-unificada-en-soporte, S2, 10/11/2026): la oferta que
	dejó `ofrecer_soporte` en la respuesta del asistente. Al tocarla, la pregunta va a la conversación de
	Soporte del lead (ver seguir_con_soporte.js); después queda como «Enviado a Soporte» y no se repite. -->
	<div class="asistente-ia-soporte">
		<button
		type="button"
		class="asistente-ia-soporte__boton"
		:disabled="estado === 'enviando' || estado === 'enviado'"
		:aria-describedby="estado === 'error' ? id_error : null"
		@click="seguir">
			<i
			class="bi"
			:class="estado === 'enviado' ? 'bi-check2-circle' : 'bi-headset'"
			aria-hidden="true"></i>
			{{ etiqueta }}
		</button>
		<p
		v-if="estado === 'error'"
		:id="id_error"
		class="asistente-ia-soporte__error"
		role="alert">No se pudo mandar a Soporte. Probá de nuevo.</p>
	</div>
</template>

<script>
import { seguir_con_soporte, uuid_de_la_oferta, ya_enviado } from '@/components/asistente-ia/seguir_con_soporte'

export default {
	props: {
		// El adjunto `{ tipo: 'soporte', texto, uuid }`: su uuid es la clave del envío único (lo genera
		// empresa-api). mensaje/agente/Index.vue no monta el botón si no trae uno válido.
		oferta: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// 'listo' | 'enviando' | 'enviado' | 'error'
			estado: ya_enviado(uuid_de_la_oferta(this.oferta)) ? 'enviado' : 'listo',
		}
	},
	computed: {
		etiqueta() {
			if (this.estado === 'enviado') return 'Enviado a Soporte'
			if (this.estado === 'enviando') return 'Enviando a Soporte…'
			return 'Seguir con Soporte'
		},
		id_error() {
			return 'asistente-ia-soporte-error-' + uuid_de_la_oferta(this.oferta)
		},
	},
	methods: {
		seguir() {
			if (this.estado === 'enviando' || this.estado === 'enviado') return
			this.estado = 'enviando'
			return seguir_con_soporte(this, this.oferta).then(resultado => {
				this.estado = resultado === 'cancelado' ? 'listo' : resultado
			})
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'

// Va debajo del texto y de las fotos, separada como las tarjetas de carga (`__acciones`).
.asistente-ia-soporte
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	margin-top: 12px

	&__boton
		+asistente-ia-boton-secundario
		max-width: 100%

		// «Enviado a Soporte» se lee como un estado y no como un botón apagado.
		&:disabled
			opacity: .72

	&__error
		margin: 0
		font-size: .82rem
		color: var(--ia-texto-2)
</style>
