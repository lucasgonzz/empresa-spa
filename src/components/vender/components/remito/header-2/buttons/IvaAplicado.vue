<template>
	<!--
		Elemento `precios_con_iva` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). La condicion para mostrarlo la calculaba stage-3/IvaYStock.vue, que agrupaba
		este interruptor con el de stock y las observaciones; con los diseños cada uno es un campo
		suelto que se puede ubicar en cualquier etapa, asi que la condicion vive aca.

		Mision iva-a-articulos-sin-iva-en-vender (1/10/2026): debajo de "Precios con IVA" va
		"Sumar IVA a los artículos sin IVA", DENTRO de este mismo elemento. Asi queda siempre al lado
		del check del que depende sin tocar el sistema de diseños ni los diseños que ya guardaron los
		clientes. La regla de precio de los dos vive en utils/iva_en_vender.js.

		El icono de ayuda va adentro del rotulo (con @click.stop, para que tocarlo no prenda ni
		apague el check): en tablet la celda del elemento mide ~115px (ver layout/elementos.js) y un
		icono suelto al costado le comeria el ancho al rotulo largo.
	-->
	<div
	v-if="puede_usar_iva_aplicado"
	class="vender-iva-aplicado">

		<vender-toggle
		input_id="vender-precios-con-iva"
		row_class="vender-toggle-row--multiline"
		v-model="iva_aplicado">
			Precios con IVA
			<i
			:id="ayuda_precios_con_iva_id"
			class="icon-info vender-iva-aplicado__ayuda"
			role="button"
			tabindex="0"
			aria-label="Qué hace Precios con IVA"
			@click.stop></i>
		</vender-toggle>

		<b-popover
		:target="ayuda_precios_con_iva_id"
		triggers="hover focus click"
		placement="bottom">
			<template #title><strong>Precios con IVA</strong></template>

			<!-- Cuenta con configuracion vieja: hay articulos con y sin IVA aplicado -->
			<div
			v-if="muestra_iva_en_articulos_sin_iva"
			class="vender-iva-aplicado__popover">
				<p>
					Prendido, cada artículo sale al precio que tiene en el listado.
					Apagado, a los artículos que tienen el IVA aplicado se les saca el IVA (salen más baratos); los que no lo tienen aplicado quedan igual.
				</p>
				<p>
					Ejemplo con IVA 21%:<br>
					<strong>A</strong>: con IVA aplicado, $1.210 en el listado.<br>
					<strong>B</strong>: sin IVA aplicado, $1.000 en el listado.
				</p>
				<p>
					Prendido: A $1.210 · B $1.000<br>
					Apagado: A $1.000 · B $1.000
				</p>
				<p>
					Para sumarle el IVA a B, prendé también "Sumar IVA a los artículos sin IVA".
				</p>
			</div>

			<!-- Cuenta migrada (o Monotributista): todos los precios del listado traen el IVA -->
			<div
			v-else
			class="vender-iva-aplicado__popover">
				<p>
					Prendido, cada artículo sale al precio que tiene en el listado, con el IVA incluido.
					Apagado, se le saca el IVA al precio.
				</p>
				<p>
					Ejemplo con IVA 21%: un artículo de $1.210 en el listado sale $1.210 prendido y $1.000 apagado.
				</p>
			</div>
		</b-popover>

		<template
		v-if="muestra_iva_en_articulos_sin_iva">
			<vender-toggle
			input_id="vender-iva-en-articulos-sin-iva"
			row_class="vender-toggle-row--multiline"
			:disabled="!iva_aplicado"
			v-model="iva_en_articulos_sin_iva">
				Sumar IVA a los artículos sin IVA
				<i
				:id="ayuda_iva_en_articulos_sin_iva_id"
				class="icon-info vender-iva-aplicado__ayuda"
				role="button"
				tabindex="0"
				aria-label="Qué hace Sumar IVA a los artículos sin IVA"
				@click.stop></i>
			</vender-toggle>

			<b-popover
			:target="ayuda_iva_en_articulos_sin_iva_id"
			triggers="hover focus click"
			placement="bottom">
				<template #title><strong>Sumar IVA a los artículos sin IVA</strong></template>
				<div class="vender-iva-aplicado__popover">
					<p>
						A los artículos que tienen "Aplicar IVA" apagado en el listado les suma el IVA de su alícuota. Los que ya tienen el IVA aplicado quedan igual.
					</p>
					<p>
						Ejemplo con IVA 21%:<br>
						<strong>A</strong>: con IVA aplicado, $1.210 en el listado.<br>
						<strong>B</strong>: sin IVA aplicado, $1.000 en el listado.
					</p>
					<p>
						Prendido: A $1.210 · B $1.210<br>
						Apagado: A $1.210 · B $1.000
					</p>
					<p>
						Solo se puede usar con "Precios con IVA" prendido: si lo apagás, este control se apaga y queda bloqueado.
					</p>
				</div>
			</b-popover>
		</template>

	</div>
</template>
<script>
import VenderToggle from '@/components/vender/components/VenderToggle'
import vender_set_total from '@/mixins/vender_set_total'

export default {
	components: {
		VenderToggle,
	},
	mixins: [vender_set_total],
	computed: {
		/**
		 * Si este usuario puede usar el interruptor "Precios con IVA": la extension
		 * hide_iva_and_discount_stock_in_vender lo oculta para todo el negocio, y ademas hace
		 * falta el permiso vender.iva_aplicado. Es la regla que tenia can_use_iva_aplicado en el
		 * difunto stage-3/IvaYStock.vue, y la misma que el `disponible` de `precios_con_iva` en
		 * layout/elementos.js: si se cambia una, se cambia la otra.
		 *
		 * @returns {boolean}
		 */
		puede_usar_iva_aplicado() {
			return !this.hasExtencion('hide_iva_and_discount_stock_in_vender')
				&& this.can('vender.iva_aplicado')
		},

		/**
		 * Si se muestra "Sumar IVA a los artículos sin IVA". Ademas de las condiciones de "Precios
		 * con IVA" (este componente entero ya depende de ellas), solo en cuentas con la
		 * configuracion vieja y que no son Monotributistas: ver
		 * cuenta_admite_iva_en_articulos_sin_iva() en src/mixins/generals.js.
		 *
		 * @returns {boolean}
		 */
		muestra_iva_en_articulos_sin_iva() {
			return this.cuenta_admite_iva_en_articulos_sin_iva()
		},

		/* IDs unicos de los iconos de ayuda, para enganchar cada b-popover */
		ayuda_precios_con_iva_id() {
			return 'vender-precios-con-iva-ayuda-' + this._uid
		},
		ayuda_iva_en_articulos_sin_iva_id() {
			return 'vender-iva-en-articulos-sin-iva-ayuda-' + this._uid
		},

		/*
		 * Computed con getter/setter para enlazar el toggle con el store.
		 * Lee y escribe vender/iva_aplicado como boolean y recalcula el total.
		 */
		iva_aplicado: {
			/*
			 * Getter del estado actual de iva_aplicado en store.
			 */
			get() {
				return this.$store.state.vender.iva_aplicado == 1
			},
			/*
			 * Setter del estado de iva_aplicado.
			 * Al cambiar el flag, recalcula precios/totales del remito.
			 */
			set(value) {
				// Valor normalizado en formato 1/0 para persistencia consistente.
				let iva_aplicado_value = value ? 1 : 0
				this.$store.commit('vender/set_iva_aplicado', iva_aplicado_value)
				/*
					Sin "Precios con IVA" el check nuevo no tiene efecto y queda bloqueado: se apaga,
					para que al volver a prender "Precios con IVA" no reaparezca prendido solo y para
					que la venta no se guarde con un 1 que no se aplico.
				*/
				if (!iva_aplicado_value) {
					this.$store.commit('vender/set_iva_en_articulos_sin_iva', 0)
				}
				this.setTotal()
			},
		},

		/*
		 * "Sumar IVA a los artículos sin IVA": lee y escribe vender/iva_en_articulos_sin_iva
		 * como boolean y recalcula el total.
		 */
		iva_en_articulos_sin_iva: {
			get() {
				return this.$store.state.vender.iva_en_articulos_sin_iva == 1
			},
			set(value) {
				this.$store.commit('vender/set_iva_en_articulos_sin_iva', value ? 1 : 0)
				this.setTotal()
			},
		},
	},
}
</script>
<style lang="sass">
/* Los dos checks de IVA, uno debajo del otro, dentro del mismo elemento del diseño */
.vender-iva-aplicado
	display: flex
	flex-direction: column
	gap: 4px
	min-width: 0

	// En tablet la celda mide ~115px: el rotulo tiene que poder partirse en varias lineas sin
	// pasarse al campo de al lado. min-width 0 deja que el texto se achique dentro del flex, y
	// break-word solo corta una palabra si no entra entera en el renglon.
	.vender-toggle-row
		min-width: 0

	.vender-toggle__label
		min-width: 0
		overflow-wrap: break-word

/* Icono de ayuda pegado al rotulo, mismo color que el de la sucursal (Address.vue) */
.vender-iva-aplicado__ayuda
	cursor: help
	margin-left: 2px
	font-size: 0.85rem
	color: var(--color-text-secondary, #6c757d)
	transition: color 0.15s ease

	&:hover
		color: var(--color-primary, #007bff)

/* Texto del popover: parrafos cortos con poco aire entre si */
.vender-iva-aplicado__popover
	font-size: 0.85rem

	p
		margin-bottom: 6px

		&:last-child
			margin-bottom: 0
</style>
