<template>
	<b-row
	class="m-t-20"
	v-if="hasExtencion('buscar_por_categoria_en_vender')">
		<b-col
		cols="12">
			<buscador-articulos
			placeholder="Buscar articulo"
			@setSelected="setSelected"></buscador-articulos>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components : {
		BuscadorArticulos: () => import('@/components/common/buscador-articulos/Index'),
	},
	data() {
	},
	computed: {
	},
	methods: {
		setSelected(result) {
			this.setModel(result.model, 'article')
		},
	}
}
</script>