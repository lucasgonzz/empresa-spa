<template>
	<b-dropdown-header
	class="article-dropdown-section-header">
		<span class="article-dropdown-section-header__content">
			<i
			v-if="icon"
			:class="['article-dropdown-section-header__icon', icon]"></i>
			<span class="article-dropdown-section-header__text">{{ title }}</span>
		</span>
	</b-dropdown-header>
</template>
<script>
/**
 * Título de sección dentro del dropdown de acciones sobre artículos seleccionados/filtrados.
 */
export default {
	props: {
		/**
		 * Texto visible del encabezado de sección.
		 */
		title: {
			type: String,
			required: true,
		},
		/**
		 * Clase CSS del ícono (p. ej. `icon-pdf`). Opcional.
		 */
		icon: {
			type: String,
			default: '',
		},
	},
}
</script>
