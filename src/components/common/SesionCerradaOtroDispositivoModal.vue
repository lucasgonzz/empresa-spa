<template>
	<b-modal
	id="sesion-cerrada-otro-dispositivo"
	title="Tu sesión se cerró"
	:no-close-on-backdrop="true"
	:no-close-on-esc="true"
	hide-header-close
	centered
	hide-footer>
		<p class="text-center m-t-15 m-b-25">
			Alguien inició sesión con tu usuario en otro dispositivo y eligió cerrar esta sesión
			para poder entrar. Si no fuiste vos, cambiá tu contraseña apenas puedas.
		</p>
		<div class="buttons j-center">
			<b-button
			variant="primary"
			@click="recargar">
				Entendido
			</b-button>
		</div>
	</b-modal>
</template>
<script>
/**
 * Anfitrión SIEMPRE montado (igual que AvisoImagenesAutomaticas.vue): el listener del canal
 * privado App.Models.User.{id} vive en src/mixins/broadcast.js (mixineado en App.vue) y solo
 * hace `this.$bvModal.show('sesion-cerrada-otro-dispositivo')` -no hace falta pasarle ningún
 * dato dinámico, el texto es siempre el mismo.
 */
export default {
	methods: {
		/**
		 * Recarga la SPA entera. El arranque normal (auth/me) es quien de verdad saca a este
		 * dispositivo -ver el comentario largo en listenSessionForcedLogoutChannel()-, así que
		 * acá alcanza con el reload, sin pegarle a /logout.
		 *
		 * @returns {void}
		 */
		recargar() {
			window.location.reload()
		},
	},
}
</script>
