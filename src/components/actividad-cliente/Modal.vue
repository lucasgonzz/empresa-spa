<template>
	<b-modal
	id="actividad-cliente"
	size="xl"
	hide-footer
	:title="titulo"
	@show="al_abrir"
	@hidden="al_cerrar">

		<!-- 1. El selector de periodo. Cambiarlo vuelve a pedir todo. -->
		<b-form-radio-group
		class="actividad-cliente__periodos m-b-15"
		buttons
		button-variant="outline-primary"
		size="sm"
		:checked="periodo"
		:options="opciones_de_periodo"
		@change="cambiar_periodo"></b-form-radio-group>

		<div
		v-if="loading"
		class="j-center m-t-30 m-b-30">
			<b-spinner></b-spinner>
		</div>

		<!--
			El error se muestra con el mensaje del backend y nunca queda la pantalla en blanco:
			un modal vacío sin explicación se lee como "este cliente no hizo nada", que es
			justamente lo contrario de lo que pasó.
		-->
		<b-alert
		v-else-if="error"
		show
		variant="warning">
			{{ error }}
		</b-alert>

		<div v-else-if="actividad">

			<!--
				2. 🔴 LA LECTURA DE LA IA VA ARRIBA. Es el pedido textual: primero qué estuvo
				haciendo este cliente en castellano, y recién después los números que lo prueban.
			-->
			<resumen-ia v-if="actividad.hay_datos"></resumen-ia>

			<!--
				3. La leyenda del histórico. Solo con fuente 'agregado', que es lo que contesta
				"Todo el historial": ahí el backend lee del resumen por día, que no guarda la
				hora del evento y llega hasta ayer porque el rollup corre a las 03:30 sobre el
				día anterior. Decirlo es la diferencia entre "no hay línea de tiempo" y "esta
				pantalla se rompió".
			-->
			<b-alert
			v-if="es_del_agregado"
			class="small"
			show
			variant="secondary">
				Del historial completo guardamos el resumen por día, hasta ayer: no hay detalle por hora ni línea de tiempo. Los eventos con detalle se guardan 90 días.
			</b-alert>

			<!-- 8. El cartel de vacío, en sus dos variantes. -->
			<b-alert
			v-if="!actividad.hay_datos"
			show
			variant="info">
				<span v-if="sin_compradores">
					Este cliente no tiene ningún comprador de la tienda asociado, así que no hay actividad que mostrar. El vínculo se carga desde Tienda Online → Clientes.
				</span>
				<span v-else>
					Todavía no hay actividad de este cliente en la tienda para este periodo.
				</span>
			</b-alert>

			<div v-else>

				<!-- 4. Los totales, en tarjetas chicas que envuelven solas al angostarse. -->
				<div class="actividad-cliente__totales m-b-20">
					<div
					v-for="tarjeta in tarjetas_de_totales"
					:key="tarjeta.titulo"
					class="actividad-cliente__total">
						<span class="actividad-cliente__total-valor">
							{{ tarjeta.valor }}
						</span>
						<span class="actividad-cliente__total-titulo">
							{{ tarjeta.titulo }}
						</span>
					</div>
				</div>

				<!-- 5. Qué miró -->
				<template v-if="actividad.articulos.length">
					<h6 class="actividad-cliente__seccion">
						Qué artículos miró
					</h6>
					<!-- responsive + min-width en el sass: scroll horizontal en vez de celdas apretadas -->
					<b-table
					class="actividad-cliente__tabla m-b-20"
					head-variant="dark"
					responsive
					:fields="fields_articulos"
					:items="actividad.articulos">

						<template #cell(tiempo_segundos)="data">
							{{ tiempo_en_criollo(data.item.tiempo_segundos) }}
						</template>

						<template #cell(ultima_vez)="data">
							{{ fecha_en_criollo(data.item.ultima_vez) }}
						</template>

					</b-table>
				</template>

				<!-- 6. Qué buscó -->
				<template v-if="actividad.busquedas.length">
					<h6 class="actividad-cliente__seccion">
						Qué buscó
					</h6>
					<b-table
					class="actividad-cliente__tabla m-b-20"
					head-variant="dark"
					responsive
					:fields="fields_busquedas"
					:items="actividad.busquedas">

						<template #cell(termino)="data">
							{{ data.item.termino }}
							<!--
								🔴 El dato más accionable de toda la pantalla: buscó y no
								encontró nada. Hay demanda y no hay oferta.
							-->
							<b-badge
							v-if="data.item.sin_resultado"
							class="m-l-5"
							variant="danger">
								No encontró nada
							</b-badge>
						</template>

						<template #cell(ultima_vez)="data">
							{{ fecha_en_criollo(data.item.ultima_vez) }}
						</template>

					</b-table>
				</template>

				<!--
					7. La línea de tiempo. Solo con fuente 'eventos': el agregado no guarda la
					hora, así que ahí viene siempre vacía y la sección directamente no existe.
					Es una LISTA y no una tabla a propósito: en teléfono se tiene que poder leer
					sin scroll horizontal.
				-->
				<template v-if="hay_linea_de_tiempo">
					<h6 class="actividad-cliente__seccion">
						Todo lo que hizo, del más nuevo al más viejo
					</h6>
					<ul class="actividad-cliente__linea">
						<li
						v-for="evento in actividad.linea_de_tiempo"
						:key="evento.id"
						class="actividad-cliente__evento">
							<strong>{{ evento.tipo_texto }}</strong>
							<span v-if="evento.articulo">
								· {{ evento.articulo }}
							</span>
							<span v-if="evento.termino">
								· "{{ evento.termino }}"
							</span>
							<b-badge
							v-if="evento.resultados === 0"
							class="m-l-5"
							variant="danger">
								No encontró nada
							</b-badge>
							<span v-if="evento.cantidad">
								· {{ evento.cantidad }} unidades
							</span>
							<span v-if="evento.monto">
								· {{ price(evento.monto) }}
							</span>
							<span v-if="evento.segundos">
								· {{ tiempo_en_criollo(evento.segundos) }}
							</span>
							<span class="text-muted">
								· {{ fecha_en_criollo(evento.cuando) }}
							</span>
						</li>
					</ul>
				</template>

			</div>
		</div>

	</b-modal>
</template>
<script>
/**
 * Modal "Actividad en la tienda" de un cliente del ERP o de un comprador de la tienda.
 *
 * Se monta UNA vez por vista, como hermano del `<view-component>` y nunca adentro del slot de
 * la tabla (ahí se instanciaría una vez por fila). Lo abre `common/BtnActividadCliente.vue`, que
 * antes de mostrarlo commitea a quién hay que mirar en `store/actividad_cliente`.
 *
 * El pedido lo dispara el `@show` y no el botón: así el único lugar que sabe cómo se carga esta
 * pantalla es esta pantalla, y cambiar de periodo reusa exactamente el mismo camino que abrirla.
 *
 * La pantalla tiene que aguantar sin romperse los tres casos que el backend puede contestar:
 * - `hay_datos: false` (cartel de vacío, y ni se pide el resumen),
 * - `fuente: 'agregado'` (sin línea de tiempo y con fechas sin hora),
 * - el 422 del resumen (los tres mensajes se muestran tal cual los manda el backend).
 */
export default {
	components: {
		ResumenIa: () => import('@/components/actividad-cliente/ResumenIa'),
	},
	computed: {
		abierto_para() {
			return this.$store.state.actividad_cliente.abierto_para
		},
		periodo() {
			return this.$store.state.actividad_cliente.periodo
		},
		actividad() {
			return this.$store.state.actividad_cliente.actividad
		},
		loading() {
			return this.$store.state.actividad_cliente.loading
		},
		error() {
			return this.$store.state.actividad_cliente.error
		},
		titulo() {
			if (this.abierto_para && this.abierto_para.nombre) {
				return 'Actividad de ' + this.abierto_para.nombre + ' en la tienda'
			}
			return 'Actividad en la tienda'
		},
		opciones_de_periodo() {
			// El 0 es "todo el historial" y por eso va último: es el único que cambia de
			// fuente (pasa a leer el resumen por día) y el que menos se mira.
			return [
				{ text: 'Últimos 7 días', value: 7 },
				{ text: 'Últimos 30 días', value: 30 },
				{ text: 'Últimos 90 días', value: 90 },
				{ text: 'Todo el historial', value: 0 },
			]
		},
		es_del_agregado() {
			return !!this.actividad && this.actividad.fuente == 'agregado'
		},
		hay_linea_de_tiempo() {
			return !!this.actividad
				&& this.actividad.fuente == 'eventos'
				&& !!this.actividad.linea_de_tiempo
				&& !!this.actividad.linea_de_tiempo.length
		},
		/**
		 * true cuando se entró por un cliente del ERP que no tiene ningún comprador de la
		 * tienda asociado.
		 *
		 * Es el porqué REAL del vacío en ese caso, y merece su propio cartel: sin él, un
		 * cliente que compró diez veces por la tienda con un comprador sin vincular se lee
		 * como "no hizo nada", cuando lo que falta es el vínculo. Desde Tienda Online no puede
		 * pasar: ahí se entra por `buyer_id` y el comprador es el que está en la fila.
		 */
		sin_compradores() {
			return !!this.abierto_para
				&& !!this.abierto_para.client_id
				&& !!this.actividad
				&& (!this.actividad.compradores || !this.actividad.compradores.length)
		},
		fields_articulos() {
			return [
				{ key: 'nombre', label: 'Artículo' },
				{ key: 'vistas', label: 'Veces que lo miró' },
				{ key: 'tiempo_segundos', label: 'Tiempo' },
				{ key: 'agregados_al_carrito', label: 'Al carrito' },
				{ key: 'ultima_vez', label: 'Última vez' },
			]
		},
		fields_busquedas() {
			return [
				{ key: 'termino', label: 'Término' },
				{ key: 'veces', label: 'Veces' },
				{ key: 'resultados', label: 'Resultados' },
				{ key: 'ultima_vez', label: 'Última vez' },
			]
		},
		/**
		 * Las tarjetas de totales, ya formateadas. Se arman acá y no en el template para que el
		 * envoltorio (el v-for) no tenga que saber nada de cómo se formatea cada número.
		 */
		tarjetas_de_totales() {
			if (!this.actividad || !this.actividad.totales) {
				return []
			}
			let totales = this.actividad.totales
			return [
				{ titulo: 'Vistas', valor: totales.vistas },
				{ titulo: 'Artículos distintos', valor: totales.articulos_distintos },
				{ titulo: 'Tiempo total', valor: this.tiempo_en_criollo(totales.tiempo_total_segundos) },
				{ titulo: 'Búsquedas', valor: this.busquedas_en_criollo(totales) },
				{ titulo: 'Al carrito', valor: totales.agregados_al_carrito },
				{ titulo: 'Compras', valor: totales.compras },
				{ titulo: 'Monto comprado', valor: this.price(totales.monto_comprado) },
				{ titulo: 'Última actividad', valor: this.fecha_en_criollo(totales.ultima_actividad) },
			]
		},
	},
	methods: {
		al_abrir() {
			// Cada apertura arranca limpia y en el periodo por default: dejar lo del cliente
			// anterior haría que el segundo se lea con números que todavía son del primero.
			this.$store.commit('actividad_cliente/setPeriodo', 30)
			this.$store.commit('actividad_cliente/setActividad', null)
			this.$store.commit('actividad_cliente/setError', '')
			this.$store.commit('actividad_cliente/setResumen', '')
			this.$store.commit('actividad_cliente/setResumenError', '')
			this.pedir()
		},
		al_cerrar() {
			// `reset` no toca la caché de resúmenes: volver a abrir el mismo cliente en el
			// mismo periodo no puede costar otra llamada paga a la IA.
			this.$store.commit('actividad_cliente/reset')
		},
		cambiar_periodo(valor) {
			this.$store.commit('actividad_cliente/setPeriodo', valor)
			this.pedir()
		},
		/**
		 * Pide la actividad y, solo si hay algo que leer, la lectura de la IA.
		 *
		 * 🔴 Sin `hay_datos` NO se pide el resumen. El backend lo rechazaría igual con un 422,
		 * pero el viaje tampoco se hace: cada llamada a la IA se paga, y pagarla por un cliente
		 * que no hizo nada en la tienda es tirar plata.
		 */
		pedir() {
			let self = this
			this.$store.dispatch('actividad_cliente/getActividad')
			.then(function (actividad) {
				if (actividad && actividad.hay_datos) {
					self.$store.dispatch('actividad_cliente/getResumen')
				}
			})
		},
		/**
		 * Segundos a algo que se pueda leer de un vistazo. Nunca muestra "610 segundos".
		 */
		tiempo_en_criollo(segundos) {
			let total = Number(segundos) || 0
			if (total < 60) {
				return total + ' s'
			}
			let minutos = Math.floor(total / 60)
			if (minutos < 60) {
				return minutos + ' min'
			}
			let horas = Math.floor(minutos / 60)
			let resto = minutos % 60
			if (resto) {
				return horas + ' h ' + resto + ' min'
			}
			return horas + ' h'
		},
		/**
		 * Las búsquedas con el dato que importa pegado: cuántas de ésas no devolvieron nada.
		 */
		busquedas_en_criollo(totales) {
			if (totales.busquedas_sin_resultado) {
				return totales.busquedas + ' (' + totales.busquedas_sin_resultado + ' sin resultado)'
			}
			return totales.busquedas
		},
		/**
		 * Fecha del backend a dd/mm/aaaa, con la hora solo si vino.
		 *
		 * 🔴 Se parte el string a mano y NO se usa `new Date(...)`: `new Date('2026-08-16')` se
		 * interpreta como UTC y en Argentina se muestra como el 15. Un día de corrimiento en
		 * una pantalla que existe para decir "cuándo pasó esto" no es un detalle.
		 *
		 * Con `fuente: 'agregado'` las fechas vienen sin hora (el resumen por día no la guarda):
		 * en ese caso se muestra la fecha sola y no se inventa un 00:00.
		 */
		fecha_en_criollo(valor) {
			if (!valor) {
				return '-'
			}
			let texto = String(valor)
			let partes = texto.split(' ')
			let fecha = partes[0].split('-')
			if (fecha.length != 3) {
				// Un formato que no esperábamos se muestra crudo antes que romperse.
				return texto
			}
			let dia = fecha[2] + '/' + fecha[1] + '/' + fecha[0]
			if (partes.length > 1 && partes[1]) {
				return dia + ' ' + partes[1].slice(0, 5)
			}
			return dia
		},
	},
}
</script>
<style lang="sass">
.actividad-cliente
	&__periodos
		// En telefono los cuatro periodos no entran en una linea: que envuelvan en vez de
		// espicharse hasta quedar imposibles de tocar.
		flex-wrap: wrap
		row-gap: 5px
	&__totales
		display: flex
		flex-wrap: wrap
		gap: 10px
	&__total
		display: flex
		flex-direction: column
		flex: 1 1 130px
		min-width: 130px
		padding: 10px
		border: 1px solid #dee2e6
		border-radius: 6px
	&__total-valor
		font-size: 1.1rem
		font-weight: 600
	&__total-titulo
		font-size: .8rem
		color: #6c757d
	&__seccion
		font-weight: 600
		margin-bottom: 10px
	&__tabla
		// responsive + min-width: la tabla scrollea horizontal en tablet y telefono en vez de
		// espichar las celdas hasta que el nombre del articulo quede en una letra por linea.
		min-width: 620px
	&__linea
		list-style: none
		padding-left: 0
		margin-bottom: 0
	&__evento
		padding: 6px 0
		border-bottom: 1px solid #f1f1f1
		// Es una lista y no una tabla justamente para que en telefono envuelva y se lea sin
		// scroll horizontal.
		word-break: break-word
</style>
