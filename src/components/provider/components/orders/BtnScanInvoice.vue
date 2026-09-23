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

				🔴 La separación con el ícono va en el <span> y NO en el <i>. Entre dos
				elementos hermanos el compilador de Vue quita el espacio en blanco cuando
				hay un salto de línea de por medio, así que ícono y texto quedaban pegados
				(a diferencia de "Importar excel", donde el texto es un nodo suelto y el
				espacio sobrevive). Si el margen estuviera en el <i>, en teléfono —donde
				el texto no se ve— el ícono quedaría corrido del centro del botón.
			-->
			<span class="btn-scan-invoice__texto d-none d-md-inline">Escanear</span>
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
			<span class="btn-scan-invoice__texto d-none d-md-inline">Revisar escaneo</span>
			<b-badge
			v-if="escaneo_pendiente.cantidad_articulos"
			variant="light"
			class="ml-1">
				{{ escaneo_pendiente.cantidad_articulos }}
			</b-badge>
		</b-button>

		<!--
			Historial: todos los escaneos que tuvo la compra, no solo el pendiente de
			revisar (misión historial-escaneos-compra). Aparece únicamente si la compra
			tiene alguno. El texto se muestra recién desde 992px: con Escanear y el botón
			rojo ya en la fila, en tablet (768–1024px) el texto de un sexto botón la
			desborda; ahí queda el ícono con la cantidad, y el `title` dice qué es.
		-->
		<b-button
		data-tour="compras.boton_historial_escaneos"
		v-if="tiene_historial"
		class="m-l-15"
		size="sm"
		variant="outline-secondary"
		title="Ver todos los escaneos de esta compra"
		@click.stop="abrir_historial">
			<i class="bi bi-clock-history"></i>
			<span class="btn-scan-invoice__texto d-none d-lg-inline">Historial</span>
			<b-badge
			v-if="cantidad_escaneos"
			variant="secondary"
			class="ml-1">
				{{ cantidad_escaneos }}
			</b-badge>
		</b-button>

	</div>
</template>
<script>
/*
 * Los botones de escaneo de la fila de una compra: Escanear, Revisar escaneo (el
 * rojo, si hay uno pendiente) e Historial (misión historial-escaneos-compra).
 *
 * Molde de estilo: BtnImport.vue (m-l-15, size sm, ícono del set propio) y
 * BtnViewReceivedDiff.vue (visibilidad por computed).
 *
 * El @click.stop de los tres no es decorativo: la fila de la tabla tiene su propio
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
		/*
		 * Cuántos escaneos tuvo la compra, según el backend (`provider_order_scans_count`
		 * viaja con cada compra). Con un backend anterior a esta función el campo no
		 * existe y da 0: el botón de historial simplemente no aparece.
		 *
		 * @return {Number}
		 */
		cantidad_escaneos() {
			if (!this.model) {
				return 0
			}
			let cantidad = parseInt(this.model.provider_order_scans_count)
			return isNaN(cantidad) ? 0 : cantidad
		},
		/*
		 * ¿La compra tiene algún escaneo? Además del contador del backend se mira lo
		 * que esta sesión ya vio (`compras_con_escaneos`, que anota la corrida, los
		 * pendientes y los escaneos gestionados): la fila del listado no se vuelve a
		 * pedir cuando se manda o se descarta un escaneo, así que su contador puede
		 * estar en 0 aunque el escaneo exista.
		 *
		 * @return {Boolean}
		 */
		tiene_historial() {
			if (!this.model || !this.model.id) {
				return false
			}

			if (this.cantidad_escaneos > 0 || this.escaneo_pendiente) {
				return true
			}

			let model_id = this.model.id

			return this.$store.state.provider_order_scan.compras_con_escaneos.some(id => {
				return id == model_id
			})
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
		/*
		 * Abre el historial de escaneos de esta compra. El modal lee la compra del
		 * store (como los demás) y pide el listado al abrirse.
		 */
		abrir_historial() {
			this.$store.commit('provider_order_scan/set_compra', this.model)
			this.$bvModal.show('scan-invoice-history')
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

	// Separación entre el ícono y el texto de cada botón. Va en el texto y no en el
	// ícono a propósito: ver el comentario del <span> de "Escanear".
	&__texto
		margin-left: 0.4rem
</style>
