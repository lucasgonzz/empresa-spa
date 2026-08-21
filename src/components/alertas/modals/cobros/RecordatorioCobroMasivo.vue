<template>
<div>
	<b-modal
	id="recordatorio-cobro-masivo"
	size="lg"
	centered
	scrollable
	title="Recordar el cobro a todos"
	@show="al_abrir"
	@hidden="al_cerrar">

		<div class="recordatorio-masivo">

			<!-- ======================= Paso 1: confirmar ======================= -->
			<div v-if="paso == 'confirmar'">

				<!--
					🔴 El conteo va con todas las letras y en grande. Mandar un WhatsApp a todos
					los deudores de una es la acción menos reversible del módulo: el número de
					clientes tiene que estar a la vista ANTES de apretar, no en un toast después.
				-->
				<p class="recordatorio-masivo__conteo">
					Se le va a enviar el recordatorio a
					<strong>{{ numero_es(total_clientes) }} {{ total_clientes == 1 ? 'cliente' : 'clientes' }}</strong>.
				</p>

				<p class="recordatorio-masivo__ayuda">
					Algunos pueden saltearse: si ya lo recibieron en las últimas 24 horas, si no
					tienen teléfono cargado o si no se les puede mandar por WhatsApp. Los que se
					salteen se listan acá abajo cuando termine.
				</p>

				<p class="recordatorio-masivo__ayuda">
					A cada cliente le llega <strong>un solo mensaje</strong>, con sus ventas
					pendientes y el resumen de cuenta corriente. Si el cliente no escribió en las
					últimas 24 horas, WhatsApp obliga a mandarle una plantilla en vez del texto
					con el listado.
				</p>
			</div>

			<!-- ======================= Paso 2: progreso ======================= -->
			<div v-else>

				<div
				v-if="lote"
				class="recordatorio-masivo__progreso">

					<div class="recordatorio-masivo__progreso-linea">
						<span class="recordatorio-masivo__rotulo">
							{{ titulo_progreso }}
						</span>
						<span class="recordatorio-masivo__progreso-numeros">
							{{ numero_es(lote.procesados) }} de {{ numero_es(lote.total) }}
						</span>
					</div>

					<b-progress
					:value="lote.procesados"
					:max="lote.total ? lote.total : 1"
					:animated="!lote.terminado"
					variant="primary"></b-progress>

					<div class="recordatorio-masivo__contadores">
						<span class="recordatorio-masivo__contador">
							<i class="bi bi-check2-circle"></i>
							{{ numero_es(lote.enviados) }} enviados
						</span>
						<span
						v-if="lote.fallidos"
						class="recordatorio-masivo__contador is-error">
							<i class="bi bi-x-circle"></i>
							{{ numero_es(lote.fallidos) }} fallidos
						</span>
					</div>
				</div>

				<!--
					El polling se corta a los 5 minutos aunque el lote no haya terminado: con
					muchos clientes la cola puede tardar más que la paciencia de nadie, y dejar
					el intervalo vivo es pegarle al servidor para siempre. El envío sigue su
					curso; lo que se corta es la pantalla.
				-->
				<div
				v-if="polling_cortado"
				class="recordatorio-masivo__aviso">
					<i class="bi bi-hourglass-split"></i>
					Los mensajes se siguen mandando en segundo plano. Seguí el resultado en el
					módulo de WhatsApp.
				</div>
			</div>

			<!-- ======================= Salteados ======================= -->
			<!--
				🔴 Los salteados SE MUESTRAN, agrupados por motivo. Esconderlos deja al operador
				creyendo que le llegó a todo el mundo, que es exactamente lo contrario de lo que
				necesita saber.
			-->
			<div
			v-if="salteados_agrupados.length"
			class="recordatorio-masivo__salteados">

				<span class="recordatorio-masivo__rotulo">
					{{ numero_es(salteados.length) }} {{ salteados.length == 1 ? 'cliente salteado' : 'clientes salteados' }}
				</span>

				<div
				v-for="grupo in salteados_agrupados"
				:key="grupo.motivo"
				class="recordatorio-masivo__grupo">
					<p class="recordatorio-masivo__grupo-titulo">
						{{ numero_es(grupo.cantidad) }} {{ grupo.cantidad == 1 ? 'salteado' : 'salteados' }}:
						{{ grupo.mensaje }}
					</p>
					<p class="recordatorio-masivo__grupo-clientes">
						{{ grupo.nombres.join(', ') }}
					</p>
				</div>
			</div>
		</div>

		<template #modal-footer>
			<div class="recordatorio-masivo-footer">
				<b-button
				variant="outline-secondary"
				@click="cerrar">
					{{ paso == 'confirmar' ? 'Cancelar' : 'Cerrar' }}
				</b-button>
				<b-button
				v-if="paso == 'confirmar'"
				class="recordatorio-masivo-footer__enviar"
				variant="primary"
				:disabled="enviando || !total_clientes"
				@click="confirmar">
					<b-spinner
					v-if="enviando"
					small></b-spinner>
					Sí, enviar a {{ numero_es(total_clientes) }} {{ total_clientes == 1 ? 'cliente' : 'clientes' }}
				</b-button>
			</div>
		</template>

	</b-modal>
</div>
</template>
<script>
/*
	Cada cuánto y hasta cuándo se pregunta por el lote. 150 ticks de 2 segundos son 5 minutos:
	pasado eso el envío puede seguir, pero la pantalla deja de preguntar y manda al operador al
	módulo de WhatsApp, que es donde vive el resultado real.
*/
const INTERVALO_POLLING = 2000
const MAX_TICKS = 150

export default {
	props: {
		/**
		 * Clientes que se ven en pantalla con el filtro actual.
		 *
		 * El conteo de la confirmación lo pone el front a propósito: es el número que el usuario
		 * está viendo, y tiene que ser el mismo del que habla el modal. El resultado real
		 * (encolados y salteados) recién viene en el 202.
		 */
		total_clientes: {
			type: Number,
			default: 0,
		},
	},
	data() {
		return {
			paso: 'confirmar',
			/** Handle del setInterval. null cuando no hay polling corriendo. */
			timer: null,
			ticks: 0,
			polling_cortado: false,
		}
	},
	computed: {
		lote() {
			return this.$store.state.sale.recordatorio_cobro.lote
		},
		enviando() {
			return this.$store.state.sale.recordatorio_cobro.enviando
		},
		salteados() {
			return this.$store.state.sale.recordatorio_cobro.salteados
		},
		/**
		 * Los salteados juntados por motivo: "3 salteados: ya recibieron el recordatorio hoy".
		 *
		 * Agrupar y no listar uno por uno porque el motivo es la información útil (¿por qué no
		 * les llegó?), y con veinte clientes una lista plana no se lee. Los nombres van igual,
		 * abajo de cada grupo, para poder ir a buscar a uno en particular.
		 *
		 * @returns {Array}
		 */
		salteados_agrupados() {
			let grupos = []
			this.salteados.forEach(salteado => {
				let grupo = grupos.find(g => g.motivo == salteado.motivo)
				if (typeof grupo == 'undefined') {
					grupo = {
						motivo: salteado.motivo,
						mensaje: salteado.mensaje,
						cantidad: 0,
						nombres: [],
					}
					grupos.push(grupo)
				}
				grupo.cantidad++
				grupo.nombres.push(salteado.client_name)
			})
			return grupos
		},
		titulo_progreso() {
			if (!this.lote) {
				return ''
			}
			if (this.lote.terminado) {
				return 'Listo'
			}
			return 'Mandando los recordatorios'
		},
	},
	/**
	 * 🔴 El intervalo se limpia acá Y en el @hidden del modal, y hacen falta las dos.
	 *
	 * El @hidden no dispara si el usuario navega a otra pantalla con el modal abierto: en ese
	 * caso el componente se destruye sin que nadie cierre el modal, y sin este hook el
	 * setInterval queda vivo pegándole al servidor para siempre.
	 */
	beforeDestroy() {
		this.limpiar_polling()
	},
	methods: {
		al_abrir() {
			this.limpiar_polling()
			this.paso = 'confirmar'
			this.ticks = 0
			this.polling_cortado = false
			this.$store.commit('sale/recordatorio_cobro/reset')
		},
		al_cerrar() {
			this.limpiar_polling()
			this.$store.commit('sale/recordatorio_cobro/reset')
			this.paso = 'confirmar'
		},
		confirmar() {
			let self = this
			this.$store.dispatch('sale/recordatorio_cobro/enviarMasivo')
			.then(data => {
				self.paso = 'enviando'
				if (!data.encolados) {
					// Nadie quedó encolado: no hay job que mueva un contador, así que no hay
					// nada que sondear. Lo único que queda por leer son los salteados.
					self.$toast.warning('No se encoló ningún recordatorio.')
					return
				}
				self.$toast.success('Se encolaron ' + self.numero_es(data.encolados) + ' recordatorios.')
				self.arrancar_polling()
			})
			.catch(err => {
				let mensaje = 'No se pudo encolar el envío.'
				if (err && err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				if (err && err.response && err.response.status == 403) {
					mensaje = 'No tenés permiso para mandar recordatorios de cobro.'
				}
				self.$toast.error(mensaje)
			})
		},
		arrancar_polling() {
			let self = this
			this.ticks = 0
			this.polling_cortado = false
			this.timer = setInterval(function () {
				self.tick()
			}, INTERVALO_POLLING)
		},
		/**
		 * Un ciclo del progreso. Corta cuando el lote terminó, a los 150 ticks o si el endpoint
		 * de estado deja de responder: en los tres casos el envío sigue por su cuenta y lo que
		 * se apaga es la pantalla.
		 */
		tick() {
			let self = this
			this.ticks++
			if (this.ticks > MAX_TICKS) {
				this.polling_cortado = true
				this.limpiar_polling()
				return
			}
			this.$store.dispatch('sale/recordatorio_cobro/getEstadoLote')
			.then(lote => {
				if (!lote || lote.terminado) {
					self.limpiar_polling()
				}
			})
			.catch(() => {
				self.polling_cortado = true
				self.limpiar_polling()
			})
		},
		limpiar_polling() {
			if (this.timer !== null) {
				clearInterval(this.timer)
				this.timer = null
			}
		},
		cerrar() {
			this.$bvModal.hide('recordatorio-cobro-masivo')
		},
	}
}
</script>
<style lang="sass">
// 🔴 Ni un hexadecimal acá adentro: el modal se monta colgando de <body>, fuera de #app, y un
// color escrito a mano lo deja roto en modo oscuro. Sin `scoped`, por lo mismo.
.recordatorio-masivo
	color: var(--color-text-primary)

	&__conteo
		font-size: 1.15rem
		line-height: 1.5
		margin-bottom: 12px

	&__ayuda
		font-size: 0.85rem
		color: var(--color-text-secondary)
		margin-bottom: 10px

	&__rotulo
		font-size: 0.68rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)

	&__progreso
		display: flex
		flex-direction: column
		gap: 8px

	&__progreso-linea
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: 10px

	&__progreso-numeros
		font-size: 0.95rem
		font-weight: 700
		font-variant-numeric: tabular-nums

	&__contadores
		display: flex
		flex-wrap: wrap
		gap: 14px

	&__contador
		display: inline-flex
		align-items: center
		gap: 6px
		font-size: 0.85rem
		color: var(--color-text-secondary)

		&.is-error
			color: var(--btn-peligro-texto)
			font-weight: 600

	&__aviso
		display: flex
		align-items: flex-start
		gap: 8px
		margin-top: 14px
		padding: 12px 14px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-section)
		font-size: 0.85rem
		color: var(--color-text-secondary)

	&__salteados
		margin-top: 20px
		padding-top: 14px
		border-top: 1px solid var(--color-border-secondary)
		display: flex
		flex-direction: column
		gap: 10px

	&__grupo
		padding: 10px 12px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-section)

	&__grupo-titulo
		font-size: 0.88rem
		font-weight: 600
		margin-bottom: 4px

	&__grupo-clientes
		font-size: 0.8rem
		color: var(--color-text-secondary)
		margin-bottom: 0
		overflow-wrap: anywhere

.recordatorio-masivo-footer
	display: flex
	align-items: center
	gap: 10px
	width: 100%

	.btn
		height: 38px
		padding: 0 18px
		border-radius: 10px
		font-size: 0.875rem
		font-weight: 600
		line-height: 1
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 8px

		&:disabled
			opacity: 0.6
			cursor: default

	&__enviar
		margin-left: auto

@media (max-width: 576px)
	.recordatorio-masivo__conteo
		font-size: 1rem

	.recordatorio-masivo-footer
		flex-direction: column-reverse
		align-items: stretch

		.btn
			width: 100%

		&__enviar
			margin-left: 0
</style>
