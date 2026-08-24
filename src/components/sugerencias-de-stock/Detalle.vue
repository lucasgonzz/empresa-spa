<template>
	<div class="sugerencia-detalle">

		<div class="j-between align-center p-t-15 m-b-15">
			<h4 class="m-b-0">
				<b-button
				variant="outline-secondary"
				class="btn-modulo m-r-10"
				@click="volver">
					<i class="bi bi-arrow-left"></i>
					Volver
				</b-button>
				Sugerencia #{{ $route.params.id }}
			</h4>
			<b-badge
			v-if="sugerencia"
			:variant="estado_variant">
				{{ estado_texto }}
			</b-badge>
		</div>

		<div
		v-if="loading && !sugerencia"
		class="text-center m-t-30">
			<b-spinner></b-spinner>
		</div>

		<template v-if="sugerencia">

			<!-- Parametros con los que se corrio la sugerencia -->
			<p class="text-muted sugerencia-detalle__parametros">
				Generada el {{ date(sugerencia.created_at, true) }}
				· Objetivo: <strong>{{ sugerencia.modo }}</strong>
				· Origen: <strong>{{ sugerencia.origen }}</strong>
				· Limite: <strong>{{ sugerencia.limite_origen }}</strong>
				· {{ sugerencia.origen_generacion == 'automatica' ? 'Generacion automatica' : 'Generacion manual' }}
			</p>

			<!--
				reintentado: el boton "Reintentar" del resumen ya dejo el estado en
				pendiente en el backend; recargar aca re-arma el polling existente,
				que es el que va a levantar el resumen nuevo cuando este.
			-->
			<resumen-ia
			:sugerencia="sugerencia"
			@reintentado="cargar"></resumen-ia>

			<b-alert
			v-if="sugerencia.status == 'pendiente'"
			show
			variant="warning">
				La sugerencia se esta generando. Esta pantalla se actualiza sola cuando termine.
			</b-alert>

			<b-alert
			v-else-if="sugerencia.status == 'error'"
			show
			variant="danger">
				La generacion fallo{{ sugerencia.error_mensaje ? ': ' + sugerencia.error_mensaje : '.' }}
			</b-alert>

			<template v-else-if="sugerencia.status == 'terminado'">
				<filtros></filtros>
				<tabla-priorizada
				:stock_suggestion_id="sugerencia.id"></tabla-priorizada>
			</template>

		</template>

	</div>
</template>
<script>
/*
	Detalle de una sugerencia: cabecera con estado y parametros, resumen IA arriba,
	filtros y la tabla priorizada paginada server-side. Mientras la corrida o el
	resumen sigan pendientes, la pantalla se refresca sola con un polling suave que
	se cancela al salir.
*/
export default {
	components: {
		ResumenIa: () => import('@/components/sugerencias-de-stock/ResumenIa'),
		Filtros: () => import('@/components/sugerencias-de-stock/Filtros'),
		TablaPriorizada: () => import('@/components/sugerencias-de-stock/TablaPriorizada'),
	},
	data() {
		return {
			sugerencia: null,
			loading: false,
			// Timer del polling; se guarda para poder cancelarlo al salir de la vista.
			poll_timer: null,
			// true una vez pedida la primera pagina de lineas, para no re-pedirla en cada poll.
			articulos_pedidos: false,
			/*
				true desde beforeDestroy: un .then de cargar() que llegue con la vista
				ya cerrada no debe re-programar el timer (resucitaria el polling que
				beforeDestroy acababa de cancelar y quedaria girando sin pantalla).
			*/
			destruido: false,
		}
	},
	computed: {
		estado_variant() {
			if (this.sugerencia.status == 'terminado') {
				return 'success'
			}
			if (this.sugerencia.status == 'error') {
				return 'danger'
			}
			return 'warning'
		},
		estado_texto() {
			if (this.sugerencia.status == 'terminado') {
				return 'Terminada'
			}
			if (this.sugerencia.status == 'error') {
				return 'Con error'
			}
			return 'Generando…'
		},
	},
	watch: {
		/**
		 * Si se navega de un detalle a otro (ej: desde la notificacion global con la
		 * vista ya abierta), se recarga todo para la sugerencia nueva.
		 */
		'$route.params.id'(value) {
			if (value) {
				this.iniciar()
			}
		},
	},
	created() {
		this.iniciar()
	},
	beforeDestroy() {
		this.destruido = true
		this.cancelar_poll()
	},
	methods: {
		/**
		 * Arranque limpio del detalle: resetea los filtros de la tabla (para no
		 * arrastrar los del detalle anterior) y carga la sugerencia.
		 */
		iniciar() {
			this.cancelar_poll()
			this.sugerencia = null
			this.articulos_pedidos = false
			this.$store.commit('stock_suggestion_article/set_filtros', {
				from_address_id: 0,
				to_address_id: 0,
				order: 'prioridad',
			})
			this.$store.commit('stock_suggestion_article/set_articles', [])
			this.cargar()
		},
		/**
		 * Trae la sugerencia del backend. Si quedo pendiente (la corrida o el resumen
		 * IA), programa una recarga; si esta terminada, pide la primera pagina de
		 * lineas una sola vez.
		 */
		cargar() {
			let self = this
			this.loading = true
			this.$api.get('stock-suggestion/' + this.$route.params.id)
			.then(function(res) {
				self.loading = false
				self.sugerencia = res.data.model

				if (self.sugerencia.status == 'terminado' && !self.articulos_pedidos) {
					self.articulos_pedidos = true
					self.$store.dispatch('stock_suggestion_article/getArticles', {
						stock_suggestion_id: self.sugerencia.id,
						page: 1,
					})
				}

				// El guard de destruido evita resucitar el timer si la respuesta
				// llego con el componente ya desmontado.
				if (self.debe_seguir_polleando() && !self.destruido) {
					self.programar_poll()
				}
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
			})
		},
		/**
		 * Hay que seguir refrescando mientras la corrida este generandose o el
		 * resumen IA este en camino. Un estado 'error' o 'listo' del resumen, o una
		 * corrida terminada sin resumen pendiente, cortan el ciclo.
		 */
		debe_seguir_polleando() {
			if (!this.sugerencia) {
				return false
			}
			if (this.sugerencia.status == 'pendiente') {
				return true
			}
			return this.sugerencia.resumen_ia_estado == 'pendiente'
		},
		/**
		 * Programa la proxima recarga. 8 segundos: lo bastante seguido para que el
		 * fin de la corrida se vea sin F5, lo bastante espaciado para no castigar
		 * al backend mientras procesa chunks.
		 */
		programar_poll() {
			let self = this
			this.cancelar_poll()
			this.poll_timer = setTimeout(function() {
				self.cargar()
			}, 8000)
		},
		/**
		 * Cancela el polling pendiente (al salir de la vista o al reiniciar).
		 */
		cancelar_poll() {
			if (this.poll_timer) {
				clearTimeout(this.poll_timer)
				this.poll_timer = null
			}
		},
		/**
		 * Vuelve al listado de sugerencias.
		 */
		volver() {
			this.$router.push({name: 'sugerencias_stock'})
		},
	}
}
</script>
<style lang="sass">
.sugerencia-detalle
	&__parametros
		font-size: .9rem
</style>
