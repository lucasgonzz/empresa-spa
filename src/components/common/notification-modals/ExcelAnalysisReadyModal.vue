<template>
	<b-modal
	id="excel-analysis-ready-notification"
	size="md"
	hide-footer
	hide-header
	centered
	@show="on_show"
	@hidden="on_hidden">
		<div class="excel-analysis-ready-modal">

			<div class="excel-analysis-ready-modal__hero">
				<div
				class="excel-analysis-ready-modal__hero-icon"
				:class="{ 'excel-analysis-ready-modal__hero-icon--error': hubo_error }">
					<i :class="icono_hero"></i>
				</div>
				<h4 class="excel-analysis-ready-modal__hero-title">
					{{ titulo }}
				</h4>
				<span
				v-if="nombre_archivo"
				class="excel-analysis-ready-modal__chip"
				:title="nombre_archivo">
					{{ nombre_archivo }}
				</span>
			</div>

			<!--
				El aviso no muestra el resumen: es el punto del cambio. El usuario puede
				estar en medio de una venta cuando esto aparece, y leer un resumen de
				importacion no es algo que se haga de costado. Solo se le dice que esta
				listo y se le ofrece ir a verlo cuando pueda.
			-->
			<p class="excel-analysis-ready-modal__texto">
				{{ texto }}
			</p>

			<div class="buttons j-center">
				<!--
					Con error no hay nada que ver, salvo en la revisión de nombres de clientes y
					proveedores: esa no frena la importación, y "Seguir con la importación" reabre el
					modal en el paso de opciones finales (abrir_desde_corrida lo rearma sin la lista).
				-->
				<b-button
				v-if="puede_seguir"
				variant="primary"
				class="m-r-15"
				@click="ver_resultado">
					{{ hubo_error ? 'Seguir con la importación' : 'Ver resultado' }}
				</b-button>
				<b-button
				:variant="puede_seguir ? 'outline-secondary' : 'primary'"
				@click="descartar">
					{{ puede_seguir ? 'Después' : 'Entendido' }}
				</b-button>
			</div>

		</div>
	</b-modal>
</template>
<script>
/*
 * Aviso de que el análisis de un Excel con IA terminó de correr en segundo plano.
 *
 * Llega por broadcast (GlobalNotification con notification_modal
 * 'excel_analysis_ready') o lo levanta start_methods al iniciar la SPA, cuando el
 * broadcast pasó mientras el usuario no estaba conectado.
 *
 * Su única responsabilidad es avisar y ofrecer el paso siguiente. Todo lo caro
 * —traer el análisis, rearmar el modal de importación— pasa recién si el usuario
 * aprieta "Ver resultado".
 */
export default {
	computed: {
		/*
		 * Datos de la corrida terminada:
		 * { uuid, tipo, estado, error, model, original_filename }.
		 */
		excel_analysis() {
			return this.$store.state.global_notification.excel_analysis || {}
		},
		hubo_error() {
			return this.excel_analysis.estado === 'error'
		},
		es_recomendacion() {
			return this.excel_analysis.tipo === 'recomendacion'
		},
		/*
		 * Misión importacion-relaciones-parecidas (8/10/2026): en clientes y proveedores la corrida
		 * de "recomendación" no recomienda ninguna configuración, es solo la revisión de nombres
		 * parecidos (provincia, localidad, vendedor, lista de precios). El aviso no puede hablarles
		 * de una recomendación que no existe.
		 */
		es_revision_de_nombres() {
			const model = this.excel_analysis.model || 'article'
			return this.es_recomendacion && (model === 'client' || model === 'provider')
		},
		/*
		 * Si se ofrece seguir: siempre que terminó bien y, con error, solo en la revisión de nombres
		 * (que nunca bloquea la importación: se sigue sin la lista).
		 */
		puede_seguir() {
			return !this.hubo_error || this.es_revision_de_nombres
		},
		nombre_archivo() {
			return this.excel_analysis.original_filename || ''
		},
		icono_hero() {
			if (this.hubo_error) {
				return 'bi bi-exclamation-triangle'
			}
			return 'bi bi-stars'
		},
		titulo() {
			if (this.es_revision_de_nombres) {
				return this.hubo_error
					? 'No se pudieron revisar los nombres parecidos'
					: 'Terminamos de revisar tu archivo'
			}
			if (this.hubo_error) {
				return this.es_recomendacion
					? 'No se pudo generar la recomendación'
					: 'No se pudo analizar el archivo'
			}
			return this.es_recomendacion
				? 'La recomendación está lista'
				: 'Terminó el análisis con IA'
		},
		texto() {
			if (this.hubo_error) {
				/* El mensaje del backend suele decir qué pasa con el archivo; si no vino, algo genérico. */
				return this.excel_analysis.error || 'Volvé a intentarlo o avisanos si sigue pasando.'
			}

			/*
			 * Texto neutro a propósito: la revisión puede no haber encontrado ningún nombre parecido
			 * (y entonces "Ver resultado" lleva directo a las opciones finales). "Si todavía no
			 * importaste" porque el aviso puede llegar después de que el usuario siguió por su cuenta.
			 */
			if (this.es_revision_de_nombres) {
				return 'Si todavía no importaste, podés seguir con la importación.'
			}

			if (this.es_recomendacion) {
				return 'Ya podés revisar la configuración recomendada y confirmar la importación.'
			}

			return 'Ya podés revisar el mapeo de columnas que detectó la IA y seguir con la importación.'
		},
	},
	methods: {
		/*
		 * Una revisión de nombres que el usuario salteó ("Seguir sin revisar los nombres", ver
		 * excel_analysis.salteados) no se avisa: el usuario ya siguió sin ella, y "Ver resultado" lo
		 * dejaba volver a importar el mismo archivo. Se cancela la apertura acá, en el modal, y no en
		 * el broadcast, que es común a otros proyectos.
		 *
		 * @param {BvModalEvent} evento
		 * @return {void}
		 */
		on_show(evento) {
			if (this.$store.getters['excel_analysis/fue_salteada'](this.excel_analysis.uuid)) {
				evento.preventDefault()
			}
		},
		/*
		 * Lleva al usuario al módulo que corresponde y deja la orden para que el
		 * modal de importación se reabra en el paso donde había quedado.
		 *
		 * El orden importa: primero se deja la orden en el store y después se
		 * navega. El modal de importación es lazy y vive dentro del menú del
		 * listado, así que en la mayoría de los casos todavía no está montado
		 * cuando esto corre — la lee en su created(). Si ya estaba montado (el
		 * usuario nunca se fue del listado), la agarra por su watch.
		 */
		ver_resultado() {
			const corrida = this.excel_analysis
			const model = corrida.model || 'article'

			this.$store.commit('excel_analysis/set_abrir_en', {
				uuid:  corrida.uuid,
				tipo:  corrida.tipo,
				model: model,
			})

			this.$store.dispatch('excel_analysis/marcar_visto', corrida.uuid)

			this.$bvModal.hide('excel-analysis-ready-notification')

			/*
			 * Las rutas de los tres módulos con importación IA se llaman igual que el
			 * model: article, client, provider. El catch se come el
			 * NavigationDuplicated de cuando el usuario ya estaba parado ahí, que no
			 * es un error sino el caso más común.
			 */
			if (this.$route.name !== model) {
				this.$router.push({ name: model }).catch(() => {})
			}
		},
		/*
		 * "Después" / "Entendido": el usuario ya se enteró, que es todo lo que
		 * registra visto_at. El resultado sigue disponible desde el modal de
		 * importación mientras la corrida no se limpie por antigüedad.
		 */
		descartar() {
			this.$store.dispatch('excel_analysis/marcar_visto', this.excel_analysis.uuid)
			this.$bvModal.hide('excel-analysis-ready-notification')
		},
		/*
		 * Cerrar con ESC o clic afuera cuenta como descartar: si no marcáramos
		 * visto, el mismo aviso volvería en la próxima carga de la SPA.
		 */
		on_hidden() {
			if (this.excel_analysis.uuid) {
				this.$store.dispatch('excel_analysis/marcar_visto', this.excel_analysis.uuid)
			}
		},
	},
}
</script>
<style lang="sass">
.excel-analysis-ready-modal
	padding: 8px 4px

	&__hero
		display: flex
		flex-direction: column
		align-items: center
		text-align: center
		gap: 10px
		margin-bottom: 16px

	&__hero-icon
		width: 56px
		height: 56px
		border-radius: 16px
		display: flex
		align-items: center
		justify-content: center
		font-size: 1.6rem
		background: rgba(37, 99, 235, 0.12)
		color: #2563eb

		&--error
			background: rgba(220, 38, 38, 0.12)
			color: #dc2626

	&__hero-title
		margin: 0
		font-weight: 700

	&__chip
		display: inline-block
		padding: 4px 12px
		border-radius: 999px
		background: rgba(100, 116, 139, 0.1)
		color: #475569
		font-size: 0.8rem
		font-weight: 500
		// Mismo motivo que en el modal de precios: un nombre de archivo largo
		// dentro de un border-radius de 999px queda deforme si envuelve.
		max-width: 100%
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__texto
		text-align: center
		color: #475569
		margin-bottom: 24px
</style>
