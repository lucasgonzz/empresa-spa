<template>
	<b-button
	v-b-popover.hover.bottom="info"
	:value="true"
	:unchecked-value="false"
	@click="set_value"
	:variant="get_variant">
		<i class="icon-check"></i>
	</b-button>
</template>
<script>
export default {
	computed: {
		info() {
			if (this.add_buscador_to_selected) {
				return 'Dejar de agregar los resultados de busqueda a la lista de ARTICULOS SELECCIONADOS'
			}
			return 'Agregar los resultados de busqueda a la lista de ARTICULOS SELECCIONADOS'
		},
		get_variant() {
			if (this.add_buscador_to_selected) {
				return 'success'
			}
			return 'outline-success'
		},
		add_buscador_to_selected: {
			get() {
				return this.$store.state.article.add_buscador_to_selected
			},
			set(value) {
				this.$store.commit('article/set_add_buscador_to_selected', value)
			}
		}
	},
	methods: {
		set_value() {
			this.add_buscador_to_selected = !this.add_buscador_to_selected

			if (!this.add_buscador_to_selected) {
				this.$store.commit('article/setSelected', [])
			}
		}
	}
}
</script>