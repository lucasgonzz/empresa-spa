<template>
	<div class="informe-compartido">
		<div class="informe-compartido__hoja">

			<p
			v-if="estado == 'cargando'"
			class="informe-compartido__aviso">
				Abriendo el informe...
			</p>

			<!--
				Los tres estados de error se dicen distinto a propósito, porque la acción que le
				toca al dueño es distinta en cada uno. Mezclarlos es peor que no decir nada: con
				mala señal —que es la condición NORMAL de esta pantalla, el dueño la abre desde el
				celular en la calle— leía que su link estaba mal, le pedía otro al asistente y le
				llegaba uno igual de "roto".
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
			v-else-if="estado == 'sin_conexion'"
			class="informe-compartido__pantalla">
				<i class="bi bi-wifi-off informe-compartido__icono"></i>
				<p class="informe-compartido__texto">No pudimos conectarnos.</p>
				<p class="informe-compartido__subtexto">
					El link está bien: lo que falló fue la conexión. Probá de nuevo en un momento.
				</p>
				<b-button
				variant="primary"
				class="informe-compartido__reintentar"
				@click="buscar">
					<i class="bi bi-arrow-clockwise"></i>
					Reintentar
				</b-button>
			</div>

			<div
			v-else-if="estado == 'no_encontrado'"
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
			// 'cargando' | 'listo' | 'vencido' | 'sin_conexion' | 'no_encontrado'
			estado: 'cargando',
			reporte: null,
		}
	},
	mounted() {
		this.buscar()
	},
	methods: {
		/**
		 * Pide el informe. Es también lo que corre el botón Reintentar, que es el único camino de
		 * vuelta que tiene esta pantalla: acá no hay menú, ni sesión, ni ninguna otra cosa que
		 * tocar.
		 *
		 * 🔴 `skip_global_error_event`: el aviso de "no pudimos conectarnos" ya lo da la pantalla,
		 * con el texto correcto y con el botón. Sin la bandera se suma ADEMÁS el toast global del
		 * interceptor (src/main.js), que dice lo mismo y tapa media pantalla en un teléfono.
		 *
		 * Sin `async/await` (regla dura del repo): `.then()` / `.catch()` con `let self = this`.
		 *
		 * @returns {void}
		 */
		buscar() {
			let self = this

			let token = this.$route.params.token

			if (!token) {
				this.estado = 'no_encontrado'
				return
			}

			this.estado = 'cargando'

			this.$api.get('informe-compartido/' + encodeURIComponent(token), {
				skip_global_error_event: true,
			})
				.then(res => {
					if (!res || !res.data || !res.data.model) {
						self.estado = 'no_encontrado'
						return
					}
					self.reporte = res.data.model
					self.estado = 'listo'
				})
				.catch(err => {
					// Sin console.log: esta pantalla es PÚBLICA y la abre el dueño desde el
					// teléfono. Lo que hay que saber ya está en `estado`, que es lo que se le
					// muestra; volcar el error crudo a la consola de una vista sin sesión no le
					// sirve a nadie y expone la forma de la respuesta.
					self.estado = self.estado_del_error(err)
				})
		},
		/**
		 * Qué pantalla corresponde a cada falla.
		 *
		 * 🔴 SEPARAR LA RED DEL LINK ES EL PUNTO DE ESTE MÉTODO. Antes cualquier `catch` que no
		 * fuera 410 mostraba "revisá que el link esté completo", y eso es exactamente lo que NO
		 * hay que decirle a alguien que perdió señal: el link está bien y pedir otro no arregla
		 * nada. Solo el 404 habla del link.
		 *
		 * Un error de red o un timeout de axios no traen `response` (ver el interceptor de
		 * src/main.js), y un 5xx es un problema del servidor, no del dueño: los dos ofrecen
		 * reintentar.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {String}
		 */
		estado_del_error(err) {
			let status = err && err.response ? err.response.status : null

			if (status === 410) {
				return 'vencido'
			}

			if (status === 404) {
				return 'no_encontrado'
			}

			return 'sin_conexion'
		},
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

	// El único botón de la pantalla. Separado del texto para que en un teléfono no quede pegado
	// al párrafo y se toque sin querer.
	&__reintentar
		margin-top: 18px
		display: inline-flex
		align-items: center
		gap: 8px

// Con más aire cuando hay pantalla de sobra.
@media screen and (min-width: 768px)
	.informe-compartido
		padding: 40px 24px 60px 24px
</style>
