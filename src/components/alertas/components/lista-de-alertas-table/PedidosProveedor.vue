<template>
	<div>
		<div
		v-if="view == 'pedidos-proveedor'">

			<current-acounts></current-acounts>
			
			<b-table
			data-testid="alertas-pedidos-proveedor-tabla"
			v-if="pedidos_sin_llegar.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">

				<template #cell(proveedor)="data">
					<b-button
					:data-testid="'btn-alerta-pedido-proveedor-cc-'+pedidos_sin_llegar[data.index].id"
					:disabled="abriendo_cuenta_corriente"
					@click="showCurrentAcounts(pedidos_sin_llegar[data.index])"
					variant="success">
						{{ pedidos_sin_llegar[data.index].provider.name }}
					</b-button>
				</template>

			</b-table>

			<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
			<empty-state
			v-else
			data-testid="alertas-pedidos-proveedor-vacio"
			icon_class="bi bi-truck"
			title="No hay pedidos sin llegar"
			hint="Ningún pedido a proveedor pasó los días de aviso que tenés configurados."></empty-state>

		</div>
	</div>

</template>
<script>
import abrir_cuenta_corriente_del_proveedor from '@/mixins/provider_order/abrir_cuenta_corriente_del_proveedor'
export default {
	mixins: [abrir_cuenta_corriente_del_proveedor],
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
	},
	computed: {
		fields() {
			return [
				{
					key: 'proveedor',
				},
				{
					key: 'pedido',
				},
				{
					key: 'saldo',
				},
				{
					key: 'hace',
				},
				{
					key: 'fecha',
				},
			]
		},
		items() {
			let items = []

			this.pedidos_sin_llegar.forEach(provider_order => {
				items.push({
					proveedor: provider_order.provider.name,
					pedido: provider_order.num,
					saldo: this.saldo_del_proveedor(provider_order),
					hace: this.since(provider_order.created_at),
					fecha: this.date(provider_order.created_at),
				})
			})

			return items
		},


		pedidos_sin_llegar() {
			return this.$store.state.provider_order.days_to_advise_models
		},
	},
	methods: {
		/**
		 * Abre la cuenta corriente del proveedor de la compra, en la MONEDA de la compra.
		 *
		 * 🔴 Antes llamaba a `showProviderCurrentAcount()`, que cambiaba el proveedor del modal pero no
		 * la cuenta: quedaba abierta la ultima que se habia usado en la sesion (a veces la de un
		 * cliente) bajo el nombre del proveedor, y "Imprimir", "Chequear saldos", los pagos y las
		 * notas operaban sobre esa cuenta ajena. El `provider` de esta tabla no trae `credit_accounts`
		 * (`ProviderOrder::withAll()` lo carga a secas), asi que el mixin pide el proveedor completo,
		 * elige la cuenta de la moneda de la compra y recien ahi abre el modal: el mismo camino que
		 * usa Compras.
		 *
		 * @param {Object} provider_order Compra de la fila.
		 * @returns {void}
		 */
		showCurrentAcounts(provider_order) {
			this.abrir_cuenta_corriente_del_proveedor(provider_order.provider_id, provider_order.moneda_id)
		},
		/**
		 * Saldo del proveedor en la moneda de la compra, con su rotulo ("USD ..." en dolares).
		 *
		 * 🔴 Lee `saldo_pesos` / `saldo_dolares` y no `saldo`: esa columna es de antes de las cuentas
		 * por moneda y nada la escribe desde entonces (`CurrentAcountHelper::set_model_saldo()` solo
		 * sincroniza las dos nuevas), asi que mostraba un valor congelado. Son las mismas que muestra
		 * la lista de Proveedores.
		 *
		 * La moneda se decide como al abrir la cuenta (`cuenta_corriente_a_abrir`): 0 y null son pesos,
		 * y los dolares cuentan solo con la extension `ventas_en_dolares`. Asi la cifra de la fila es
		 * la de la cuenta que se abre al tocar el proveedor.
		 *
		 * @param {Object} provider_order Compra de la fila, con su `provider`.
		 * @returns {String}
		 */
		saldo_del_proveedor(provider_order) {
			let en_dolares = (Number(provider_order.moneda_id) || 1) == 2 && this.hasExtencion('ventas_en_dolares')
			let saldo = en_dolares ? provider_order.provider.saldo_dolares : provider_order.provider.saldo_pesos
			if (!Number(saldo)) {
				return '-'
			}
			return this.current_acount_simbolo_moneda({moneda_id: en_dolares ? 2 : 1}, saldo)
		},
	}
}
</script>