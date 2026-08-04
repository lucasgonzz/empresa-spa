<template>
	<div>
		<b-form-input
		:disabled="disabled"
		v-model="article.price"
		placeholder="Precio manual"></b-form-input>
		<div
		v-if="disabled">
			<p
			class="m-t-10"
			v-if="margen_del_articulo">
				Elimine el margen de ganancia del articulo para poder fijar el precio manualmente
			</p>
			<p
			class="m-t-10"
			v-else-if="margen_del_proveedor">
				Elimine el margen de ganancia del proveedor para poder fijar el precio manualmente
			</p>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		disabled() {
			if (
				this.margen_del_articulo
				|| this.margen_del_proveedor
			) {
				return true
			}
			return false
		},
		article_provider() {
			// Antes buscaba el proveedor en el store paginado (provider.models), que ya no se
			// descarga completo al iniciar sesion (grupo 332/342, 4/8/2026). El articulo ya
			// trae la relacion embebida via scopeWithAll(), asi que no hace falta el store.
			return this.article.provider || null
		},
		margen_del_proveedor() {
			return this.article.provider_id && this.article.apply_provider_percentage_gain && (this.article_provider && this.article_provider.percentage_gain)
		},
		margen_del_articulo() {
			return (
					this.article 
					&& typeof this.article.percentage_gain != 'undefined' 
					&& this.article.percentage_gain !== null 
					&& this.article.percentage_gain != ''
				)
		},
	},
}
</script>