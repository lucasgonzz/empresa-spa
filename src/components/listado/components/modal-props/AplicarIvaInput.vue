<template>
	<div v-if="article">

		<!--
			Prompt 612: reemplaza el checkbox generico de ModelForm (slot #aplicar_iva en Listado.vue).
			Este slot SOLO se monta cuando la cuenta es Responsable Inscripto: el prop "aplicar_iva"
			de src/models/article.js tiene "v_if_function: es_responsable_inscripto_v_if_function",
			que en Monotributista lo oculta por completo (ni checkbox ni texto). Reusa las mismas
			clases ".model-form__toggle*" (definidas sin scope en ModelForm.vue) para mantener el
			mismo aspecto visual que el resto de los toggles del formulario.

			Mision iva-a-articulos-sin-iva-en-vender (1/10/2026, decision de Lucas): en las cuentas
			con la configuracion VIEJA (owner.usar_condicion_fiscal_en_costeo apagado) vuelve a ser
			un check normal que se prende y se apaga. En las cuentas migradas sigue bloqueado en Si.
		-->

		<!-- Cuenta con configuracion vieja: check normal ligado a article.aplicar_iva -->
		<template v-if="es_cuenta_con_configuracion_vieja">
			<label
			for="article-aplicar_iva"
			class="model-form__toggle">
				<input
				type="checkbox"
				id="article-aplicar_iva"
				data-testid="article-aplicar_iva"
				:checked="aplicar_iva_prendido"
				@change="set_aplicar_iva($event.target.checked)">
				<span class="model-form__toggle-track">
					<span class="model-form__toggle-thumb"></span>
				</span>
			</label>

			<small class="text-muted d-block m-t-5">
				Si lo apagás, el precio de este artículo no lleva IVA. En Vender, si ves el check "Sumar IVA a los artículos sin IVA", con ese check se lo podés sumar en una venta puntual.
			</small>
		</template>

		<!-- Cuenta migrada: bloqueado en Si, como siempre -->
		<template v-else>
			<label
			for="article-aplicar_iva"
			class="model-form__toggle model-form__toggle--disabled">
				<input
				type="checkbox"
				id="article-aplicar_iva"
				:checked="true"
				disabled>
				<span class="model-form__toggle-track">
					<span class="model-form__toggle-thumb"></span>
				</span>
			</label>

			<small class="text-muted d-block m-t-5">
				El IVA se aplica siempre a este articulo, no se puede desactivar. Si el articulo esta exento o no gravado, elegi esa alicuota en el campo "Iva" de mas arriba en lugar de este control.
			</small>
		</template>

	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * Articulo en edicion (modal de ModelForm), leido directo del store, mismo patron que
		 * CostInput.vue de este mismo modulo.
		 */
		article() {
			return this.$store.state.article.model
		},

		/**
		 * Si la cuenta usa la configuracion vieja de costeo (sin la condicion fiscal). La
		 * configuracion es del negocio, asi que para un empleado se mira el owner. Sin owner
		 * resuelto se trata como migrada: es el comportamiento de antes de esta mision.
		 *
		 * @returns {boolean}
		 */
		es_cuenta_con_configuracion_vieja() {
			return !!this.owner && !this.owner.usar_condicion_fiscal_en_costeo
		},

		/**
		 * Estado del check en la cuenta vieja. Un articulo nuevo nace con aplicar_iva en 1 (value
		 * del prop en src/models/article.js); solo un 0 explicito lo muestra apagado.
		 *
		 * @returns {boolean}
		 */
		aplicar_iva_prendido() {
			let valor = this.article.aplicar_iva
			return !(valor === 0 || valor === false || valor === '0')
		},
	},
	methods: {
		/**
		 * Escribe aplicar_iva (1/0) en el articulo en edicion. Con $set porque el modelo puede
		 * venir sin la clave y ModelForm lo manda tal cual al guardar (use_to_update).
		 *
		 * @param {boolean} prendido
		 */
		set_aplicar_iva(prendido) {
			this.$set(this.article, 'aplicar_iva', prendido ? 1 : 0)
		},
	},
	created() {
		/**
		 * Cuenta migrada: fuerza "aplicar_iva" a activado (1) para Responsable Inscripto. Este
		 * componente solo se monta cuando la cuenta es RRII (ver v_if_function del prop en
		 * src/models/article.js), asi que forzar el valor aca es seguro y cubre el caso de
		 * articulos viejos que hayan quedado guardados con aplicar_iva = 0 antes de este cambio.
		 *
		 * En la cuenta vieja NO se fuerza: el check se puede apagar y el valor guardado se respeta.
		 */
		if (this.article && !this.es_cuenta_con_configuracion_vieja) {
			this.$set(this.article, 'aplicar_iva', 1)
		}
	},
}
</script>
