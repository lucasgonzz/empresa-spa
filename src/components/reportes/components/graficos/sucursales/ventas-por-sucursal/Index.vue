<template>
	<div class="chart-wrapper">
		<div
		class="chart-card">
			<div class="header">
				<h4>Vendido por sucursal</h4>
			</div>

			<chart></chart>

			<!--
				Leyenda con la foto de cada sucursal (misión foto-sucursal-y-asistente-configurable):
				el gráfico rotula las barras con el nombre en el eje (un canvas, donde no entra la
				foto), así que la identidad visual de cada sucursal va acá debajo, junto a su total.
				Mismo filtro de permisos y mismo orden que las barras (ver `sucursales`).
			-->
			<ul
			v-if="sucursales.length"
			class="ventas-sucursal-leyenda">
				<li
				v-for="fila in sucursales"
				:key="fila.address.id"
				class="ventas-sucursal-leyenda__item">
					<sucursal-con-foto
					:address="fila.address"
					tamano="sm"></sucursal-con-foto>
					<span class="ventas-sucursal-leyenda__total">{{ price(fila.total_vendido) }}</span>
				</li>
			</ul>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Chart: () => import('@/components/reportes/components/graficos/sucursales/ventas-por-sucursal/Chart'),
		SucursalConFoto: () => import('@/components/common/SucursalConFoto'),
	},
	computed: {
		addresses_payment_methods() {
			return this.$store.state.reportes.model.addresses_payment_methods_formated
		},
		/**
		 * Las sucursales del reporte para la leyenda con fotos, con el MISMO filtro de
		 * permisos que arma las barras (Chart.vue::get_addresses_payment_methods): quien
		 * ve todas, las ve todas; quien solo ve la suya, solo la suya. Se conserva el orden
		 * del array (el de las barras) para que la leyenda y el gráfico se lean juntos.
		 *
		 * @returns {Array}
		 */
		sucursales() {
			if (typeof this.addresses_payment_methods == 'undefined') {
				return []
			}
			if (this.can('reportes.sucursales.index.all')) {
				return this.addresses_payment_methods
			}
			if (this.can('reportes.sucursales.index.only_your')) {
				let self = this
				return this.addresses_payment_methods.filter(function (fila) {
					return fila.address.id == self.user.address_id
				})
			}
			return []
		},
	},
}
</script>
<style lang="sass" scoped>
.ventas-sucursal-leyenda
	list-style: none
	margin: 16px 0 0 0
	padding: 12px 0 0 0
	border-top: 1px solid var(--color-border, #dee2e6)

	&__item
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px
		padding: 7px 0

		& + &
			border-top: 1px solid var(--color-border-secondary, #e9ecef)

	&__total
		flex-shrink: 0
		font-weight: 600
		font-size: .9rem
		color: var(--color-text-primary, #212529)
		white-space: nowrap
</style>
