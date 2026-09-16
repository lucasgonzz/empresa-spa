<template>
	<div class="informe-compartido">
		<div class="informe-compartido__hoja">

			<p
			v-if="estado == 'cargando'"
			class="informe-compartido__aviso">
				Abriendo el informe...
			</p>

			<!--
				Vencido y no encontrado se dicen distinto a propósito: "este link venció" le
				dice al dueño qué hacer (pedir otro), y "no encontramos el informe" lo manda a
				pensar que el informe se borró.
			-->
			<div
			v-else-if="estado == 'vencido'"
			class="informe-compartido__pantalla">
				<i class="bi bi-clock-history informe-compartido__icono"></i>
				<p class="informe-compartido__texto">Este link venció.</p>
				<p class="informe-compartido__subtexto">
					Los links de los informes duran una semana. Pedile al asistente por WhatsApp
					que te mande el informe de nuevo.
				</p>
			</div>

			<div
			v-else-if="estado == 'error'"
			class="informe-compartido__pantalla">
				<i class="bi bi-file-earmark-x informe-compartido__icono"></i>
				<p class="informe-compartido__texto">No encontramos este informe.</p>
				<p class="informe-compartido__subtexto">
					Revisá que el link esté completo, o pedile al asistente que te lo mande otra vez.
				</p>
			</div>

			<!--
				El MISMO componente que el informe de adentro del sistema, en modo solo lectura:
				un informe que se lee distinto según por dónde se abra es un informe que hay que
				mantener dos veces.
			-->
			<informe
			v-else
			:reporte="reporte"
			solo_lectura></informe>

		</div>
	</div>
</template>
<script>
import Informe from '@/components/ia/Informe'

/**
 * El informe del mostrador abierto desde el link que llegó por WhatsApp (misión
 * asistente-por-whatsapp, §4.2 del plan, 16/9/2026).
 *
 * Ruta PÚBLICA: el dueño la abre desde el teléfono, en la calle, sin tipear usuario ni
 * contraseña — es la decisión de Lucas en la Fase 2 ("resumen + link que abre el informe en el
 * celular sin pedir usuario y contraseña"). Lo que la sostiene no es la ausencia de gate sino el
 * token: 64 caracteres al azar que el backend guarda SOLO hasheado, con vencimiento de 7 días, y
 * que abre UN informe de solo lectura — ni la conversación, ni el escritorio, ni ninguna otra
 * pantalla.
 *
 * 🔴 EL ANCHO PRINCIPAL DE ESTA VISTA ES EL TELÉFONO, no el escritorio. Es la única pantalla del
 * sistema de la que se sabe de antemano en qué aparato se va a abrir.
 *
 * Sin `async/await` (regla dura del repo): `.then()` / `.catch()` con `let self = this`.
 */
export default {
	components: {
		Informe,
	},
	data() {
		return {
			// 'cargando' | 'listo' | 'vencido' | 'error'
			estado: 'cargando',
			reporte: null,
		}
	},
	mounted() {
		let self = this

		let token = this.$route.params.token

		if (!token) {
			this.estado = 'error'
			return
		}

		this.$axios.get('/api/informe-compartido/' + encodeURIComponent(token))
			.then(res => {
				if (!res || !res.data || !res.data.model) {
					self.estado = 'error'
					return
				}
				self.reporte = res.data.model
				self.estado = 'listo'
			})
			.catch(err => {
				console.log(err)
				// 410 es el link vencido; cualquier otra cosa (404, 500, red) es "no encontrado".
				let status = err && err.response ? err.response.status : null
				self.estado = status == 410 ? 'vencido' : 'error'
			})
	},
}
</script>
<style lang="sass">
.informe-compartido
	min-height: 100vh
	background: var(--bg-body, #ffffff)
	// El gutter de 16px del teléfono, que es donde esta pantalla se abre de verdad.
	padding: 18px 16px 40px 16px

	&__hoja
		max-width: 860px
		margin: 0 auto

	&__aviso
		color: var(--color-text-secondary, #6c757d)
		text-align: center
		padding: 40px 10px
		margin: 0

	&__pantalla
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 60px 10px

	&__icono
		font-size: 2.2rem
		color: var(--color-text-secondary, #6c757d)
		margin-bottom: 14px

	&__texto
		font-size: 1.1rem
		font-weight: 600
		color: var(--color-text-primary, #212529)
		margin: 0 0 6px 0

	&__subtexto
		font-size: .95rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0
		max-width: 420px

// Con más aire cuando hay pantalla de sobra.
@media screen and (min-width: 768px)
	.informe-compartido
		padding: 40px 24px 60px 24px
</style>
