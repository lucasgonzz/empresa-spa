<template>
	<b-row
	class="m-t-20"
	v-if="hasExtencion('buscar_por_categoria_en_vender')">
		<b-col
		cols="12">
			<buscador-articulos-input
			placeholder="Buscar articulo"
			@setSelected="setSelected"></buscador-articulos-input>
		</b-col>
	</b-row>
</template>
<script>
export default {
	name: 'ListadoBuscadorArticulos',
	components : {
		BuscadorArticulosInput: () => import('@/components/common/buscador-articulos/Index'),
	},
	data() {
		return {}
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