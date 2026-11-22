<template>
	<!--
		Aviso de la demanda no satisfecha (misión demanda-sin-stock-vender). Tarjeta fija, NO modal y sin
		tomar el foco: el lector de códigos sigue escribiendo en #article-bar-code. Se muestra cuando el
		store tiene un aviso (lo carga el mixin demanda_sin_stock tras guardar el freno en la API).
	-->
	<div
	v-if="aviso"
	class="aviso-demanda-sin-stock"
	role="status"
	aria-live="polite"
	data-tour="vender.aviso_demanda_sin_stock">
		<p class="aviso-demanda-sin-stock__titulo">{{ texto.titulo }}</p>
		<p class="aviso-demanda-sin-stock__cuerpo">{{ texto.cuerpo }}</p>
		<p class="aviso-demanda-sin-stock__pregunta">{{ texto.pregunta }}</p>
		<div class="aviso-demanda-sin-stock__acciones">
			<button
			type="button"
			class="btn btn-sm btn-outline-secondary"
			:disabled="cancelando"
			@click="cancelar">
				Cancelar
			</button>
			<button
			type="button"
			class="btn btn-sm btn-primary"
			:disabled="cancelando"
			@click="cerrar">
				Entendido
			</button>
		</div>
	</div>
</template>
<script>
import { texto_del_aviso } from '@/utils/demanda_sin_stock'

/** Milisegundos que el aviso queda visible antes de irse solo. */
export const DURACION_AVISO_MS = 12000

export default {
	data() {
		return {
			// Temporizador del cierre automático (null = no hay uno corriendo).
			temporizador: null,
			// true mientras se cancelan los registros (deshabilita los botones; no usa el loading global).
			cancelando: false,
		}
	},
	computed: {
		/** Aviso vigente del store o null. */
		aviso() {
			return this.$store.state.demanda_sin_stock.aviso
		},
		/** Textos (título, cuerpo, pregunta) del aviso vigente. */
		texto() {
			return texto_del_aviso(this.aviso)
		},
	},
	watch: {
		/**
		 * Cada aviso nuevo (o su reemplazo) reinicia la cuenta de los 12 segundos.
		 *
		 * @param {object|null} aviso Aviso nuevo.
		 */
		aviso(aviso) {
			this.detener_temporizador()
			if (aviso) {
				this.arrancar_temporizador()
			}
		},
	},
	/**
	 * Un aviso que ya estaba en el store al montar (el vendedor salió de Vender y volvió, o el POST
	 * terminó cuando el componente no existía) no dispara el `watch`: se arranca la cuenta acá para que
	 * "se va sola a los 12 s" se cumpla siempre.
	 */
	mounted() {
		if (this.aviso) {
			this.arrancar_temporizador()
		}
	},
	/**
	 * Decisión: el aviso vive en el store global pero el temporizador es local, así que al destruir el
	 * componente se limpia también el aviso. Es lo más simple y robusto: no puede quedar una tarjeta
	 * "huérfana" sin cuenta regresiva. Si el POST vuelve después de salir, el aviso queda en el store y
	 * el `mounted` de la próxima visita a Vender lo limpia a los 12 s.
	 */
	beforeDestroy() {
		this.detener_temporizador()
		this.$store.commit('demanda_sin_stock/limpiar_aviso')
	},
	methods: {

		/**
		 * Arranca la cuenta de DURACION_AVISO_MS que cierra el aviso solo (reemplaza la anterior).
		 */
		arrancar_temporizador() {
			let self = this
			this.detener_temporizador()
			this.temporizador = setTimeout(function () {
				self.cerrar()
			}, DURACION_AVISO_MS)
		},

		/**
		 * Cancela el temporizador del cierre automático, si hay uno.
		 */
		detener_temporizador() {
			if (this.temporizador !== null) {
				clearTimeout(this.temporizador)
				this.temporizador = null
			}
		},

		/**
		 * Cierra el aviso sin tocar la API ("Entendido" o tiempo cumplido).
		 */
		cerrar() {
			this.detener_temporizador()
			this.$store.commit('demanda_sin_stock/limpiar_aviso')
		},

		/**
		 * "Cancelar": el vendedor se equivocó y no quiere la sugerencia. Hace un PUT
		 * `unmet-demand/{id}/cancel` por cada registro del aviso. Si todos salen bien limpia el aviso y
		 * avisa el éxito; si alguno falla el aviso queda (para reintentar) y sale un toast de error.
		 *
		 * @returns {Promise} Promesa que nunca rechaza.
		 */
		cancelar() {

			let self = this
			let aviso = this.$store.state.demanda_sin_stock.aviso
			if (!aviso || this.cancelando) {
				return Promise.resolve()
			}

			this.cancelando = true

			// Una promesa por id que resuelve true si se canceló y false si falló.
			let promesas = []
			aviso.ids.forEach(id => {
				promesas.push(
					// Banderas de silencio como en el POST del mixin: sólo sale el toast propio si falla.
					self.$api.put('unmet-demand/' + id + '/cancel', {}, { skip_global_error_event: true, skip_global_validation_toast: true })
					.then(() => true)
					.catch(() => false)
				)
			})

			return Promise.all(promesas).then(resultados => {

				self.cancelando = false

				let todos_ok = resultados.filter(ok => !ok).length === 0
				if (todos_ok) {
					self.detener_temporizador()
					self.$store.commit('demanda_sin_stock/limpiar_aviso')
					self.$toast.success('Listo, no se guarda como sugerencia de compra')
				} else {
					self.$toast.error('No se pudo cancelar, probá de nuevo')
				}
			})
		},
	},
}
</script>
<style scoped lang="sass">
/* Tarjeta fija arriba a la derecha, bajo la topbar; por debajo de los modales de bootstrap */
.aviso-demanda-sin-stock
	position: fixed
	top: 56px
	right: 16px
	z-index: 1035
	width: 380px
	max-width: calc(100vw - 32px)
	box-sizing: border-box
	padding: 14px 16px
	background: var(--bg-card, #fff)
	color: var(--color-text-primary, #212529)
	border: 1px solid var(--color-border-tertiary, #dee2e6)
	border-radius: 12px
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12)

	p
		margin: 0

	&__titulo
		font-weight: 600
		font-size: 0.95rem
		margin-bottom: 4px

	&__cuerpo
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)
		line-height: 1.4

	&__pregunta
		font-size: 0.85rem
		margin-top: 8px

	&__acciones
		display: flex
		justify-content: flex-end
		gap: 8px
		margin-top: 12px

/* Teléfono: a lo ancho con 16px de margen y botones de al menos 44px de alto */
@media (max-width: 575px)
	.aviso-demanda-sin-stock
		left: 16px
		right: 16px
		width: auto

		&__acciones .btn
			min-height: 44px
			flex: 1
</style>
