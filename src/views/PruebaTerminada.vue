<template>
	<div class="prueba-terminada">
		<!--
			Pantalla de la prueba gratuita vencida (misión prueba-experiencia-empresa, 3/11/2026). Es una
			ruta PÚBLICA: se llega por el 403 `prueba_vencida` que contesta la API (middleware del grupo api o
			el login), y no hay usuario autenticado detrás. Lo único que muestra es el camino de vuelta: el
			WhatsApp de soporte que mandó el admin con la prueba.
		-->
		<div class="prueba-terminada__tarjeta">
			<i class="bi bi-hourglass-bottom prueba-terminada__icono" aria-hidden="true"></i>
			<h1 class="prueba-terminada__titulo">Tu prueba terminó</h1>
			<p class="prueba-terminada__texto">
				Los días de prueba gratis de tu sistema llegaron a su fin. <strong>Tu información sigue guardada</strong>:
				si querés seguir trabajando con ComercioCity, escribinos y lo activamos en el momento, con todo lo que cargaste.
			</p>
			<a
			v-if="link_whatsapp"
			:href="link_whatsapp"
			target="_blank"
			rel="noopener"
			class="btn btn-success btn-lg prueba-terminada__whatsapp">
				<i class="bi bi-whatsapp" aria-hidden="true"></i>
				Hablar con soporte por WhatsApp
			</a>
			<p
			v-else
			class="prueba-terminada__texto prueba-terminada__texto--secundario">
				Escribinos por WhatsApp a ComercioCity y lo activamos en el momento.
			</p>
			<b-button
			variant="link"
			class="prueba-terminada__volver"
			@click="volver_a_entrar">
				Ya lo activaron, volver a entrar
			</b-button>
		</div>
	</div>
</template>
<script>
export default {
	name: 'PruebaTerminada',
	computed: {
		whatsapp_soporte() {
			return this.$store.state.prueba.whatsapp_soporte
		},
		/**
		 * Link de wa.me con el número de soporte (solo dígitos) y el primer mensaje escrito.
		 *
		 * @returns {string|null}
		 */
		link_whatsapp() {
			if (!this.whatsapp_soporte) {
				return null
			}
			let digitos = String(this.whatsapp_soporte).replace(/\D/g, '')
			if (!digitos) {
				return null
			}
			let texto = encodeURIComponent('Hola, se terminó mi prueba gratis de ComercioCity y quiero seguir usando el sistema.')
			return 'https://wa.me/' + digitos + '?text=' + texto
		},
	},
	methods: {
		/**
		 * Recarga la aplicación desde cero: si el admin ya movió el vencimiento, el arranque entra solo.
		 *
		 * @returns {void}
		 */
		volver_a_entrar() {
			window.location.href = '/'
		},
	},
	created() {
		/*
			Si se llega acá sin el 403 reciente (un F5, un link guardado), se pregunta una vez. Un 403 vuelve
			a dejar el número en el store por el interceptor de main.js; un 200 significa que la prueba ya no
			está vencida, y se vuelve al sistema.
		*/
		if (this.whatsapp_soporte) {
			return
		}
		let self = this
		this.$axios.get('/api/user', { skip_global_error_event: true })
		.then(res => {
			if (res && res.data && res.data.user) {
				self.volver_a_entrar()
			}
		})
		.catch(() => {})
	},
}
</script>
<style lang="sass">
.prueba-terminada
	display: flex
	align-items: center
	justify-content: center
	min-height: 100vh
	padding: 1rem
	background: var(--bg-card, #ffffff)

.prueba-terminada__tarjeta
	display: flex
	flex-direction: column
	align-items: center
	text-align: center
	max-width: 520px
	width: 100%
	padding: 2rem 1.5rem

.prueba-terminada__icono
	font-size: 3rem
	color: var(--color-text-secondary, #6b7280)
	margin-bottom: 0.5rem

.prueba-terminada__titulo
	font-size: 1.75rem
	font-weight: 700
	color: var(--color-text-primary, #111827)
	margin-bottom: 0.75rem

.prueba-terminada__texto
	font-size: 1rem
	color: var(--color-text-primary, #111827)
	margin-bottom: 1.5rem

.prueba-terminada__texto--secundario
	color: var(--color-text-secondary, #6b7280)

.prueba-terminada__whatsapp
	display: inline-flex
	align-items: center
	gap: 0.5rem
	width: 100%
	justify-content: center

.prueba-terminada__volver
	margin-top: 1rem
</style>
