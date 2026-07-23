<template>
<!-- Dropdown de acciones masivas de disponibilidad (prompt 519/521, extraido a sub-componente en el 543) -->
<b-dropdown
v-if="variants.length"
size="sm"
variant="outline-secondary"
text="Disponibilidad masiva"
right
class="bulk-availability">
	<b-dropdown-item @click="setDisponibilidadMasiva('todas')">
		Habilitar todas
	</b-dropdown-item>
	<b-dropdown-item @click="setDisponibilidadMasiva('con_stock')">
		Segun stock
	</b-dropdown-item>
	<b-dropdown-item @click="setDisponibilidadMasiva('ninguna')">
		Deshabilitar todas
	</b-dropdown-item>
</b-dropdown>
</template>
<script>
export default {
	props: {
		// Id del articulo cuyas variantes se estan configurando (lo necesita el endpoint de disponibilidad masiva).
		article_id: {
			type: Number,
			required: true,
		},
	},
	computed: {
		/** Variantes ya generadas para el articulo (se usan solo para decidir si el dropdown tiene sentido mostrarse). */
		variants() {
			return this.$store.state.article_variant.models
		},
	},
	methods: {
		/**
		 * Accion masiva de disponibilidad (habilitar todas / segun stock / deshabilitar todas).
		 * Pega al endpoint de disponibilidad masiva del prompt 519/521. Extraido del orquestador
		 * variant-grid/Index.vue en el prompt 543 para que este no tenga llamadas directas a $api.
		 *
		 * @param {String} accion 'todas' | 'ninguna' | 'con_stock'.
		 */
		setDisponibilidadMasiva(accion) {
			this.$store.commit('auth/setMessage', 'Actualizando disponibilidad')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('article/'+this.article_id+'/variants-disponibilidad', {
				accion: accion,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				// No manipula el listado de variantes directamente: le pasa los modelos actualizados
				// al orquestador (variant-grid/Index.vue), que es quien recarga la grilla.
				this.$emit('disponibilidad-actualizada', res.data.models)
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('No se pudo actualizar la disponibilidad')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
	},
}
</script>
