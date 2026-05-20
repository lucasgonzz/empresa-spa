<template>
	<b-button
	v-b-tooltip.hover
	:title="tooltip_text"
	@click="update_article_list"
	:disabled="is_loading"
	class="btn-update-article-list m-r-15"
	dusk="btn_update_article_list"
	size="sm"
	variant="outline-primary">
		<i
		:class="loading_icon_class"
		class="m-r-5"
		aria-hidden="true"></i>
		<span>{{ button_label }}</span>
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
		/** Texto visible del botón. */
		button_label() {
			if (this.is_loading) {
				return 'Actualizando...'
			}
			return 'Actualizar'
		},
		/** Icono Bootstrap: spinner durante carga, reloj en reposo. */
		loading_icon_class() {
			if (this.is_loading) {
				return 'bi bi-arrow-repeat spin-icon'
			}
			return 'bi bi-clock-history'
		},
		/** Ayuda al pasar el mouse sobre el control. */
		tooltip_text() {
			return 'Cargar los artículos modificados recientemente en el listado'
		},
	},
	methods: {
		/**
		 * Dispara la recarga de artículos vía mixin (`articles-ultimos-actualizados`).
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
