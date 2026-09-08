<template>
	<!--
		Sin la extensión el botón no existe: no se deshabilita ni se esconde con CSS.
		Un comercio que no contrató el escaneo no tiene por qué enterarse de que hay
		un botón ahí.
	-->
	<div
	v-if="hasExtencion('escaneo_factura_compra')"
	class="btn-scan-invoice">

		<!-- Escanear: abre el modal de subida/cámara para esta compra. -->
		<b-button
		class="m-l-15"
		size="sm"
		variant="success"
		data-tour="compras.boton_escanear"
		title="Escanear factura o remito del proveedor"
		@click.stop="abrir_escaneo">
			<i class="icon-camera"></i>
			<!--
				El texto se esconde abajo de 768px: en la fila de una compra ya conviven
				Ex excel, Importar excel y Dif. Con dos textos más, a 360px se desborda.
			-->
			<span class="d-none d-md-inline">Escanear</span>
		</b-button>

		<!--
			🔴 El botón rojo NO sale de "hay una corrida en el store" ni de ningún flag
			de sesión: sale de `provider_order_scan/pendientes`, que es la lista que el
			backend devuelve con los escaneos en estado 'listo' y `gestionado_at` en
			null. El botón afirma que hay trabajo esperando en el servidor, así que el
			servidor es quien lo tiene que decir.
		-->
		<b-button
		data-tour="compras.boton_revisar_escaneo"
		v-if="escaneo_pendiente"
		class="m-l-15"
		size="sm"
		variant="danger"
		title="Hay un escaneo listo para revisar"
		@click.stop="abrir_revision">
			<i class="bi bi-exclamation-triangle"></i>
			<span class="d-none d-md-inline">Revisar escaneo</span>
			<b-badge
			v-if="escaneo_pendiente.cantidad_articulos"
			variant="light"
			class="ml-1">
				{{ escaneo_pendiente.cantidad_articulos }}
			</b-badge>
		</b-button>

	</div>
</template>
<script>
/*
 * Los dos botones de escaneo de la fila de una compra (misión escaneo-factura-compra).
 *
 * Molde de estilo: BtnImport.vue (m-l-15, size sm, ícono del set propio) y
 * BtnViewReceivedDiff.vue (visibilidad por computed).
 *
 * El @click.stop de los dos no es decorativo: la fila de la tabla tiene su propio
 * click que abre la compra, igual que en los botones hermanos.
 */
export default {
	props: {
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/*
		 * El escaneo listo y sin gestionar de ESTA compra, o null.
		 * Sale del getter del store, que lee la lista que trajo el backend.
		 *
		 * @return {Object|null}
		 */
		escaneo_pendiente() {
			if (!this.model || !this.model.id) {
				return null
			}
			return this.$store.getters['provider_order_scan/pendiente_de'](this.model.id)
		},
	},
	methods: {
		/*
		 * Abre el modal de subida. Se setea el model de la compra igual que hace
		 * BtnImport, porque los modales del listado leen la compra del store y no
		 * reciben props.
		 */
		abrir_escaneo() {
			this.$store.commit('provider_order/setModel', {
				model: this.model,
				properties: [],
			})
			this.$store.commit('provider_order_scan/set_compra', this.model)
			this.$bvModal.show('scan-invoice')
		},
		/*
		 * Abre la revisión del escaneo pendiente. El detalle (con el resultado
		 * completo) se pide recién acá: la lista de pendientes es liviana a propósito.
		 */
		abrir_revision() {
			if (!this.escaneo_pendiente) {
				return
			}

			this.$store.commit('provider_order_scan/set_compra', this.model)
			this.$store.dispatch('provider_order_scan/abrir_revision', this.escaneo_pendiente.uuid)
			this.$bvModal.show('scan-invoice-review')
		},
	},
}
</script>
<style lang="sass">
.btn-scan-invoice
	display: inline-flex
	flex-direction: row
	align-items: center
	// Los botones traen su propio m-l-15; el contenedor no agrega separación para
	// no desalinearlos respecto de Ex excel / Importar excel / Dif, que son hermanos
	// directos de la celda.
	flex-wrap: nowrap
</style>
