<template>
	<!--
		Un bloque de una zona en la miniatura de un Diseño de PDF (misión diseno-ticket-comandera,
		9/10/2026): una caja (su recuadro según el estilo, el título como una raya oscura y un renglón
		gris por campo), un bloque fijo de ARCA (el del cliente con sus renglones; el del pie con el QR
		y, si lo tiene, el cuadro de importes) o un salto de fila (no se ve: corta la fila). Ocupa sus
		N/12 de la fila: el ancho lo pone la zona de la miniatura leyendo `data-cols` (Index.vue).
	-->
	<span
	v-if="bloque.tipo === 'salto'"
	class="miniatura-pdf__celda miniatura-pdf__celda--salto"
	data-cols="12"></span>

	<span
	v-else
	class="miniatura-pdf__celda"
	:data-cols="bloque.cols">
		<span
		v-if="bloque.tipo === 'caja'"
		class="miniatura-pdf__caja"
		:class="'miniatura-pdf__caja--' + bloque.estilo">
			<span
			v-if="bloque.con_titulo"
			class="miniatura-pdf__titulo"></span>
			<span
			v-for="renglon in bloque.renglones"
			:key="renglon.clave"
			class="miniatura-pdf__renglon"
			:class="'miniatura-pdf__renglon--' + renglon.alineacion">
				<span
				v-if="renglon.imagen"
				class="miniatura-pdf__imagen"></span>
				<span
				v-else
				class="miniatura-pdf__raya"
				:class="{
					'miniatura-pdf__raya--negrita': renglon.negrita,
					'miniatura-pdf__raya--grande': renglon.grande,
				}"
				:style="{ width: renglon.largo + '%' }"></span>
			</span>
			<!-- Caja sin campos: en el PDF no ocupa lugar, acá un renglón punteado para que se vea -->
			<span
			v-if="!bloque.renglones.length"
			class="miniatura-pdf__vacia"></span>
		</span>

		<span
		v-else
		class="miniatura-pdf__fijo"
		:class="{ 'miniatura-pdf__fijo--pie': bloque.es_pie_de_arca }">
			<span
			v-if="bloque.es_pie_de_arca"
			class="miniatura-pdf__qr"></span>
			<span class="miniatura-pdf__fijo-renglones">
				<span
				v-for="renglon in bloque.renglones"
				:key="renglon"
				class="miniatura-pdf__raya miniatura-pdf__raya--fija"
				:style="{ width: (renglon === 1 ? 70 : 52) + '%' }"></span>
			</span>
			<span
			v-if="bloque.importes"
			class="miniatura-pdf__importes">
				<span class="miniatura-pdf__raya miniatura-pdf__raya--fija"></span>
				<span class="miniatura-pdf__raya miniatura-pdf__raya--fija"></span>
				<span class="miniatura-pdf__raya miniatura-pdf__raya--negrita"></span>
			</span>
		</span>
	</span>
</template>
<script>
/**
 * Bloque de la miniatura de un Diseño de PDF (misión diseno-ticket-comandera, 9/10/2026).
 * Presentacional: el bloque ya viene armado por armado_de_la_miniatura.js. Los estilos están en
 * Index.vue (clases miniatura-pdf__*).
 */
export default {
	name: 'BloqueDeMiniatura',
	props: {
		/* Un bloque de bloques_de_la_zona(): {tipo: 'caja'|'salto'|'fijo', cols, ...} */
		bloque: {
			type: Object,
			required: true,
		},
	},
}
</script>
