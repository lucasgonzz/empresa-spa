<template>
	<div class="ofertas-detalle">

		<div class="j-between align-center p-t-15 m-b-15">
			<h4 class="m-b-0">
				<b-button
				variant="outline-secondary"
				class="btn-modulo m-r-10"
				@click="volver">
					<i class="bi bi-arrow-left"></i>
					Volver
				</b-button>
				Ofertas sugeridas #{{ $route.params.id }}
			</h4>
			<b-badge
			v-if="corrida"
			:variant="estado.variant">
				{{ estado.texto }}
			</b-badge>
		</div>

		<div
		v-if="loading && !corrida"
		class="text-center m-t-30">
			<b-spinner></b-spinner>
		</div>

		<template v-if="corrida">

			<!-- Parametros con los que corrio el motor -->
			<p class="text-muted ofertas-detalle__parametros">
				Generada el {{ date(corrida.created_at, true) }}
				· Historial mirado: <strong>{{ corrida.dias_historial_afinidad }} dias</strong>
				· Cliente dormido a los <strong>{{ corrida.dias_inactividad_reactivacion }} dias</strong>
				· Carritos de los ultimos <strong>{{ corrida.dias_carrito_abandonado }} dias</strong>
				· Hasta <strong>{{ corrida.max_ofertas_por_cliente }}</strong> ofertas por cliente
				· Vigencia sugerida: <strong>{{ corrida.dias_vigencia_sugerida }} dias</strong>
				· {{ corrida.origen_generacion == 'automatica' ? 'Generacion automatica' : 'Generacion manual' }}
			</p>

			<!--
				reintentado: el boton "Reintentar" del resumen ya dejo el estado en
				pendiente en el backend; recargar aca re-arma el polling existente,
				que es el que va a levantar el resumen nuevo cuando este.
			-->
			<resumen-ia
			:corrida="corrida"
			@reintentado="cargar"></resumen-ia>

			<!--
				Los clientes que quedaron afuera por deber plata. No es un detalle
				tecnico ni una estadistica de relleno: es lo que le muestra al
				comerciante que el motor tuvo criterio y no le fue a ofrecer un
				descuento a alguien que le debe una venta sin cobrar. Se muestra
				aunque sea 0 mientras la corrida este terminada, porque "a nadie le
				debe nadie" tambien es informacion.
			-->
			<b-alert
			v-if="corrida.status == 'terminado' && corrida.total_clientes_excluidos_por_deuda !== null"
			show
			variant="secondary"
			class="ofertas-detalle__excluidos">
				<i class="bi bi-shield-check m-r-5"></i>
				{{ leyenda_excluidos }}
			</b-alert>

			<!--
				La otra mitad de la misma pregunta, del lado de los articulos: a
				cuantos el motor no les pudo calcular un descuento seguro, y por que.
				No es una estadistica de relleno: "200 no tienen el costo cargado" es
				una tarea concreta, y es la unica forma de que el comerciante se
				entere de que tiene el catalogo a medio cargar. Solo aparece si hubo
				alguna: una corrida limpia no necesita decir que no excluyo nada.
			-->
			<b-alert
			v-if="corrida.status == 'terminado' && exclusiones.length"
			show
			variant="secondary"
			class="ofertas-detalle__excluidos">
				<i class="bi bi-exclamation-triangle m-r-5"></i>
				{{ leyenda_articulos_excluidos }}
				<ul class="m-b-0 m-t-5">
					<li
					v-for="exclusion in exclusiones"
					:key="exclusion.motivo">
						<strong>{{ numero_es(exclusion.cantidad) }}</strong> {{ exclusion.texto }}
					</li>
				</ul>
			</b-alert>

			<b-alert
			v-if="corrida.status == 'pendiente'"
			show
			variant="warning">
				El motor esta buscando ofertas. Esta pantalla se actualiza sola cuando termine.
			</b-alert>

			<b-alert
			v-else-if="corrida.status == 'error'"
			show
			variant="danger">
				La busqueda fallo{{ corrida.error_mensaje ? ': ' + corrida.error_mensaje : '.' }}
			</b-alert>

			<template v-else-if="corrida.status == 'terminado'">
				<filtros></filtros>
				<tabla-sugeridas
				:offer_suggestion_id="corrida.id"
				@activada="cargar"></tabla-sugeridas>
			</template>

		</template>

	</div>
</template>
<script>
/*
	Detalle de una corrida del motor de ofertas: cabecera con estado y
	parametros, resumen IA, la leyenda de clientes excluidos por deuda, y abajo
	los filtros con la tabla de ofertas sugeridas paginada server-side. Mientras
	la corrida o el resumen sigan pendientes, la pantalla se refresca sola con un
	polling suave que se cancela al salir. Molde identico a
	sugerencias-de-compra/Detalle.vue (mismo timing, mismos guards).
*/
export default {
	components: {
		ResumenIa: () => import('@/components/ofertas/ResumenIa'),
		Filtros: () => import('@/components/ofertas/Filtros'),
		TablaSugeridas: () => import('@/components/ofertas/TablaSugeridas'),
	},
	data() {
		return {
			corrida: null,
			loading: false,
			// Timer del polling; se guarda para poder cancelarlo al salir de la vista.
			poll_timer: null,
			// true una vez pedida la primera pagina de lineas, para no re-pedirla en cada poll.
			lineas_pedidas: false,
			/*
				true desde beforeDestroy: un .then de cargar() que llegue con la vista
				ya cerrada no debe re-programar el timer (resucitaria el polling que
				beforeDestroy acababa de cancelar y quedaria girando sin pantalla).
			*/
			destruido: false,
		}
	},
	computed: {
		estado() {
			if (this.corrida.status == 'terminado') {
				return {variant: 'success', texto: 'Terminada'}
			}
			if (this.corrida.status == 'error') {
				return {variant: 'danger', texto: 'Con error'}
			}
			return {variant: 'warning', texto: 'Buscando…'}
		},
		/**
		 * La leyenda de excluidos, con el singular resuelto: "1 clientes quedaron"
		 * queda mal escrito y esta linea la lee el comerciante, no un programador.
		 */
		leyenda_excluidos() {
			let cantidad = Number(this.corrida.total_clientes_excluidos_por_deuda)
			if (!cantidad) {
				return 'Ningun cliente quedo afuera por deuda: no hay ventas sin cobrar que frenen una oferta.'
			}
			if (cantidad == 1) {
				return '1 cliente quedo afuera porque tiene ventas sin cobrar.'
			}
			return this.numero_es(cantidad) + ' clientes quedaron afuera porque tienen ventas sin cobrar.'
		},
		/*
			El desglose de articulos excluidos ya viene explicado del backend
			(OfferSuggestion::$appends -> exclusiones_explicadas): el texto de cada
			motivo vive en OfertaSugeridaService::texto_de_exclusion() y de ahi lo
			leen tanto esta pantalla como el bloque de datos de la IA. Aca no se
			traduce nada, para que no haya dos redacciones del mismo motivo.
		*/
		exclusiones() {
			if (!Array.isArray(this.corrida.exclusiones_explicadas)) {
				return []
			}
			return this.corrida.exclusiones_explicadas
		},
		/**
		 * El encabezado del desglose, con el singular resuelto como el de los
		 * clientes: esta linea la lee el comerciante, no un programador.
		 */
		leyenda_articulos_excluidos() {
			let total = this.exclusiones.reduce((suma, e) => suma + Number(e.cantidad), 0)
			if (total == 1) {
				return '1 articulo quedo afuera porque no se le puede calcular un descuento seguro:'
			}
			return this.numero_es(total) + ' articulos quedaron afuera porque no se les puede calcular un descuento seguro:'
		},
	},
	watch: {
		/**
		 * Si se navega de un detalle a otro (ej: desde la notificacion global con la
		 * vista ya abierta), se recarga todo para la corrida nueva.
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
		 * arrastrar los del detalle anterior) y carga la corrida.
		 */
		iniciar() {
			this.cancelar_poll()
			this.corrida = null
			this.lineas_pedidas = false
			this.$store.commit('offer_suggestion_line/set_filtros', {
				client_id: 0,
				criterio: '',
				solo_sin_activar: false,
				order: 'prioridad',
			})
			this.$store.commit('offer_suggestion_line/set_lines', [])
			this.cargar()
		},
		/**
		 * Trae la corrida del backend. Si quedo pendiente (la busqueda o el resumen
		 * IA), programa una recarga; si esta terminada, pide la primera pagina de
		 * lineas una sola vez.
		 */
		cargar() {
			let self = this
			this.loading = true
			this.$api.get('offer-suggestion/' + this.$route.params.id)
			.then(function(res) {
				self.loading = false
				self.corrida = res.data.model

				if (self.corrida.status == 'terminado' && !self.lineas_pedidas) {
					self.lineas_pedidas = true
					self.$store.dispatch('offer_suggestion_line/getLines', {
						offer_suggestion_id: self.corrida.id,
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
		 * Hay que seguir refrescando mientras la corrida se este generando o el
		 * resumen IA este en camino. Un estado 'error' o 'listo' del resumen, o una
		 * corrida terminada sin resumen pendiente, cortan el ciclo.
		 */
		debe_seguir_polleando() {
			if (!this.corrida) {
				return false
			}
			if (this.corrida.status == 'pendiente') {
				return true
			}
			return this.corrida.resumen_ia_estado == 'pendiente'
		},
		/**
		 * Programa la proxima recarga. 8 segundos: lo bastante seguido para que el
		 * fin de la corrida se vea sin F5, lo bastante espaciado para no castigar al
		 * backend mientras procesa chunks.
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
		volver() {
			this.$router.push({name: 'ofertas'})
		},
	}
}
</script>
<style lang="sass">
.ofertas-detalle
	&__parametros
		font-size: .9rem
	&__excluidos
		font-size: .95rem
</style>
