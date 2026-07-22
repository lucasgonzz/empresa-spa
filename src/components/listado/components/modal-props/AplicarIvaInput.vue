<template>
	<div v-if="article">

		<!--
			Prompt 612: reemplaza el checkbox generico de ModelForm (slot #aplicar_iva en Listado.vue).
			Este slot SOLO se monta cuando la cuenta es Responsable Inscripto: el prop "aplicar_iva"
			de src/models/article.js tiene "v_if_function: es_responsable_inscripto_v_if_function",
			que en Monotributista lo oculta por completo (ni checkbox ni texto). Reusa las mismas
			clases ".model-form__toggle*" (definidas sin scope en ModelForm.vue) para mantener el
			mismo aspecto visual que el resto de los toggles del formulario.
		-->
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
	},
	created() {
		/**
		 * Fuerza "aplicar_iva" a activado (1) para Responsable Inscripto. Este componente solo se
		 * monta cuando la cuenta es RRII (ver v_if_function del prop en src/models/article.js), asi
		 * que forzar el valor aca es seguro y cubre el caso de articulos viejos que hayan quedado
		 * guardados con aplicar_iva = 0 antes de este cambio.
		 */
		if (this.article) {
			this.$set(this.article, 'aplicar_iva', 1)
		}
	},
}
</script>
