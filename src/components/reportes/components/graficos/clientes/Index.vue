<template>
	<div
	v-if="sub_view == 'clientes'">

		<div class="chart-card">
			<div class="header">
				<h4>Clientes deudores</h4>

				<chart-header-options
				module_name="client"
				:total_registros_text="total_registros_text"
				:total_registros="total"
				:registros_para_mostrar="clients"></chart-header-options>
			</div>

			<deudas-de-clientes
			v-if="clients.length"
			:clients="clients"></deudas-de-clientes>

			<div
			class="text-with-icon"
			v-else-if="loading">
				<i class="icon-refresh"></i>
				Cargando clientes deudores...
			</div>

			<div
			class="text-with-icon"
			v-else>
				<i class="icon-eye-slash"></i>
				No hay clientes con deuda en cuenta corriente
			</div>
		</div>

	</div>
</template>
<script>
import axios from 'axios'

/**
 * Sub-solapa "Clientes" de Reportes → Gráficos: los clientes deudores.
 *
 * Los datos se piden a la API cada vez que se abre la sub-solapa, y no se leen de
 * `state.client.models`: el listado de Clientes trabaja con filtros y paginado del servidor y no
 * llena ese array, así que el gráfico dependía de lo que otro módulo hubiera cargado en la sesión
 * y, en la práctica, siempre mostraba "0 clientes".
 *
 * Se usa el buscador general (`POST global-search/client`) con tres criterios, todos resueltos en
 * el servidor (el dueño se aplica ahí, por la cuenta de la sesión):
 *   - extra_filters: `saldo_pesos > 0` → solo los que deben (el gráfico es en pesos; los dólares
 *     no se grafican ni comparten eje).
 *   - order_by `saldo_pesos` + order_direction según "Mayor a menor / Menor a mayor".
 *   - per_page / ?page= → una página de 10 barras por vez, igual que antes.
 *
 * `saldo_pesos` es el saldo vivo en pesos (el mismo dato que muestra la lista de Clientes); la
 * columna vieja `saldo` está congelada y no se usa.
 */
export default {
	components: {
		DeudasDeClientes: () => import('@/components/reportes/components/graficos/clientes/Chart'),
		ChartHeaderOptions: () => import('@/components/common/chart/HeaderOptions'),
	},
	data() {
		return {
			// Clientes de la página vigente, ya ordenados por el servidor.
			clients: [],
			// Cuántos clientes deudores hay en total (todas las páginas).
			total: 0,
			loading: false,
			// Parámetros del último pedido ("página|orden"): evita pedir dos veces lo mismo cuando
			// al entrar se reinicia la página y los watchers de página y orden se disparan a la vez.
			ultimo_pedido: '',
			// Número de pedido vigente: una respuesta que llega tarde (el usuario ya cambió de
			// página, de orden o de sub-solapa) se descarta.
			pedido_vigente: 0,
		}
	},
	computed: {
		total_registros_text() {
			if (this.total == 1) {
				return '1 cliente'
			}
			return this.total+' clientes'
		},
		current_page() {
			return this.$store.state.chart.client.current_page
		},
		per_page() {
			return this.$store.state.chart.client.per_page
		},
		order_by() {
			return this.$store.state.chart.client.order_by
		},
	},
	watch: {
		sub_view: {
			immediate: true,
			handler() {
				if (this.sub_view == 'clientes') {
					// Se entra siempre por la primera página: la del store sobrevive a la navegación.
					// Y sin la lista de la visita anterior: hasta que llegue la respuesta se ve "Cargando".
					this.clients = []
					this.total = 0
					if (this.current_page != 0) {
						this.$store.commit('chart/client/setCurrentPage', 0)
					}
					this.cargar(true)
				} else {
					// Se salió de la sub-solapa: cualquier pedido en vuelo ya no importa.
					this.pedido_vigente++
					this.loading = false
				}
			},
		},
		current_page() {
			this.cargar(false)
		},
		order_by() {
			// Cambiar el orden vuelve a la primera página; si ya estaba en ella, se pide directo.
			if (this.current_page != 0) {
				this.$store.commit('chart/client/setCurrentPage', 0)
			} else {
				this.cargar(false)
			}
		},
	},
	methods: {
		/**
		 * Pide a la API la página vigente de clientes deudores.
		 *
		 * @param {Boolean} forzar Pedir aunque los parámetros sean los del último pedido (al entrar a la sub-solapa).
		 */
		cargar(forzar) {
			if (this.sub_view != 'clientes') {
				return
			}

			let pedido = this.current_page+'|'+this.order_by
			if (!forzar && pedido == this.ultimo_pedido) {
				return
			}
			this.ultimo_pedido = pedido

			let self = this
			let numero_de_pedido = ++this.pedido_vigente
			this.loading = true

			axios.post('/api/global-search/client?page='+(this.current_page + 1), {
				query_value: '',
				props: [],
				relation_props: [],
				extra_filters: [
					{
						key: 'saldo_pesos',
						operator: '>',
						value: 0,
					},
				],
				order_by: 'saldo_pesos',
				order_direction: this.order_by == 'mayor-a-menor' ? 'DESC' : 'ASC',
				per_page: this.per_page,
			})
			.then(res => {
				if (numero_de_pedido != self.pedido_vigente) {
					return
				}
				self.loading = false
				self.clients = res.data.models.data
				self.total = res.data.models.total
			})
			.catch(err => {
				console.log(err)
				if (numero_de_pedido != self.pedido_vigente) {
					return
				}
				self.loading = false
				// Se fuerza la próxima vez: este pedido no cargó nada.
				self.ultimo_pedido = ''
				self.$toast.error('No se pudieron cargar los clientes deudores')
			})
		},
	},
}
</script>
