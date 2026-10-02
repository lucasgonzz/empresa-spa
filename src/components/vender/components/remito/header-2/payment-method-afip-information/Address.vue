<template>
	<b-input-group
	v-if="addresses.length >= 1"
	class="vender-address"
	prepend="Sucursal">

		<!--
			🔴 La sucursal es uno de los controles que frenan el guardado de una venta (ver la
			lista en manual_sistema/vender/armar-una-venta.md). Sin elegirla, el boton de
			guardar no hace ningun pedido: la venta simplemente no sale.
		-->
		<!--
			@change y no el setter de address_id (mixins/vender.js): `change` solo salta cuando la
			persona elige otra sucursal, y NO cuando el codigo la pone (al arrancar Vender, al
			restaurar la cookie, al limpiar la venta o al abrir un comprobante guardado). Ahi no hay
			nada que re-preciar, y el setter lo usan decenas de componentes. Ver al_cambiar_sucursal().
		-->
		<b-form-select
		data-testid="venta-sucursal"
		:disabled="disabled"
		v-model="address_id"
		dusk="address_id"
		@change="al_cambiar_sucursal"
		:options="getOptions({key: 'address_id', text: 'Direccion'})"></b-form-select>

		<!--
			Append nativo del input-group (alineacion perfecta). Lleva dos cosas que se pueden
			dar por separado: la pastilla del recargo o descuento de la sucursal, que se ve SIEMPRE
			que la sucursal elegida tenga uno (es lo que le dice al vendedor que los precios de los
			renglones ya lo traen adentro, no solo con show_help), y la ayuda contextual de la etapa 1.
		-->
		<template
		v-if="ajuste_vigente || show_help"
		#append>

			<!--
				Pastilla del ajuste de la sucursal: ambar para un recargo, verde para un descuento, con
				el texto corto para que entre en un celular. El detalle va en el popover, que tambien
				abre con toque (focus/click): en una pantalla tactil no hay hover.
			-->
			<b-input-group-text
			v-if="ajuste_vigente"
			:id="ajuste_button_id"
			data-testid="venta-sucursal-ajuste"
			class="vender-address-ajuste"
			:class="'vender-address-ajuste--' + ajuste_vigente.tipo"
			role="button"
			tabindex="0"
			:aria-label="ajuste_vigente.texto + ' en los precios de esta venta'">
				<span class="vender-address-ajuste__texto">{{ ajuste_vigente.texto_corto }}</span>
			</b-input-group-text>
			<b-popover
			v-if="ajuste_vigente"
			:target="ajuste_button_id"
			triggers="hover focus click"
			placement="bottom">
				<template #title><strong>{{ ajuste_vigente.texto }}</strong></template>
				{{ ajuste_explicacion }}
			</b-popover>

			<b-input-group-text
			v-if="show_help"
			:id="help_button_id"
			class="vender-address-help-btn"
			role="button"
			tabindex="0"
			aria-label="Información sobre sucursal">
				<i class="icon-info"></i>
			</b-input-group-text>
			<b-popover
			v-if="show_help"
			:target="help_button_id"
			triggers="hover focus click"
			placement="bottom">
				<template #title><strong>Sucursal</strong></template>
				La sucursal define el depósito de stock utilizado para la venta.
			</b-popover>
		</template>

	</b-input-group>
</template>
<script>
import vender from '@/mixins/vender'
import { AJUSTE_RECARGO } from '@/utils/ajuste_de_sucursal'
export default {
	mixins: [vender],
	props: {
		/* Muestra el ícono de ayuda con popover (usado en etapa 1) */
		show_help: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/* ID único para el botón de ayuda y su popover */
		help_button_id() {
			return 'vender-address-hint-' + this._uid
		},
		/* ID único para la pastilla del ajuste de la sucursal y su popover */
		ajuste_button_id() {
			return 'vender-address-ajuste-' + this._uid
		},
		/**
		 * El recargo o descuento propio de la sucursal elegida, o null si no tiene (o no es valido).
		 *
		 * Sale de ajuste_de_sucursal_vigente() (mixins/generals.js), el mismo metodo que usa
		 * getPriceVender() para precios: lo que esta pastilla dice y lo que se cobra no pueden
		 * divergir. Es un computed para que Vue siga el store (la sucursal elegida y el catalogo de
		 * sucursales) y la pastilla aparezca, cambie o se vaya sola.
		 *
		 * @returns {{tipo: String, porcentaje: Number, factor: Number, texto: String, texto_corto: String, marca: String}|null}
		 */
		ajuste_vigente() {
			return this.ajuste_de_sucursal_vigente()
		},
		/**
		 * Lo que dice el popover de la pastilla: que el ajuste YA esta adentro del precio de cada
		 * renglon y no se suma ni se resta al total, que es lo que Lucas pidio que se entienda.
		 *
		 * @returns {String}
		 */
		ajuste_explicacion() {
			if (!this.ajuste_vigente) {
				return ''
			}
			let es_recargo = this.ajuste_vigente.tipo == AJUSTE_RECARGO
			let accion = es_recargo ? 'se suma al' : 'se resta del'
			let nombre = es_recargo ? 'este recargo' : 'este descuento'
			let texto = 'Los precios de los artículos de esta venta ya llevan ' + nombre + ': no ' + accion + ' total. Los servicios y los precios que escribas a mano no se modifican.'

			/*
				Un comprobante guardado es una foto: sus renglones (getPriceVender, rama del pivot) no se
				vuelven a ajustar. Se avisa para que la pastilla no prometa lo que esa venta no hizo si
				la sucursal recibio el ajuste despues de guardarla.
			*/
			if (this.editando_venta_previa || this.$store.state.vender.budget) {
				texto += ' Los renglones ya guardados conservan el precio con el que se guardaron.'
			}

			return texto
		},
		addresses() {
			return this.$store.state.address.models
		},
		disabled() {
			if (this.editando_venta_previa) {
				return true
			}

			if (
				this.is_admin
				|| this.can('vender.cambiar_address_id')
			) {
				return false
			}

			return true
		}
	},
	methods: {
		/**
		 * La persona eligio OTRA sucursal en el select: re-precia los renglones que ya estan
		 * cargados, porque cada sucursal puede llevar un recargo o descuento distinto adentro
		 * del precio (getPriceVender -> ajuste_de_sucursal_vigente).
		 *
		 * 🔴 Va en el @change del select y NO en el setter de address_id (mixins/vender.js) ni
		 * en un watcher. Un select solo emite `change` por una accion del usuario: no cuando el
		 * codigo pone la sucursal (arranque de Vender, cookie, limpiar la venta, abrir un
		 * comprobante guardado). Ahi no hay nada que re-preciar, y re-preciar un comprobante
		 * guardado al abrirlo seria justo lo que no hay que hacer. Y no se toca el setter porque
		 * lo usan decenas de componentes.
		 *
		 * El $nextTick es por si el `change` llega antes de que el v-model termine de commitear
		 * la sucursal al store: getPriceVender() lee vender.address_id, y tiene que ver la nueva.
		 * Sin renglones no hay nada que re-preciar y no se llama a setTotal().
		 *
		 * @returns {void}
		 */
		al_cambiar_sucursal() {
			let self = this
			self.$nextTick(() => {
				if (self.$store.state.vender.items.length) {
					self.setTotal()
				}
			})
		},
	},
}
</script>
<style lang="sass">
/* Botón de ayuda dentro del append — mismo alto que el prepend */
.vender-address-help-btn
	cursor: help
	color: var(--color-text-secondary, #6c757d)
	transition: color 0.15s ease, background 0.15s ease

	&:hover
		color: var(--color-primary, #007bff)
		background: var(--bg-hover, #e9ecef)

	i
		font-size: 0.95rem

// Pastilla del recargo o descuento de la sucursal (mision sucursal-recargo-descuento), pegada al
// select dentro del append del input-group.
//
// Colores: el AMBAR es un recargo y el VERDE un descuento, los mismos que los badges de la tienda
// (#c25e00 / #00a650). El texto y el borde salen de los tokens de estado de _dark_theme.sass
// (--color-text-warning-strong / --color-text-success-strong), que solo existen en modo oscuro: en
// claro cada uno cae a su literal de fallback, un tono mas oscuro que el badge para que el texto
// chico llegue a 4,5:1 sobre el tinte. Los fondos son translucidos (rgba) a proposito, asi se apoyan
// sobre el input-group en los dos modos; para el ambar existe --bg-warning-soft, para el verde no
// hay token y va el rgba directo. Si cambia la paleta, cambia tambien el chip de la sucursal en
// VenderStage1SummaryBar.vue, que usa la misma.
//
// Tres clases de selector y no una: en oscuro `html.dark-mode .input-group-text` ya le pinta
// fondo, borde y color a cualquier append, y una sola clase perderia contra esa regla.
//
// Angosto: el texto es corto (`Recargo +10%`), la letra chica y el ancho tiene tope con
// puntos suspensivos, asi en un celular (360 px) el select de al lado conserva lugar. Nunca puede
// empujar la fila para afuera: el select tiene min-width 0 y se achica antes.
.vender-address .input-group-text.vender-address-ajuste
	min-width: 0
	max-width: 9.5rem
	padding-left: 0.5rem
	padding-right: 0.5rem
	font-size: 0.75rem
	font-weight: 600
	line-height: 1.2
	cursor: help
	border-width: 1px
	border-style: solid

.vender-address .input-group-text.vender-address-ajuste--recargo
	color: var(--color-text-warning-strong, #9a4a00)
	background-color: var(--bg-warning-soft, rgba(194, 94, 0, 0.12))
	border-color: var(--color-text-warning-strong, #c25e00)

.vender-address .input-group-text.vender-address-ajuste--descuento
	color: var(--color-text-success-strong, #0b6b37)
	background-color: rgba(0, 166, 80, 0.12)
	border-color: var(--color-text-success-strong, #00a650)

// El texto va en su propio span: el .input-group-text es flex, y un flex no corta con puntos suspensivos.
.vender-address-ajuste__texto
	min-width: 0
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
</style>
