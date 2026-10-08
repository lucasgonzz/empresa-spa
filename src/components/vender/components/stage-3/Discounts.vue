<template>
	<!--
		🔴 Sin el permiso `sale.discount_surchage.aplicar` el panel igual aparece si el cliente
		elegido tiene descuentos vinculados, pero con SOLO el grupo "Del cliente" (misión
		descuentos-recargos-por-cliente, 23/9/2026). Esos descuentos se prenden solos al elegir el
		cliente, aunque el vendedor no tenga el permiso, y el aviso le dice que los puede apagar acá:
		esconderle el panel era dejarle aplicado algo que no ve ni puede sacar. Los comunes, el
		"Ver todos" y la opción de servicios siguen siendo solo para quien tiene el permiso.
	-->
	<div
	v-if="puede_usar_discount_surchages || client_discounts_visibles.length"
	class="vender-rate-panel vender-rate-panel--discount">

		<discounts
		v-if="puede_crear_discount_surchages"></discounts>

		<div class="vender-rate-panel__box">

			<!-- Cabecera del panel de descuentos -->
			<div class="vender-rate-panel__header">
				<div class="vender-rate-panel__header-text">
					<span class="vender-rate-panel__title">Descuentos</span>
					<span class="vender-rate-panel__subtitle">Seleccionar descuentos a aplicar</span>
				</div>
				<b-button
				v-if="puede_usar_discount_surchages"
				size="sm"
				variant="outline-primary"
				v-b-modal="'discounts'">
					<i class="icon-eye"></i>
					Ver todos
				</b-button>
			</div>

			<div class="vender-rate-panel__body">

				<!-- Aviso cuando los descuentos no se pueden modificar (comprobante legado de descuentos) -->
				<div
				v-if="legado_de_descuentos"
				data-testid="aviso-descuentos-en-precios-sin-registro"
				class="vender-client-block__notice">
					<p>
						Este comprobante se guardó con los descuentos aplicados directamente a los precios de los artículos, pero sin registrar cuánto valía cada precio sin el descuento (por ejemplo, porque se cambió el precio de un artículo desde el listado de presupuestos).
					</p>
					<p>
						Por eso no se pueden agregar ni quitar descuentos, ni cambiar "Aplicar descuentos en los servicios", ni la opción de aplicarlos directamente a los precios: los precios guardados ya tienen el descuento adentro y se mantienen como están.
					</p>
				</div>

				<!-- Descuentos asignados al cliente -->
				<div
				v-if="client_discounts_visibles.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Del cliente {{ client.name }}
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="discount in client_discounts_visibles"
						:key="discount.id"
						:ajuste="discount"
						tipo="descuento"
						:input_id="'venta-descuento-'+discount.id"
						id_prefix="discount_"
						:disabled="legado_de_descuentos"
						v-model="sale_discounts"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Descuentos comunes del negocio -->
				<div
				v-if="puede_usar_discount_surchages && common_discounts.length"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Comunes
					</span>
					<div class="vender-client-block__checkbox-list">
						<toggle-de-ajuste-de-venta
						v-for="discount in common_discounts"
						:key="discount.id"
						:ajuste="discount"
						tipo="descuento"
						:input_id="'venta-descuento-'+discount.id"
						id_prefix="discount_"
						:disabled="legado_de_descuentos"
						v-model="sale_discounts"></toggle-de-ajuste-de-venta>
					</div>
				</div>

				<!-- Opción global: descuentos en servicios -->
				<div
				v-if="puede_usar_discount_surchages"
				class="vender-rate-panel__section">
					<span class="vender-rate-panel__section-label">
						Servicios
					</span>
					<vender-toggle
					:disabled="legado_de_descuentos"
					v-model="discounts_in_services"
					input_id="aplicar_descuentos_a_servicios">
						Aplicar descuentos en los servicios
					</vender-toggle>
				</div>

				<!--
					Descuentos directos en precios de artículos (misión
					descuentos-aplicar-al-precio-del-articulo, 8/10/2026): el espejo de la misma sección del
					panel de recargos. Es el pie del panel (--footer) para que los dos paneles queden
					alineados.
				-->
				<div
				v-if="puede_usar_discount_surchages"
				class="vender-rate-panel__section vender-rate-panel__section--footer">
					<span class="vender-rate-panel__section-label">
						Precios de artículos
					</span>

					<p
					v-if="!desactivar_descuentos_a_precios_de_articulos"
					class="vender-rate-panel__section-hint">
						Podés cambiar esta opción también al editar la venta o el presupuesto: los precios se recalculan solos. El total se mantiene, salvo algún centavo por el redondeo de los precios. Con la opción prendida, la tabla de artículos muestra debajo de cada precio cuál era el original.
					</p>

					<!-- Aviso del motivo por el que la opción está deshabilitada -->
					<p
					v-if="legado_de_recargos && !legado_de_descuentos"
					data-testid="aviso-descuentos-en-precios-legado"
					class="vender-rate-panel__section-hint">
						Este comprobante se guardó con los recargos aplicados directamente a los precios de los artículos, antes de que el sistema registrara cuánto valía cada precio sin el recargo. Por eso los descuentos no se pueden aplicar a los precios: se restan del total.
					</p>
					<p
					v-else-if="descuentos_hacen_cero_el_precio"
					data-testid="aviso-descuentos-en-precios-cero"
					class="vender-rate-panel__section-hint">
						Con los descuentos seleccionados el precio de los artículos quedaría en $0 y no se podría volver al precio original, así que se restan del total.
					</p>
					<p
					v-else-if="sin_descuentos_seleccionados"
					class="vender-rate-panel__section-hint">
						Seleccioná al menos un descuento de los de arriba para poder usar esta opción.
					</p>

					<vender-toggle
					:disabled="desactivar_descuentos_a_precios_de_articulos"
					v-model="descuentos_en_precios_prendidos"
					input_id="aplicar_descuentos_directo_a_items"
					row_class="vender-toggle-row--multiline">
						Aplicar los descuentos de esta venta directamente a los precios de los artículos, en lugar de restarlos al total. (Para que no aparezcan discriminados en el comprobante)
					</vender-toggle>

					<!-- Aclaración de alcance: esta opción no gobierna los descuentos de método de pago ni de cuotas -->
					<p class="vender-rate-panel__section-hint">
						Solo afecta a los descuentos de venta seleccionados arriba. Los descuentos y recargos por método de pago y por cantidad de cuotas se aplican siempre al precio de los artículos, sin importar esta opción.
					</p>
				</div>

			</div>
		</div>
	</div>
</template>
<script>
import Discounts from '@/components/vender/modals/clients/Discounts'
import VenderToggle from '@/components/vender/components/VenderToggle'
import ToggleDeAjusteDeVenta from './ToggleDeAjusteDeVenta'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
import { descuentos_dejan_el_precio_en_cero, porcentajes_de_descuentos_elegidos } from '@/utils/descuentos_en_precios'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Discounts,
		VenderToggle,
		ToggleDeAjusteDeVenta,
	},
	methods: {
		es_descuento_del_cliente(discount) {
			if (!this.client) {
				return false
			}
			return discount.client_id == this.client.id
				|| this.ids_de_descuentos_del_cliente.indexOf(discount.id) != -1
		},
	},
	computed: {
		discounts() {
			return this.$store.state.discount.models
		},
		/*
			Ids de los descuentos vinculados al cliente desde su ficha (`client.discounts`, misión
			descuentos-recargos-por-cliente, 23/9/2026).
		*/
		ids_de_descuentos_del_cliente() {
			if (!this.client || !Array.isArray(this.client.discounts)) {
				return []
			}
			return this.client.discounts.map(discount => discount.id)
		},
		/*
			"Del cliente" = vinculado desde la ficha O con la columna vieja `discounts.client_id`
			apuntando a este cliente. La columna vieja ya no la escribe nadie, pero hay descuentos
			guardados así y se siguen mostrando en este grupo.
		*/
		client_discounts() {
			return this.discounts.filter(discount => {
				return this.es_descuento_del_cliente(discount)
			})
		},
		/*
			Lo que se dibuja en el grupo "Del cliente". Sin el permiso de aplicar descuentos, solo los
			vinculados desde la ficha —los que VENDER prende solo y el vendedor tiene que poder
			apagar—; los de la columna vieja `client_id` no se prenden solos, y mostrárselos sería
			darle a ese vendedor un descuento para aplicar que su permiso no le da.
		*/
		client_discounts_visibles() {
			if (this.puede_usar_discount_surchages) {
				return this.client_discounts
			}
			return this.discounts.filter(discount => {
				return this.ids_de_descuentos_del_cliente.indexOf(discount.id) != -1
			})
		},
		/*
			Los comunes excluyen a los del cliente: el mismo descuento en los dos grupos serían dos
			toggles con el mismo `input_id`.
		*/
		common_discounts() {
			return this.discounts.filter(discount => {
				return !discount.client_id && !this.es_descuento_del_cliente(discount)
			})
		},
		/**
		 * El comprobante es un LEGADO de recargos: guardado con los recargos adentro de los precios
		 * antes de que los renglones registraran su precio sin recargo (misión
		 * recargos-en-precios-editable). Su precio tiene un recargo adentro de base desconocida, así
		 * que no hay un precio original sobre el cual meter los descuentos: la opción no se puede usar
		 * (y el predicado efectivo de utils/descuentos_en_precios.js tampoco la considera prendida).
		 *
		 * @returns {boolean}
		 */
		legado_de_recargos() {
			return Boolean(this.$store.state.vender.recargos_en_precios_sin_registro)
		},
		/**
		 * El comprobante es un LEGADO DE DESCUENTOS: guardado con los descuentos adentro de los precios
		 * pero sin el precio original de algún renglón (misión descuentos-aplicar-al-precio-del-articulo;
		 * la regla y sus causas están en utils/descuentos_en_precios.js). Sus precios ya tienen el
		 * descuento adentro de una base que no se conoce, así que se bloquean los tres controles que
		 * podrían cambiar a quién le toca el descuento: elegir/sacar descuentos, "descuentos en
		 * servicios" y la opción de aplicarlos a los precios. Lo calcula previus_sale/index.js al abrir
		 * el comprobante (venta o presupuesto) y lo limpia limpiar_vender().
		 *
		 * @returns {boolean}
		 */
		legado_de_descuentos() {
			return Boolean(this.$store.state.vender.descuentos_en_precios_sin_registro)
		},
		/**
		 * La venta no tiene ningún descuento de venta seleccionado: no hay nada que aplicar.
		 *
		 * @returns {boolean}
		 */
		sin_descuentos_seleccionados() {
			return !this.sale_discounts.length
		},
		/**
		 * Los descuentos seleccionados, juntos, dejarían el precio en cero (un 100%, o una cascada
		 * que llega a cero). El precio original sería irrecuperable -habría que dividir por 0-, así
		 * que la opción no se puede usar y los descuentos se restan del total, que es lo que
		 * garantiza que un descuento del 100% nunca deje de cobrarse.
		 *
		 * @returns {boolean}
		 */
		descuentos_hacen_cero_el_precio() {
			return descuentos_dejan_el_precio_en_cero(
				porcentajes_de_descuentos_elegidos(this.sale_discounts, this.discounts)
			)
		},
		/**
		 * Si la opción de aplicar los descuentos directo a los precios debe estar bloqueada: el
		 * comprobante es un legado de recargos, los descuentos elegidos dejarían el precio en cero, o
		 * no hay ningún descuento seleccionado.
		 *
		 * 🔴 Ya NO se bloquea por "estoy editando una venta" ni por "es un presupuesto": igual que la
		 * opción de recargos desde el 28/9/2026, se puede prender y apagar editando porque getPriceVender()
		 * rearma cada precio desde el precio original guardado y le mete los descuentos de hoy.
		 *
		 * @returns {boolean}
		 */
		desactivar_descuentos_a_precios_de_articulos() {
			return this.legado_de_descuentos
				|| this.legado_de_recargos
				|| this.descuentos_hacen_cero_el_precio
				|| this.sin_descuentos_seleccionados
		},
		/**
		 * v-model del toggle de la opción. Lo que MUESTRA es lo efectivo: con la opción bloqueada por un
		 * 100% o por el legado se ve apagada (no está aplicada a los precios, aunque el flag crudo del
		 * store siga en 1 y vuelva a valer en cuanto se saque el descuento que lo bloqueaba). Escribir
		 * pasa por el computed del mixin (aplicar_descuentos_directo_a_items), que commitea el flag y
		 * recalcula el total.
		 *
		 * @returns {number}
		 */
		descuentos_en_precios_prendidos: {
			get() {
				/*
					En un comprobante legado (de descuentos o de recargos) el toggle esta deshabilitado
					pero muestra lo que el comprobante TIENE: si se guardo con la opcion en 1, sus precios
					ya llevan el descuento adentro y tiene que verse prendido. Apagado y bloqueado diria que
					los descuentos van al pie, y no es asi.
				*/
				if (this.desactivar_descuentos_a_precios_de_articulos && !this.legado_de_descuentos && !this.legado_de_recargos) {
					return 0
				}
				return Number(this.aplicar_descuentos_directo_a_items) ? 1 : 0
			},
			set(value) {
				this.aplicar_descuentos_directo_a_items = value
			},
		},
		sale_discounts: {
			get() {
				return this.$store.state.vender.discounts_id
			},
			set(value) {
				// En un legado de descuentos no se cambian los descuentos (los toggles ya estan deshabilitados).
				if (this.legado_de_descuentos) {
					return
				}

				console.log('value')
				console.log(value)
				this.$store.commit('vender/setDiscountsId', value)

				/*
					Si se quitaron todos los descuentos, la opción de aplicarlos directo a los precios queda
					sin sentido y hay que apagarla (gemelo del setter de stage-3/Surchages.vue). Si no, el
					comprobante se guarda con el flag en 1 y sin descuentos, y el toggle queda prendido y
					bloqueado (sin descuentos seleccionados no se puede tocar). Vale también editando una
					venta o un presupuesto: apagarla devuelve cada precio a su valor original.
				*/
				if (
					!value.length
					&& this.aplicar_descuentos_directo_a_items
				) {
					this.$store.commit('vender/set_aplicar_descuentos_directo_a_items', 0)
				}

				this.setTotal()
				// this.$store.commit('vender/setTotal')
			}
		}
	}
}
</script>
