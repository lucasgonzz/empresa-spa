<template>
	<b-modal
	id="misma-sesion-otra-pestana"
	title="Ya tenés esta cuenta abierta"
	:no-close-on-backdrop="true"
	:no-close-on-esc="true"
	hide-header-close
	centered
	hide-footer
	data-testid="modal-misma-sesion-otra-pestana">
		<p class="text-center m-t-15 m-b-25">
			Ya tenés esta cuenta abierta en otra pestaña de este navegador. Podés usar esta
			pestaña, y la otra se va a cerrar.
		</p>
		<div class="buttons j-center">
			<b-button
			variant="primary"
			data-testid="usar-esta-pestana"
			:disabled="forzando"
			@click="usar_esta_pestana">
				Usar esta pestaña
			</b-button>
		</div>
	</b-modal>
</template>
<script>
/**
 * Anfitrión SIEMPRE montado (mismo patrón que SesionCerradaOtroDispositivoModal.vue): abrir una
 * pestaña nueva del mismo navegador ya logueado no pasa por LoginForm.vue -la cookie ya
 * autentica-, así que `store/auth.js` (acción `me`) es quien detecta el 403 con
 * `misma_sesion_otra_pestana` y prende el flag que este componente observa.
 *
 * A diferencia del modal de "cuenta en uso en otro dispositivo" (LoginForm.vue), acá NO hay
 * ninguna contraseña que reenviar: la pestaña ya demostró quién es con la cookie, por eso el
 * botón pega directo a `session-lock/forzar-pestana` sin credenciales.
 */
export default {
	data() {
		return {
			/** Evita doble click mientras /session-lock/forzar-pestana está en vuelo. */
			forzando: false,
		}
	},
	computed: {
		/**
		 * Espeja `auth/misma_sesion_otra_pestana`: cuando se prende, se muestra el modal.
		 *
		 * @returns {boolean}
		 */
		debe_mostrarse() {
			return this.$store.state.auth.misma_sesion_otra_pestana
		},
	},
	watch: {
		debe_mostrarse(activo) {
			if (activo) {
				this.$bvModal.show('misma-sesion-otra-pestana')
			}
		},
	},
	methods: {
		/**
		 * Reclama el candado para esta pestaña sin pedir contraseña (ya hay sesión Laravel
		 * válida por cookie) y, si sale bien, sigue el boot normal con el usuario recibido -sin
		 * recargar innecesariamente-.
		 *
		 * @returns {void}
		 */
		usar_esta_pestana() {
			if (this.forzando) {
				return
			}
			this.forzando = true
			// this.$api (no this.$axios): la ruta vive en routes/api.php, y $api ya lleva el
			// prefijo /api en su baseURL -mismo patrón que el resto de los componentes .vue del
			// repo (this.$axios con /api a mano queda solo para los stores, ver store/auth.js).
			this.$api.post('session-lock/forzar-pestana')
				.then(res => {
					this.forzando = false
					if (res.data && res.data.login) {
						this.$bvModal.hide('misma-sesion-otra-pestana')
						this.$store.commit('auth/setMismaSesionOtraPestana', false)
						this.$store.commit('auth/setUser', res.data.user)
						this.$store.commit('auth/setAuthenticated', true)
					} else {
						this.$toast.error('No se pudo tomar esta pestaña. Probá de nuevo en unos segundos.', {
							duration: 10000,
						})
					}
				})
				.catch(err => {
					console.log(err)
					this.forzando = false
					this.$toast.error('No se pudo tomar esta pestaña. Probá de nuevo en unos segundos.')
				})
		},
	},
}
</script>
