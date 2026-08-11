<template>
	<b-button
	v-b-tooltip.hover
	:title="tooltip_text"
	@click="update_article_list"
	:disabled="is_loading"
	class="btn-update-article-list toolbar-btn--icono toolbar-btn--tinte-azul"
	dusk="btn_update_article_list"
	size="sm">
		<i
		:class="loading_icon_class"
		aria-hidden="true"></i>
	</b-button>
</template>
<script>
import actualizar_lista_de_articulos from '@/mixins/listado/actualizar_lista_de_articulos'

export default {
	mixins: [
		actualizar_lista_de_articulos,
	],
	computed: {
		/**
		 * True mientras el store de artículos está cargando (p. ej. petición en curso).
		 *
		 * @returns {boolean}
		 */
		is_loading() {
			return !!this.$store.state.article.loading
		},
		/** Icono Bootstrap: spinner durante carga, reloj en reposo. */
		loading_icon_class() {
			if (this.is_loading) {
				return 'bi bi-arrow-repeat spin-icon'
			}
			return 'bi bi-clock-history'
		},
		/**
		 * Ayuda al pasar el mouse sobre el control.
		 *
		 * Decía "Cargar los artículos modificados recientemente en el listado", y eso era mentira
		 * incluso antes de esta misión: el endpoint que llamaba ordena por id y devuelve los más
		 * nuevos, no los más modificados. Ahora dice lo que hace.
		 */
		tooltip_text() {
			return 'Actualizar el listado'
		},
	},
	methods: {
		/**
		 * Vuelve a pedir el listado por el mismo camino que lo armó (ver el mixin).
		 */
		update_article_list() {
			if (this.is_loading) {
				return
			}
			this.get_ultimos_articulos_actualizados()
		},
	},
}
</script>
<style scoped>
.btn-update-article-list {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}

/* Giro suave del icono mientras article.loading está activo. */
.spin-icon {
	animation: btn-update-article-list-spin 0.85s linear infinite;
}

@keyframes btn-update-article-list-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
