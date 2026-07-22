<template>
	<div v-if="provider_order">

		<!--
			Toggle "Los precios ya incluyen IVA" de la compra a proveedor.
			Reemplaza el checkbox generico de ModelForm (slot #precios_incluyen_iva en Index.vue) para poder
			agregarle debajo una descripcion PERMANENTE (no tooltip) que cambia segun el estado del toggle.
			Reusa las mismas clases ".model-form__toggle*" (definidas en ModelForm.vue, sin scope, por eso
			estan disponibles aca) para mantener el mismo aspecto visual que el resto de los checkboxes del form.
			Prompt 611: este control solo se muestra para cuentas Responsable Inscripto; en Monotributista se
			oculta por completo (ver "v_if_function: es_responsable_inscripto_v_if_function" en el prop
			"precios_incluyen_iva" de src/models/provider_order.js).
		-->
		<label
		for="provider_order-precios_incluyen_iva"
		class="model-form__toggle">
			<input
			type="checkbox"
			id="provider_order-precios_incluyen_iva"
			:checked="precios_incluyen_iva_activo"
			@change="setPreciosIncluyenIva($event.target.checked)">
			<span class="model-form__toggle-track">
				<span class="model-form__toggle-thumb"></span>
			</span>
		</label>

		<!--
			Descripcion permanente (Prompt 611, tarea 3): antes esta info solo estaba en el popover de
			"descriptions" del prop (visible solo al hacer click en el label), lo que generaba confusion al
			comparar el costo del listado con la factura del proveedor. Ahora queda siempre visible y cambia
			segun el estado del toggle.
		-->
		<small class="text-muted d-block m-t-5">
			El costo del artículo se guarda siempre sin IVA (costo base).
			<span v-if="precios_incluyen_iva_activo">
				Con esta opción activada, el precio que cargues se toma como precio final con IVA incluido: el sistema calcula el costo base descontando la alícuota de IVA de cada artículo.
			</span>
			<span v-else>
				Con esta opción desactivada, el precio que cargues se toma tal cual como costo base, y el IVA se suma por encima para armar la factura.
			</span>
		</small>

	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * Compra a proveedor en edicion. Mismo patron que Total.vue / PriceDescription.vue de este
		 * mismo modulo: se lee directo del store en vez de depender del scope del slot de ModelForm.
		 */
		provider_order() {
			return this.$store.state.provider_order.model
		},
		/**
		 * Estado actual (normalizado a booleano) del campo "precios_incluyen_iva" de la compra.
		 * Se usa tanto para el checked del input como para elegir que texto de descripcion mostrar.
		 */
		precios_incluyen_iva_activo() {
			return !!(this.provider_order && Number(this.provider_order.precios_incluyen_iva) === 1)
		},
	},
	methods: {
		/**
		 * Actualiza "precios_incluyen_iva" en el modelo de la compra en edicion al togglear el control.
		 *
		 * @param {Boolean} checked Nuevo estado del checkbox.
		 */
		setPreciosIncluyenIva(checked) {
			this.$set(this.provider_order, 'precios_incluyen_iva', checked ? 1 : 0)
		},
	},
}
</script>
