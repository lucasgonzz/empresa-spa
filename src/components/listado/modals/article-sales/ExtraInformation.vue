<template>
	<!-- Resumen de ventas del artículo en el período -->
	<div class="article-sales-stats">

		<!-- Tarjeta principal: total de unidades vendidas -->
		<div class="article-sales-stats__hero">
			<div class="article-sales-stats__hero-icon">
				<i class="icon-chart"></i>
			</div>
			<div class="article-sales-stats__hero-body">
				<p class="article-sales-stats__hero-label">
					Unidades vendidas
				</p>
				<p class="article-sales-stats__hero-value">
					{{ cantidad_total }}
				</p>
				<p class="article-sales-stats__hero-meta">
					{{ total_ventas }} {{ total_ventas === 1 ? 'venta' : 'ventas' }} en el período
				</p>
			</div>
		</div>

		<!-- Desglose por sucursal y empleado -->
		<div
		v-if="sucursales_con_ventas.length || empleados_con_ventas.length"
		class="article-sales-stats__breakdown">

			<!-- Ventas por sucursal -->
			<div
			v-if="sucursales_con_ventas.length"
			class="article-sales-stats__group">
				<h6 class="article-sales-stats__group-title">
					Por sucursal
				</h6>
				<div class="article-sales-stats__list">
					<div
					class="article-sales-stats__item"
					v-for="sucursal in sucursales_con_ventas"
					:key="'address-'+sucursal.id">
						<span class="article-sales-stats__item-name">
							{{ sucursal.street }}
						</span>
						<span class="article-sales-stats__item-value">
							{{ sucursal.cantidad_ventas }}
						</span>
					</div>
				</div>
			</div>

			<!-- Ventas por empleado -->
			<div
			v-if="empleados_con_ventas.length"
			class="article-sales-stats__group">
				<h6 class="article-sales-stats__group-title">
					Por empleado
				</h6>
				<div class="article-sales-stats__list">
					<div
					class="article-sales-stats__item"
					v-for="empleado in empleados_con_ventas"
					:key="'employee-'+empleado.id">
						<span class="article-sales-stats__item-name">
							{{ empleado.name }}
						</span>
						<span class="article-sales-stats__item-value">
							{{ empleado.cantidad_ventas }}
						</span>
					</div>
				</div>
			</div>

		</div>
	</div>
</template>
<script>
import article_sales from '@/mixins/article_sales'
export default {
	mixins: [article_sales],
	props: {
		// Listado de ventas devuelto por la API
		results: Array,
	},
	computed: {
		/**
		 * Artículo seleccionado en el listado.
		 */
		model() {
			return this.$store.state.article.model 
		},
		/**
		 * Suma de unidades vendidas del artículo en todas las ventas del período.
		 */
		cantidad_total() {
			let total = 0
			if (this.results) {
				this.results.forEach(sale => {
					total += this.getArticleAmountInSale(sale, this.model)
				})
			}
			return total
		},
		/**
		 * Cantidad de ventas (registros) en el resultado.
		 */
		total_ventas() {
			if (!this.results) {
				return 0
			}
			return this.results.length
		},
		/**
		 * Sucursales cargadas en el store.
		 */
		addresses() {
			return this.$store.state.address.models 
		},
		/**
		 * Acumula unidades vendidas por sucursal (índice por address_id).
		 */
		sucursales() {

			let addresses = []
			this.addresses.forEach(address => {
				addresses[address.id] = {
					...address,
					cantidad_ventas: 0
				}
			})


			if (this.results) {
				this.results.forEach(sale => {
					
					if (sale.address_id) {
						addresses[sale.address_id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					}

				})
			}

			return addresses
		},
		/**
		 * Sucursales con al menos una unidad vendida, ordenadas de mayor a menor.
		 */
		sucursales_con_ventas() {
			let items = []
			this.sucursales.forEach(sucursal => {
				if (sucursal && sucursal.cantidad_ventas > 0) {
					items.push(sucursal)
				}
			})
			items.sort((a, b) => {
				return b.cantidad_ventas - a.cantidad_ventas
			})
			return items
		},

		/**
		 * Empleados cargados en el store.
		 */
		employees() {
			return this.$store.state.employee.models 
		},
		/**
		 * Acumula unidades vendidas por empleado (ventas sin empleado van al owner).
		 */
		empleados() {

			let employees = []
			this.employees.forEach(employee => {
				employees[employee.id] = {
					...employee,
					cantidad_ventas: 0
				}
			})

			employees[this.owner.id] = {
				...this.owner,
				cantidad_ventas: 0
			}


			if (this.results) {
				this.results.forEach(sale => {
					
					if (sale.employee_id) {
						employees[sale.employee_id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					} else {
						employees[this.owner.id].cantidad_ventas += this.getArticleAmountInSale(sale, this.model)
					}

				})
			}

			return employees
		},
		/**
		 * Empleados con al menos una unidad vendida, ordenados de mayor a menor.
		 */
		empleados_con_ventas() {
			let items = []
			this.empleados.forEach(empleado => {
				if (empleado && empleado.cantidad_ventas > 0) {
					items.push(empleado)
				}
			})
			items.sort((a, b) => {
				return b.cantidad_ventas - a.cantidad_ventas
			})
			return items
		}
	},
}
</script>
<style lang="sass">
$as-accent: #2563eb
$as-accent-secondary: #0891b2
$as-border: #e2e8f0
$as-text: #0f172a
$as-muted: #64748b
$as-bg: #f8fafc

/* Bloque de estadísticas del modal */
.article-sales-stats
	display: flex
	flex-direction: column
	gap: 16px

/* Tarjeta destacada con el total */
.article-sales-stats__hero
	display: flex
	align-items: center
	gap: 16px
	padding: 18px 20px
	background: #fff
	border: 1px solid $as-border
	border-radius: 12px
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
	position: relative
	overflow: hidden

	&::before
		content: ''
		position: absolute
		left: 0
		top: 0
		bottom: 0
		width: 4px
		background: $as-accent
		border-radius: 12px 0 0 12px

.article-sales-stats__hero-icon
	flex-shrink: 0
	width: 52px
	height: 52px
	border-radius: 12px
	display: flex
	align-items: center
	justify-content: center
	background: rgba($as-accent, 0.1)
	color: $as-accent

	i
		font-size: 1.4rem

		&:before
			margin-right: 0

.article-sales-stats__hero-body
	min-width: 0

.article-sales-stats__hero-label
	font-size: 0.8rem
	font-weight: 600
	color: $as-muted
	text-transform: uppercase
	letter-spacing: 0.04em
	margin: 0 0 4px

.article-sales-stats__hero-value
	font-size: 2rem
	font-weight: 700
	color: $as-text
	line-height: 1.1
	margin: 0

.article-sales-stats__hero-meta
	font-size: 0.85rem
	color: $as-muted
	margin: 6px 0 0

/* Grilla de desglose por sucursal / empleado */
.article-sales-stats__breakdown
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))
	gap: 12px

.article-sales-stats__group
	background: #fff
	border: 1px solid $as-border
	border-radius: 12px
	padding: 14px 16px
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04)

.article-sales-stats__group-title
	font-size: 0.75rem
	font-weight: 700
	color: $as-muted
	text-transform: uppercase
	letter-spacing: 0.05em
	margin: 0 0 12px
	padding-bottom: 8px
	border-bottom: 1px solid #f1f5f9

.article-sales-stats__list
	display: flex
	flex-direction: column
	gap: 8px

.article-sales-stats__item
	display: flex
	align-items: center
	justify-content: space-between
	gap: 12px
	padding: 8px 10px
	border-radius: 8px
	background: $as-bg

.article-sales-stats__item-name
	font-size: 0.88rem
	color: $as-text
	line-height: 1.3
	min-width: 0
	word-break: break-word

.article-sales-stats__item-value
	flex-shrink: 0
	font-size: 0.95rem
	font-weight: 700
	color: $as-accent-secondary
	background: rgba($as-accent-secondary, 0.1)
	padding: 2px 10px
	border-radius: 20px
	min-width: 36px
	text-align: center

@media screen and (max-width: 576px)
	.article-sales-stats__hero
		flex-direction: column
		align-items: flex-start
		text-align: left

	.article-sales-stats__hero-value
		font-size: 1.75rem

</style>