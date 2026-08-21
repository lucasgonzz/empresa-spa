<template>
	<div
	v-if="puede_usar_discount_surchages"
	class="vender-rate-panel vender-rate-panel--surcharge">

		<surchages
		v-if="puede_crear_discount_surchages"></surchages>

		<div class="vender-rate-panel__box">

			<!-- Cabecera del panel de recargos -->
			<div class="vender-rate-panel__header">
				<div class="vender-rate-panel__header-text">
					<span class="vender-rate-panel__title">Recargos</span>
					<span class="vender-rate-panel__subtitle">Seleccionar recargos a aplicar</span>
				</div>
				<b-button
				size="sm"
				variant="outline-primary"
				v-b-modal="'surchages'">
					<i class="icon-eye"></i>
					Ver todos
				</b-button>
			</div>

			<div class="vender-rate-panel__body">

				<!-- Aviso cuando los recargos no se pueden modificar -->
				<div
				v-if="desactivar_recargos"
				class="vender-client-block__notice">
					<p>
						Los precios de los items de esta venta, ya tienen aplicado los recargos de esta venta al momento de crearce.
					</p>
					<p>
						No puede aplicar no quitar recargos
					</p>
				</div>

				<!-- Listado de recargos disponibles -->
				<div class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Disponibles
					</span>
					<div class="vender-client-block__checkbox-list">
						<vender-toggle
						v-for="surchage in surchages"
						:key="surchage.id"
						mode="array"
						:option_value="surchage.id"
						:disabled="desactivar_recargos"
						row_class="vender-toggle-row--multiline"
						v-model="sale_surchages">

							<div
							class="vender-client-block__item-detail"
							:id="'surchage_'+surchage.id">

								{{ surchage.name }} {{ porcentaje_es(surchage.percentage) }}%

								<span
								v-if="surchage.deleted_at">
									(actualmente eliminado)
								</span>

								<span
								v-else-if="surchage.updated_percentage">
									({{ porcentaje_es(surchage.updated_percentage) }}% en este momento)
								</span>

								<p
								class="text-muted"
								v-if="!surchage.deleted_at && surchage.updated_percentage">
									En caso de querer usar el valor actual del recargo ({{ porcentaje_es(surchage.updated_percentage) }}%), desmarcar para quitar el recargo, guardar la venta sin el recargo, y editar la venta para agregarle el recargo con el valor actualizado.
								</p>
							</div>
						</vender-toggle>
					</div>
				</div>

				<!-- Recargos en servicios -->
				<div class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Servicios
					</span>
					<vender-toggle
					:disabled="desactivar_recargos"
					v-model="surchages_in_services"
					input_id="aplicar_recargos_a_servicios">
						Aplicar recargos en los servicios
					</vender-toggle>
				</div>

				<!-- Recargos directos en precios de artículos -->
				<div class="vender-rate-panel__section vender-rate-panel__section--footer">
					<span class="vender-rate-panel__section-label">
						Precios de artículos
					</span>
					<p class="vender-rate-panel__section-hint">
						Una vez creada la venta, no se podrá cambiar esta opción.
					</p>

					<!-- Aviso del motivo por el que la opción está deshabilitada -->
					<p
					class="vender-rate-panel__section-hint"
					v-if="sin_recargos_seleccionados && !editando_venta_previa">
						Seleccioná al menos un recargo de los de arriba para poder usar esta opción.
					</p>

					<vender-toggle
					:disabled="desactivar_recargos_a_precios_de_articulos"
					v-model="aplicar_recargos_directo_a_items"
					input_id="aplicar_recargos_directo_a_items"
					row_class="vender-toggle-row--multiline">
						Aplicar los recargos de esta venta directamente a los precios de los artículos, en lugar de sumarlos al total. (Para que no aparezcan discriminados en el comprobante)
					</vender-toggle>

					<!-- Aclaración de alcance: esta opción no gobierna los recargos de método de pago ni de cuotas -->
					<p class="vender-rate-panel__section-hint">
						Solo afecta a los recargos de venta seleccionados arriba. Los recargos y descuentos por método de pago y por cantidad de cuotas se aplican siempre al precio de los artículos, sin importar esta opción.
					</p>
				</div>

			</div>
		</div>
	</div>
</template>
<script>
import Surchages from '@/components/vender/modals/clients/Surchages'
import VenderToggle from '@/components/vender/components/VenderToggle'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Surchages,
		VenderToggle,
	},
	computed: {
		desactivar_recargos() {
			if (
				this.editando_venta_previa && this.previus_sale.aplicar_recargos_directo_a_items
			) {
				return true
			}
			return false
		},
		/**
		 * Indica que la venta no tiene ningún recargo de venta seleccionado.
		 * Sin recargos seleccionados, la opción de aplicarlos directo a los precios de los
		 * artículos no tiene nada sobre qué actuar.
		 *
		 * @returns {boolean}
		 */
		sin_recargos_seleccionados() {
			return !this.sale_surchages.length
		},
		/**
		 * Indica si la opción de aplicar los recargos directo a los precios debe estar bloqueada.
		 *
		 * Dos motivos, en este orden:
		 * 1. La venta ya fue creada: la opción queda congelada como se guardó, porque los precios
		 *    de los items ya se calcularon con ese criterio.
		 * 2. La venta no tiene ningún recargo de venta seleccionado: no hay nada que aplicar.
		 *
		 * @returns {boolean}
		 */
		desactivar_recargos_a_precios_de_articulos() {
			if (this.editando_venta_previa) {
				return true
			}
			return this.sin_recargos_seleccionados
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		surchages() {
			return this.$store.state.surchage.models
		},
		sale_surchages: {
			get() {
				return this.$store.state.vender.surchages_id
			},
			set(value) {
				this.$store.commit('vender/setSurchagesId', value)

				/*
					Si se quitaron todos los recargos, la opción de aplicarlos directo a los precios
					queda sin sentido y hay que apagarla. Si no, la venta se guarda con el flag en 1
					y sin recargos, y al editarla el computed desactivar_recargos (que lee
					previus_sale.aplicar_recargos_directo_a_items) bloquea agregar o quitar recargos
					sin ningún motivo.
					Solo aplica a ventas nuevas: en una venta anterior el flag no se puede cambiar.
				*/
				if (
					!value.length
					&& this.aplicar_recargos_directo_a_items
					&& !this.editando_venta_previa
				) {
					this.$store.commit('vender/set_aplicar_recargos_directo_a_items', 0)
				}

				this.setTotal()
			}
		}
	}
}
</script>
