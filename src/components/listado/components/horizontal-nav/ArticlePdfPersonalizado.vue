<template>
	<!--
		Sin m-l-10 y sin variant (mision 27, 11/8/2026): el espaciado lo da el gap de
		.view-header__group y un margen propio se le sumaba encima, que es de donde salia la
		separacion despareja entre estos botones. El relleno verde pasa a tinte de icono por la
		regla que establecio la mision 13: en la barra hay UNA sola accion con relleno macizo, y
		es "Crear".
	-->
	<b-button
	v-if="owner.article_pdf_personalizado"
	class="toolbar-btn--icono toolbar-btn--tinte-verde"
	@click="pdf">
		<i class="icon-list"></i>
	</b-button>
</template>
<script>
export default {
	methods: {
		pdf() {
            var link = process.env.VUE_APP_API_URL+'/article/pdf-personalizado'
            window.open(link)
		}
	}
}
</script>