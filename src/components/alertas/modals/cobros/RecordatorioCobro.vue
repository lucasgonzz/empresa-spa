<template>
<div>
	<b-modal
	id="recordatorio-cobro"
	size="lg"
	centered
	scrollable
	title="Recordatorio de cobro"
	@show="al_abrir"
	@hidden="al_cerrar">

		<div class="recordatorio-cobro">

			<!-- Cargando la previsualización. -->
			<div
			v-if="cargando"
			class="recordatorio-cobro__cargando">
				<b-spinner variant="primary"></b-spinner>
				<span>Armando el mensaje...</span>
			</div>

			<!--
				El 422 `sin_ventas` no es un error del sistema: es que el cliente dejó de tener
				ventas en el filtro entre que se pintó la pantalla y se abrió el modal. Se dice
				con todas las letras en vez de un toast rojo que no explica nada.
			-->
			<div
			v-else-if="error"
			class="recordatorio-cobro__error">
				<i class="bi bi-exclamation-triangle"></i>
				{{ error }}
			</div>

			<div v-else-if="preview">

				<!--
					🔴 El canal va PRIMERO y con la explicación al lado. Los dos caminos mandan
					contenidos distintos (el texto libre lista las ventas, la plantilla no), así
					que el operador tiene que saber cuál sale ANTES de confirmar, no después.
				-->
				<div class="recordatorio-cobro__canal">
					<span
					class="recordatorio-cobro__canal-chip"
					:class="clase_canal">
						<i class="bi" :class="icono_canal"></i>
						{{ etiqueta_canal }}
					</span>
					<p class="recordatorio-cobro__canal-ayuda">
						{{ ayuda_canal }}
					</p>
				</div>

				<!-- Resumen de qué se le está por mandar y por cuánta plata. -->
				<div class="recordatorio-cobro__resumen">
					<div class="recordatorio-cobro__resumen-item">
						<span class="recordatorio-cobro__rotulo">Cliente</span>
						<span class="recordatorio-cobro__valor">{{ preview.client_name }}</span>
					</div>
					<div class="recordatorio-cobro__resumen-item">
						<span class="recordatorio-cobro__rotulo">Teléfono</span>
						<span class="recordatorio-cobro__valor">{{ preview.phone || 'Sin teléfono' }}</span>
					</div>
					<div class="recordatorio-cobro__resumen-item">
						<span class="recordatorio-cobro__rotulo">Ventas pendientes</span>
						<span class="recordatorio-cobro__valor">{{ texto_ventas }}</span>
					</div>
				</div>

				<div
				v-if="totales_por_moneda.length"
				class="recordatorio-cobro__totales">
					<span
					v-for="total in totales_por_moneda"
					:key="total.moneda_id"
					class="recordatorio-cobro__total"
					:class="{'is-usd': total.moneda_id == 2}">
						{{ total.etiqueta }}
					</span>
				</div>

				<!--
					El mensaje EXACTO que va a salir, con el cliente, los montos y las ventas ya
					resueltos: nunca la plantilla con las variables sin reemplazar. Lo arma el
					backend y acá no se le toca ni una coma, porque si el front lo retocara
					mostraría una cosa y saldría otra.
				-->
				<div class="recordatorio-cobro__mensaje">
					<span class="recordatorio-cobro__rotulo">Mensaje</span>
					<div class="recordatorio-cobro__mensaje-body">{{ preview.body }}</div>
				</div>

				<div
				v-if="preview.documento_filename"
				class="recordatorio-cobro__adjunto">
					<i class="bi bi-paperclip"></i>
					<a
					v-if="preview.documento_url"
					:href="preview.documento_url"
					target="_blank">
						{{ preview.documento_filename }}
					</a>
					<span v-else>{{ preview.documento_filename }}</span>
				</div>

				<!--
					El mensaje va a salir sin un solo link. No es un bloqueo (el recordatorio
					sirve igual), pero sí es algo que el operador tiene que saber ANTES de
					mandarlo: el cliente no va a poder abrir ni el PDF de las ventas ni el
					resumen de cuenta, y sin este cartel el mensaje se ve perfectamente normal.
				-->
				<div
				v-if="sin_links"
				class="recordatorio-cobro__aviso">
					<i class="bi bi-link-45deg"></i>
					<span>
						{{ texto_sin_links }}
					</span>
				</div>

				<!--
					No se puede mandar: ya lo recibió hoy, no tiene teléfono, la plantilla no está
					aprobada. El motivo se muestra y el botón queda deshabilitado; no se esconde
					el modal ni se manda igual "por las dudas".
				-->
				<div
				v-if="!preview.puede_enviar"
				class="recordatorio-cobro__bloqueo">
					<i class="bi bi-slash-circle"></i>
					{{ preview.mensaje_motivo || 'No se le puede mandar el recordatorio a este cliente.' }}
				</div>
			</div>
		</div>

		<template #modal-footer>
			<div class="recordatorio-cobro-footer">
				<b-button
				variant="outline-secondary"
				@click="cerrar">
					Cancelar
				</b-button>
				<b-button
				class="recordatorio-cobro-footer__enviar"
				variant="primary"
				:disabled="!puede_enviar"
				@click="enviar">
					<b-spinner
					v-if="enviando"
					small></b-spinner>
					Enviar recordatorio
				</b-button>
			</div>
		</template>

	</b-modal>
</div>
</template>
<script>
export default {
	props: {
		/**
		 * Cliente de la fila desde la que se abrió el modal. Puede ser null antes del primer click.
		 *
		 * 🔴 NO renombrar a `client`: un mixin global (main.js -> common-vue mixins/app.js ->
		 * mixins/model_functions.js -> vender/select_payment_methods.js ->
		 * vender/guardar_venta/chequeos/payment_methods.js) define un `computed.client` que
		 * devuelve `store.state.vender.client`. En Vue 2 los computed se inicializan DESPUÉS que
		 * los props (`initComputed` corre después de `initProps`), así que un computed con el
		 * mismo nombre pisa la propiedad reactiva del prop: `this.client` quedaba siempre en lo
		 * que tuviera `store.state.vender.client` (típicamente null fuera de Vender), nunca en lo
		 * que mandaba este modal. Medido en vivo el 28/8/2026: `this.$props.client` traía el
		 * cliente real y `this.client` daba null en el mismo instante.
		 */
		cliente: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			cargando: false,
			error: null,
		}
	},
	computed: {
		preview() {
			return this.$store.state.sale.recordatorio_cobro.preview
		},
		enviando() {
			return this.$store.state.sale.recordatorio_cobro.enviando
		},
		totales_por_moneda() {
			if (!this.preview || !this.preview.totales_por_moneda) {
				return []
			}
			return this.preview.totales_por_moneda
		},
		es_texto_libre() {
			return this.preview && this.preview.canal == 'texto_libre'
		},
		etiqueta_canal() {
			return this.es_texto_libre ? 'Sale como texto libre' : 'Sale como plantilla de WhatsApp'
		},
		icono_canal() {
			return this.es_texto_libre ? 'bi-chat-dots' : 'bi-file-earmark-text'
		},
		clase_canal() {
			return this.es_texto_libre ? 'is-texto' : 'is-plantilla'
		},
		/**
		 * La explicación de la ventana de 24 h, en criollo.
		 *
		 * No es un detalle técnico de más: es la razón por la que el mensaje de abajo cambia de
		 * forma sin que el operador haya tocado nada. Sin esto, ve un texto largo con el listado
		 * de ventas para un cliente y uno corto sin listado para otro, y no tiene con qué
		 * explicárselo.
		 */
		ayuda_canal() {
			if (this.es_texto_libre) {
				return 'El cliente escribió en las últimas 24 horas, así que la ventana de WhatsApp está abierta y se le puede mandar un mensaje común, con el detalle de las ventas una por una.'
			}
			let texto = 'El cliente no escribió en las últimas 24 horas. Con la ventana cerrada, WhatsApp sólo deja mandar una plantilla aprobada por Meta: va más corta, sin el listado de ventas, y el detalle viaja en el resumen de cuenta corriente adjunto.'
			if (this.preview && this.preview.template_meta_name) {
				texto += ' Plantilla: ' + this.preview.template_meta_name + '.'
			}
			return texto
		},
		/**
		 * Cuántas ventas se le deben y qué pasa con el detalle, dicho sin mentir en NINGUNO de
		 * los dos caminos.
		 *
		 * Por plantilla el backend devuelve `ventas_listadas => 0` y `ventas_restantes => total`,
		 * y está bien que así sea: la plantilla no lista las ventas una por una (Meta rechaza los
		 * parámetros con saltos de línea), el detalle viaja en el resumen de cuenta adjunto. Con
		 * la condición vieja —el paréntesis colgado de `ventas_restantes > 0`— ese camino
		 * anunciaba "3 ventas (se listan las 0 más viejas)".
		 *
		 * @returns {String}
		 */
		texto_ventas() {
			if (!this.preview) {
				return ''
			}
			let total = this.preview.ventas_total
			let texto = this.numero_es(total) + (total == 1 ? ' venta' : ' ventas')
			if (!this.preview.ventas_listadas) {
				return texto + ' (no se listan una por una: el detalle va en el resumen de cuenta adjunto)'
			}
			if (this.preview.ventas_restantes > 0) {
				texto += ' (se listan las ' + this.numero_es(this.preview.ventas_listadas) + ' más viejas; el resto, en el resumen de cuenta)'
			}
			return texto
		},
		/**
		 * true cuando el mensaje va a salir sin un solo link.
		 *
		 * Pasa cuando el owner no tiene cargada la `api_url`: el backend arma el cuerpo igual,
		 * pero sin los renglones de las ventas ni el del PDF de cuenta corriente. En pantalla se
		 * ve un mensaje perfectamente normal, así que sin este aviso el operador no tiene forma
		 * de enterarse de que le está mandando al cliente un recordatorio pelado.
		 *
		 * Se resuelve con lo que ya viene en `preview`, sin campo nuevo: en texto libre los links
		 * van escritos en el cuerpo, y por plantilla el único "link" posible es el documento
		 * adjunto.
		 *
		 * @returns {Boolean}
		 */
		sin_links() {
			if (!this.preview) {
				return false
			}
			if (this.es_texto_libre) {
				return !this.preview.body || this.preview.body.indexOf('http') == -1
			}
			return !this.preview.documento_url
		},
		/**
		 * Qué le falta al mensaje y qué hay que hacer para que deje de faltarle.
		 *
		 * @returns {String}
		 */
		texto_sin_links() {
			if (this.es_texto_libre) {
				return 'El mensaje va a salir SIN los links a los PDF de las ventas ni al resumen de cuenta corriente. Suele ser porque falta cargar la dirección de la API del negocio en la configuración.'
			}
			return 'El mensaje va a salir SIN el resumen de cuenta corriente adjunto. Puede ser porque falta cargar la dirección de la API del negocio, o porque la cuenta corriente del cliente todavía no tiene movimientos.'
		},
		puede_enviar() {
			return !this.cargando
				&& !this.enviando
				&& !this.error
				&& this.preview !== null
				&& this.preview.puede_enviar
		},
	},
	methods: {
		/**
		 * Pide la previsualización cada vez que se abre el modal, sin cachear nada.
		 *
		 * El estado del cliente cambia solo: le pueden haber mandado el recordatorio desde otra
		 * pantalla, o pudo escribir y abrir la ventana de 24 h. Una preview vieja mostraría un
		 * canal que ya no es el que va a salir.
		 */
		al_abrir() {
			let self = this
			this.error = null
			this.$store.commit('sale/recordatorio_cobro/reset')
			if (!this.cliente) {
				this.error = 'No se pudo identificar el cliente.'
				return
			}
			this.cargando = true
			this.$store.dispatch('sale/recordatorio_cobro/getPreview', this.cliente.id)
			.then(preview => {
				/*
					🔴 `null` significa "este pedido quedó viejo": mientras estaba en vuelo se
					abrió el modal para otro cliente. El que manda es el pedido en curso, así que
					acá no se apaga el spinner ni se toca nada. La guarda de verdad está en la
					action del store (`getPreview`), que es la que impide que la preview de un
					cliente se dibuje arriba de la de otro.
				*/
				if (preview === null) {
					return
				}
				self.cargando = false
			})
			.catch(err => {
				self.cargando = false
				self.error = self.mensaje_de_error(err)
			})
		},
		al_cerrar() {
			this.error = null
			this.$store.commit('sale/recordatorio_cobro/reset')
		},
		/**
		 * Traduce el error de axios a algo que se pueda leer.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {String}
		 */
		mensaje_de_error(err) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			if (err && err.response && err.response.status == 403) {
				return 'No tenés permiso para mandar recordatorios de cobro.'
			}
			return 'No se pudo armar el recordatorio.'
		},
		enviar() {
			let self = this
			/*
				Último cinturón de la guarda anti-carrera: no se manda nada si lo que está
				dibujado en pantalla no es la preview de ESTE cliente. Se manda el mensaje que se
				leyó o no se manda nada.
			*/
			if (!this.preview || this.preview.client_id != this.cliente.id) {
				this.$toast.error('La previsualización no corresponde a este cliente. Volvé a abrir el recordatorio.')
				return
			}
			this.$store.dispatch('sale/recordatorio_cobro/enviar', this.cliente.id)
			.then(data => {
				/*
					El endpoint individual devuelve la MISMA forma que el masivo, así que puede
					volver con 0 encolados y el cliente en `salteados`: entre la preview y el
					POST alguien pudo mandarle el mismo recordatorio desde otra pantalla.
					Se avisa con el motivo del backend en vez de festejar un envío que no pasó.
				*/
				if (!data.encolados && data.salteados && data.salteados.length) {
					self.$toast.warning(data.salteados[0].mensaje)
				} else {
					self.$toast.success('Recordatorio encolado. Se manda en unos segundos.')
				}
				self.cerrar()
			})
			.catch(err => {
				self.$toast.error(self.mensaje_de_error(err))
			})
		},
		cerrar() {
			this.$bvModal.hide('recordatorio-cobro')
		},
	}
}
</script>
<style lang="sass">
// 🔴 Ni un hexadecimal, y ningún var(--x, #hex) tampoco: el modal se monta colgando de <body>,
// fuera de #app, y un color escrito a mano lo deja roto en modo oscuro. El fallback no ayuda,
// tapa el token faltante en vez de mostrarlo. Sin `scoped` por lo mismo de siempre: bootstrap-vue
// dibuja el modal fuera del árbol del componente.
.recordatorio-cobro
	color: var(--color-text-primary)

	&__cargando
		display: flex
		align-items: center
		gap: 10px
		padding: 24px 0
		color: var(--color-text-secondary)
		font-size: 0.9rem

	&__error,
	&__aviso,
	&__bloqueo
		display: flex
		align-items: flex-start
		gap: 8px
		padding: 12px 14px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-section)
		color: var(--btn-peligro-texto)
		font-size: 0.88rem
		font-weight: 600

	&__bloqueo
		margin-top: 14px

	// El aviso de "sin links" comparte la caja con el bloqueo a propósito: no impide mandar,
	// pero es una configuración faltante y tiene que leerse con el mismo peso, no como una nota
	// al pie. El peso menor se lo da el `font-weight`, no un color nuevo.
	&__aviso
		margin-top: 14px
		font-weight: 500
		line-height: 1.45

	// El canal es lo primero que se lee: es lo que explica por qué el mensaje de abajo tiene la
	// forma que tiene.
	&__canal
		padding: 12px 14px
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-section)
		margin-bottom: 16px

	&__canal-chip
		display: inline-flex
		align-items: center
		gap: 6px
		font-size: 0.78rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: 0.03em
		padding: 4px 10px
		border-radius: 999px

		&.is-texto
			background: var(--totales-acento-usd-bg)
			color: var(--totales-acento-usd)

		&.is-plantilla
			background: var(--totales-acento-principal-bg)
			color: var(--totales-acento-principal)

	&__canal-ayuda
		font-size: 0.82rem
		color: var(--color-text-secondary)
		margin: 8px 0 0

	&__resumen
		display: grid
		grid-template-columns: repeat(3, 1fr)
		gap: 12px
		margin-bottom: 14px

	&__resumen-item
		display: flex
		flex-direction: column
		min-width: 0

	&__rotulo
		font-size: 0.68rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary)

	&__valor
		font-size: 0.95rem
		font-weight: 600
		overflow-wrap: anywhere

	&__totales
		display: flex
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 16px

	&__total
		font-size: 1.05rem
		font-weight: 700
		padding: 6px 12px
		border-radius: 10px
		background: var(--totales-acento-principal-bg)
		color: var(--totales-acento-principal)
		font-variant-numeric: tabular-nums

		&.is-usd
			background: var(--totales-acento-usd-bg)
			color: var(--totales-acento-usd)

	&__mensaje
		display: flex
		flex-direction: column
		gap: 6px

	// `pre-wrap` y no <pre>: el body viene con saltos de línea que son parte del mensaje (el
	// listado de ventas va uno por renglón), pero la tipografía monoespaciada de <pre> lo haría
	// leer como un log en vez de como el WhatsApp que el cliente va a recibir.
	&__mensaje-body
		white-space: pre-wrap
		overflow-wrap: anywhere
		font-size: 0.9rem
		line-height: 1.55
		padding: 14px
		border: 1px solid var(--color-border)
		border-radius: 12px
		background: var(--bg-card)

	&__adjunto
		display: flex
		align-items: center
		gap: 8px
		margin-top: 10px
		font-size: 0.85rem
		color: var(--color-text-secondary)
		overflow-wrap: anywhere

.recordatorio-cobro-footer
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
	.recordatorio-cobro__resumen
		grid-template-columns: 1fr
		gap: 8px

	.recordatorio-cobro-footer
		flex-direction: column-reverse
		align-items: stretch

		.btn
			width: 100%

		&__enviar
			margin-left: 0
</style>
