<template>
<transition name="import-status">
	<div
	v-if="visible && proceso"
	id="import-status"
	class="import-status"
	:class="{ 'import-status--minimizada': minimizada, 'import-status--fallo': es_fallo }"
	data-testid="import-status"
	:data-status="proceso.status">

		<!-- Pestaña para achicar la tarjeta contra el borde derecho y volver a abrirla. -->
		<button
		type="button"
		class="import-status__toggle"
		data-testid="import-status-minimizar"
		:title="minimizada ? 'Mostrar la importación' : 'Minimizar'"
		@click="alternar_minimizada">
			<i :class="minimizada ? 'bi bi-chevron-left' : 'bi bi-chevron-right'"></i>
		</button>

		<!--
			Los numeros (lote, creados, actualizados, coincidencias, proveedor) los muestra el mismo
			componente que el detalle del modal de procesos: una sola lectura para los dos.
		-->
		<detalle-importacion
		:proceso="proceso"
		:referencia="referencia"
		compacto></detalle-importacion>

		<!--
			🔴 Pie del estado 'fallo'. La tarjeta de una importación fallida NO se auto-oculta: se
			queda hasta que el usuario la cierre, con a dónde ir a ver qué pasó (el historial guarda
			el mensaje de error de cada importación). Antes se iba sola a los 5 segundos y se llevaba
			el único rastro de que algo salió mal.
		-->
		<div
		v-if="es_fallo"
		class="import-status__acciones">
			<b-button
			size="sm"
			variant="outline-danger"
			data-testid="import-status-ver-detalle"
			@click="ver_detalle">
				Ver detalle
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			data-testid="import-status-cerrar"
			@click="cerrar_tarjeta">
				Cerrar
			</b-button>
		</div>

	</div>
</transition>
</template>
<script>
/** Milisegundos que la tarjeta se queda despues de completar antes de irse sola. */
const MS_HASTA_OCULTAR = 5000

/**
 * Tarjeta flotante (abajo a la derecha) con el avance de la importacion de articulos en curso.
 *
 * Rediseñada en la mision procesos-en-segundo-plano (18/9/2026) con la misma familia visual que
 * la pildora y el modal de procesos. El comportamiento es el de siempre: aparece cuando llega un
 * `ImportStatus` (evento `.ImportStatusUpdated`, store import_status, que no cambio), se va sola
 * 5 s despues de completar, y en `fallo` se queda con "Ver detalle" y "Cerrar".
 *
 * El `proceso` que se le da al detalle sale, en este orden:
 *  1. del registro nuevo de procesos (store background_processes), si hay uno cuya referencia es
 *     ESTE ImportStatus: trae etapa, porcentaje y resultado tal como los calcula la API;
 *  2. si no, se arma aca a partir del ImportStatus (API vieja, o el evento nuevo todavia no
 *     llego): total/procesados son los chunks y los numeros van en `resultado`.
 * En los dos casos la `referencia` es el ImportStatus mismo, asi los numeros se leen de ahi.
 */
export default {
	components: {
		DetalleImportacion: () => import('@/components/common/procesos-en-segundo-plano/detalle/Importacion'),
	},
	data() {
		return {
			/** Controla si la tarjeta esta en pantalla (entra/sale con animacion). */
			visible: false,
			/** Achicada contra el borde derecho: queda solo la pestaña. */
			minimizada: false,
			/** Timer que la esconde a los 5 s de completar. */
			timer_ocultar: null,
		}
	},
	computed: {
		import_status() {
			return this.$store.state.import_status.model
		},
		/**
		 * El proceso del registro nuevo que apunta a este ImportStatus, si existe (SPA nueva +
		 * API nueva). El store background_processes es del SPA de empresa: se chequea que exista.
		 *
		 * @returns {Object|null}
		 */
		proceso_del_registro() {
			if (!this.import_status || !this.$store.state.background_processes) {
				return null
			}
			let modelos = this.$store.state.background_processes.models
			return modelos.find(proceso => {
				return proceso.referencia_type === 'App\\Models\\ImportStatus'
					&& Number(proceso.referencia_id) === Number(this.import_status.id)
			}) || null
		},
		/**
		 * Proceso armado a partir del ImportStatus, con las claves del contrato de procesos. Es el
		 * respaldo cuando el registro nuevo no tiene (todavia) a esta importacion.
		 *
		 * @returns {Object|null}
		 */
		proceso_armado() {
			let import_status = this.import_status
			if (!import_status) {
				return null
			}

			let total = Number(import_status.total_chunks) || null
			let procesados = Number(import_status.processed_chunks) || 0
			let porcentaje = null

			if (import_status.status === 'completado') {
				porcentaje = 100
			} else if (total) {
				porcentaje = Math.min(100, Math.round(procesados * 100 / total))
			}

			return {
				id: null,
				tipo: import_status.provider_order_id ? 'importacion_compra' : 'importacion_articulos',
				titulo: 'Importación de artículos',
				detalle: import_status.provider && import_status.provider.name ? 'Proveedor ' + import_status.provider.name : null,
				status: import_status.status,
				total: total,
				procesados: procesados,
				porcentaje: porcentaje,
				etapa: total ? 'Lote ' + this.numero_es(Math.min(procesados, total)) + ' de ' + this.numero_es(total) : null,
				unidad: 'lotes',
				error_message: import_status.error_message || null,
				started_at: import_status.created_at || null,
				finished_at: import_status.terminado_at || null,
				resultado: {
					filas_procesadas: import_status.filas_procesadas,
					creados: import_status.created_models,
					actualizados: import_status.updated_models,
					coincidencias: import_status.articles_match,
					repetidos: import_status.articles_repetidos,
				},
			}
		},
		proceso() {
			return this.proceso_del_registro || this.proceso_armado
		},
		/** El ImportStatus como referencia: los numeros salen de aca, en los dos caminos. */
		referencia() {
			if (!this.import_status) {
				return null
			}
			return { import_status: this.import_status, import_history: null }
		},
		es_fallo() {
			return !!this.import_status && this.import_status.status === 'fallo'
		},
		/** Termino bien: todos los chunks procesados o el status lo dice. */
		termino() {
			if (!this.import_status) {
				return false
			}
			if (this.import_status.status === 'completado') {
				return true
			}
			let total = Number(this.import_status.total_chunks) || 0
			return total > 0 && Number(this.import_status.processed_chunks) >= total
		},
	},
	watch: {
		import_status() {
			if (!this.import_status) {
				// Alguien limpio el store (el timer de abajo, o "Cerrar"): la tarjeta se va.
				this.ocultar_tarjeta()
				return
			}

			/*
			 * 🔴 'fallo' va primero y con `return`: una importación fallida puede tener
			 * processed_chunks == total_chunks, y si no, caería en la rama de "terminó" y se
			 * auto-ocultaría igual, llevándose el único rastro de que algo salió mal.
			 */
			if (this.es_fallo) {
				this.cancelar_ocultado()
				this.mostrar_tarjeta()
				return
			}

			this.mostrar_tarjeta()

			if (this.termino && !this.timer_ocultar) {
				// Un solo timer aunque lleguen varios eventos del cierre (cada chunk emite dos).
				this.timer_ocultar = setTimeout(() => {
					this.timer_ocultar = null
					this.ocultar_tarjeta()
					this.$store.commit('import_status/setModel', null)
				}, MS_HASTA_OCULTAR)
			}
		},
	},
	beforeDestroy() {
		this.cancelar_ocultado()
	},
	methods: {
		/**
		 * Abre el historial de importaciones, que es donde está el mensaje de error de la
		 * importación que falló. El modal `import-history` está montado en las mismas pantallas
		 * que esta tarjeta (lo monta ExcelDropDown, y en compras el modal de importación).
		 *
		 * @return {void}
		 */
		ver_detalle() {
			this.$bvModal.show('import-history')
		},
		/**
		 * Cierra la tarjeta de una importación fallida y limpia el estado del store.
		 *
		 * @return {void}
		 */
		cerrar_tarjeta() {
			this.cancelar_ocultado()
			this.ocultar_tarjeta()
			this.$store.commit('import_status/setModel', null)
		},
		alternar_minimizada() {
			this.minimizada = !this.minimizada
		},
		mostrar_tarjeta() {
			if (!this.visible) {
				// Cada importacion nueva arranca desplegada, aunque la anterior se haya minimizado.
				this.minimizada = false
			}
			this.visible = true
		},
		ocultar_tarjeta() {
			this.visible = false
		},
		cancelar_ocultado() {
			clearTimeout(this.timer_ocultar)
			this.timer_ocultar = null
		},
	}
}
</script>
<style lang="sass">
// Misma familia que la pildora y el modal de procesos: fondo y borde por token, radio 14 px,
// sombra suave. Abajo a la derecha, como siempre estuvo.
.import-status
	position: fixed
	bottom: 50px
	right: 24px
	width: 340px
	max-width: calc(100vw - 24px)
	z-index: 1000
	padding: 16px 18px
	border-radius: 14px
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border, #dee2e6)
	box-shadow: 0 12px 36px rgba(0, 0, 0, .14)
	text-align: left
	transition: transform .32s cubic-bezier(.22, .61, .36, 1), box-shadow .18s ease

	// La regla global de _inputs.sass le pone box-shadow a los button: adentro no.
	button
		box-shadow: none

// Minimizada: se corre hacia la derecha hasta dejar solo la pestaña asomando.
.import-status--minimizada
	transform: translateX(calc(100% + 12px))

.import-status__toggle
	position: absolute
	left: -14px
	top: 14px
	width: 28px
	height: 28px
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 50%
	padding: 0
	display: flex
	align-items: center
	justify-content: center
	font-size: 11px
	background: var(--bg-card, #fff)
	color: var(--color-text-secondary, #6c757d)
	cursor: pointer
	transition: background .15s ease, color .15s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)
		color: var(--color-text-primary, #212529)

.import-status__acciones
	display: flex
	flex-direction: row
	gap: 8px
	margin-top: 14px
	padding-top: 12px
	border-top: 1px solid var(--color-border-secondary, #e9ecef)

// Entrada y salida: desde el borde derecho, igual que la pildora.
.import-status-enter, .import-status-leave-to
	opacity: 0
	transform: translateX(28px) scale(.97)

.import-status-enter-active, .import-status-leave-active
	transition: opacity .3s ease, transform .36s cubic-bezier(.22, .61, .36, 1)

@media (max-width: 767px)
	.import-status
		right: 12px
		bottom: 16px
		width: calc(100vw - 24px)

html.dark-mode
	.import-status
		box-shadow: 0 12px 36px rgba(0, 0, 0, .5)
</style>
