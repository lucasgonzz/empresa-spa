<template>
	<!--
		Sin el permiso `sale.discount_surchage.aplicar`, el panel aparece solo si el cliente tiene
		recargos vinculados, y con SOLO ese grupo: mismo motivo que en Discounts.vue (se prenden
		solos y el vendedor tiene que poder apagarlos).
	-->
	<div
	v-if="puede_usar_discount_surchages || client_surchages.length"
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
				v-if="puede_usar_discount_surchages"
				size="sm"
				variant="outline-primary"
				v-b-modal="'surchages'">
					<i class="icon-eye"></i>
					Ver todos
				</b-button>
			</div>

			<div class="vender-rate-panel__body">

				<!-- Aviso cuando los recargos no se pueden modificar (comprobante legado) -->
				<div
				v-if="desactivar_recargos"
				data-testid="aviso-recargos-en-precios-sin-registro"
				class="vender-client-block__notice">
					<p>
						Este comprobante se guardó con los recargos aplicados directamente a los precios de los artículos, antes de que el sistema registrara cuánto valía cada precio sin el recargo.
					</p>
					<p>
						Por eso no se pueden agregar ni quitar recargos, ni cambiar "Aplicar recargos en los servicios", ni la opción de aplicarlos directamente a los precios.
					</p>
				</div>

				<!-- Recargos vinculados al cliente desde su ficha (mismo grupo que en Discounts.vue) -->
				<div
				v-if="client_surchages.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Del cliente {{ client.name }}
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="surchage in client_surchages"
						:key="surchage.id"
						:ajuste="surchage"
						tipo="recargo"
						id_prefix="surchage_"
						:disabled="desactivar_recargos"
						v-model="sale_surchages"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Listado de recargos disponibles -->
				<div
				v-if="puede_usar_discount_surchages && otros_surchages.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Disponibles
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="surchage in otros_surchages"
						:key="surchage.id"
						:ajuste="surchage"
						tipo="recargo"
						id_prefix="surchage_"
						:disabled="desactivar_recargos"
						v-model="sale_surchages"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Recargos en servicios -->
				<div
				v-if="puede_usar_discount_surchages"
				class="vender-rate-panel__section">
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
				<div
				v-if="puede_usar_discount_surchages"
				class="vender-rate-panel__section vender-rate-panel__section--footer">
					<span class="vender-rate-panel__section-label">
						Precios de artículos
					</span>
					<p
					v-if="!desactivar_recargos"
					class="vender-rate-panel__section-hint">
						Podés cambiar esta opción también al editar la venta o el presupuesto: los precios se recalculan solos. El total se mantiene, salvo algún centavo por el redondeo de los precios.
					</p>

					<!-- Aviso del motivo por el que la opción está deshabilitada -->
					<p
					class="vender-rate-panel__section-hint"
					v-if="sin_recargos_seleccionados && !desactivar_recargos">
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
import ToggleDeAjusteDeVenta from './ToggleDeAjusteDeVenta'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Surchages,
		VenderToggle,
		ToggleDeAjusteDeVenta,
	},
	computed: {
		/**
		 * Bloquea los recargos (elegirlos, sacarlos, "recargos en servicios" y la opción de
		 * aplicarlos a los precios) SOLO en un comprobante LEGADO: una venta o un presupuesto
		 * guardado con la opción prendida antes de que los renglones registraran su precio sin
		 * recargos (decisión 1 de Lucas, misión recargos-en-precios-editable, 28/9/2026). Sus
		 * precios tienen el recargo adentro y no se sabe cuánto valían sin él.
		 *
		 * Hasta esa misión se bloqueaba TODA venta o presupuesto guardado con la opción
		 * prendida, por el mismo motivo. Ahora cada renglón guarda su precio sin recargos y
		 * getPriceVender() lo rearma desde ahí, así que editando se pueden cambiar los recargos
		 * y la opción, y el total no se mueve (salvo algún centavo por unidad: con la opción
		 * prendida el precio con recargos se redondea a centavos, ver getPriceVender()).
		 *
		 * El flag lo calcula previus_sale/index.js al abrir el comprobante (sirve para la venta
		 * Y para el presupuesto: un presupuesto se abre con `vender/setBudget` y nunca setea
		 * `previus_sale`, por eso no se mira `editando_venta_previa`), y lo limpia
		 * limpiar_vender().
		 *
		 * @returns {boolean}
		 */
		desactivar_recargos() {
			return this.$store.state.vender.recargos_en_precios_sin_registro
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
		 * Dos motivos, y ninguno más:
		 * 1. El comprobante es LEGADO (ver desactivar_recargos).
		 * 2. La venta no tiene ningún recargo de venta seleccionado: no hay nada que aplicar.
		 *
		 * 🔴 Ya NO se bloquea por "estoy editando una venta" ni por "es un presupuesto"
		 * (misión recargos-en-precios-editable, 28/9/2026). Esos dos bloqueos existían por un
		 * defecto real, medido el 9/9/2026 sobre un presupuesto de 2 × $110 (recargo del 10%
		 * adentro, total 220): con el toggle habilitado, moverlo NO recalculaba el precio del
		 * renglón —getPriceVender() leía el precio del pivot tal cual— y lo único que cambiaba era
		 * si aplicar_surchages() sumaba el recargo al pie. Apagarlo guardaba 242 (el recargo
		 * cobrado dos veces, también en la venta y en la cuenta corriente al confirmarlo) y
		 * prenderlo sobre uno sin recargo lo bajaba a 200. Las dos cosas con HTTP 200:
		 * `BudgetController::update()` no valida el total como `store()`.
		 *
		 * Ese defecto queda cerrado por otro lado, no por el bloqueo: getPriceVender() rearma el
		 * precio del pivot desde pivot.price_sin_recargos_de_venta y le mete los recargos solo si
		 * la opción está prendida. Con el mismo presupuesto, apagar deja 2 × $100 + 10% al pie =
		 * 220, y prender vuelve a 2 × $110 = 220. Si alguien vuelve a leer el precio del pivot
		 * "tal cual" en esa rama, este toggle vuelve a romper el total: el bloqueo por legado es
		 * el único lugar donde eso es correcto.
		 *
		 * @returns {boolean}
		 */
		desactivar_recargos_a_precios_de_articulos() {
			if (this.desactivar_recargos) {
				return true
			}
			return this.sin_recargos_seleccionados
		},
		surchages() {
			return this.$store.state.surchage.models
		},
		/*
			Ids de los recargos vinculados al cliente desde su ficha (`client.surchages`, misión
			descuentos-recargos-por-cliente, 23/9/2026). Se muestran en su propio grupo, como los
			descuentos del cliente en Discounts.vue.
		*/
		ids_de_recargos_del_cliente() {
			if (!this.client || !Array.isArray(this.client.surchages)) {
				return []
			}
			return this.client.surchages.map(surchage => surchage.id)
		},
		client_surchages() {
			return this.surchages.filter(surchage => {
				return this.ids_de_recargos_del_cliente.indexOf(surchage.id) != -1
			})
		},
		otros_surchages() {
			return this.surchages.filter(surchage => {
				return this.ids_de_recargos_del_cliente.indexOf(surchage.id) == -1
			})
		},
		sale_surchages: {
			get() {
				return this.$store.state.vender.surchages_id
			},
			set(value) {
				this.$store.commit('vender/setSurchagesId', value)

				/*
					Si se quitaron todos los recargos, la opción de aplicarlos directo a los precios
					queda sin sentido y hay que apagarla. Si no, el comprobante se guarda con el flag
					en 1 y sin recargos, y el toggle queda prendido y bloqueado (sin recargos
					seleccionados no se puede tocar).

					Desde la misión recargos-en-precios-editable (28/9/2026) vale TAMBIÉN editando
					una venta o un presupuesto: la opción ya se puede cambiar ahí, y apagarla
					devuelve cada precio a su valor sin recargos. La única excepción es el
					comprobante legado, donde este setter no debería correr nunca (los toggles de
					recargos están deshabilitados) y, si corriera, no hay precio sin recargos al que
					volver.
				*/
				if (
					!value.length
					&& this.aplicar_recargos_directo_a_items
					&& !this.desactivar_recargos
				) {
					this.$store.commit('vender/set_aplicar_recargos_directo_a_items', 0)
				}

				this.setTotal()
			}
		}
	}
}
</script>
