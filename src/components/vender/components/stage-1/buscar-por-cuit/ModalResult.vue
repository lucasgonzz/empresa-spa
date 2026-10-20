<template>
	<b-modal
	:title="title"
	hide-footer
	id="afip-data-modal">

		<div class="vender-afip-modal__data">
			<div
			class="vender-afip-modal__field"
			v-for="(item, index) in props"
			:key="index">
				<span class="vender-afip-modal__field-label">
					{{ format_afip_label(item.key) }}
				</span>
				<span class="vender-afip-modal__field-value">
					{{ item.value }}
				</span>
			</div>
		</div>

		<hr class="vender-client-block__separator">

		<div
		v-if="client_model"
		class="vender-afip-modal__client-summary">
			<p>
				Nombre en el sistema: {{ client_model.name }}
			</p>
			<p>
				Saldo: {{ price(client_model.saldo_pesos) }}
			</p>
		</div>

		<div class="vender-afip-modal__actions">
			<b-button
			v-if="client_model"
			block
			@click="useClient"
			variant="primary">
				Usar cliente para la venta
			</b-button>

			<btn-loader
			v-else
			:loader="loading"
			id="crear_cliente"
			text="Crear cliente y usar para esta venta"
			@clicked="setCreateClient"></btn-loader>
		</div>

	</b-modal>
</template>
<script>
import vender from '@/mixins/vender'
import { propiedades_de_cliente_desde_arca } from '@/utils/datos_de_arca_en_cliente'
/*
	price_types y ajustes_del_cliente se sacaron el 4/10/2026: los usaba solo useClient(), que ya no
	elige el cliente (ver su docblock). Elegir es de SelectClient.vue, que tiene los dos mixins.
*/
export default {
	mixins: [vender],
	props: {
		title: String,
		afip_data: Object,
		client_model: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		props() {
			if (this.afip_data) {
				return Object.entries(this.afip_data).map(([key, value]) => ({ key, value }));
			}
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		/**
		 * Formatea la clave de un dato AFIP para mostrarla como etiqueta legible.
		 *
		 * @param {string} key Clave del campo devuelto por AFIP.
		 * @returns {string}
		 */
		format_afip_label(key) {
			return key.replaceAll('_', ' ')
		},
		/**
		 * Abre el formulario de cliente nuevo precargado con lo que devolvio ARCA.
		 *
		 * El formulario lo monta el buscador de cliente de Vender (search/Index.vue, por
		 * `show_btn_create`) y ese buscador tiene `elegir_al_crear`: al guardar, el cliente queda
		 * elegido para la venta sin volver al buscador (ver SelectClient.vue).
		 *
		 * 🔴 Las propiedades del cliente las arma utils/datos_de_arca_en_cliente.js, el MISMO helper
		 * que usa el input CUIT del formulario de Clientes (ModelForm.vue): lo que ARCA devuelve se
		 * carga igual desde los dos lugares. No volver a armarlas a mano acá.
		 *
		 * Con promesas encadenadas por .then() y `let self = this`, que es la regla de src/.
		 *
		 * @returns {void}
		 */
		setCreateClient() {
			let self = this
			this.loading = true

			propiedades_de_cliente_desde_arca(this, this.afip_data)
			.then(function(properties_to_override) {
				self.cerrar()

				self.setModel(null, 'client', properties_to_override, true, false)
				self.loading = false
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				self.$toast.error('No se pudo abrir el formulario del cliente')
			})
		},
		/**
		 * "Usar cliente para la venta": el CUIT ya era de un cliente cargado.
		 *
		 * 🔴 Este modal NO elige el cliente por su cuenta: avisa con `usar-cliente` y lo elige
		 * SelectClient.vue, haciendolo pasar por su setSelected(), que es la unica puerta para
		 * elegir el cliente de la venta desde la interfaz de Vender. Antes de la mision
		 * cliente-desde-arca-en-vender (4/10/2026) esto hacia a mano `vender/setClient` +
		 * setPriceType() + los ajustes del cliente, y se quedaba corto: no bloqueaba la caja, no
		 * recalculaba el tipo de comprobante (con un Responsable Inscripto podia quedar el anterior)
		 * y en una venta o presupuesto en edicion le cambiaba la lista de precios en vez de avisar y
		 * conservarla. Volver a elegir desde aca es volver a abrir ese hueco.
		 *
		 * @returns {void}
		 */
		useClient() {
			this.$emit('usar-cliente', this.client_model)
			this.cerrar()
		},
		cerrar() {
			this.$bvModal.hide('afip-data-modal')
			let legacy_input = document.getElementById('cuit-para-buscar')
			if (legacy_input) {
				legacy_input.value = ''
			}
		}
	}
}
</script>
<style lang="sass">
@import '@/components/vender/sass/_vender-client-block'
</style>
