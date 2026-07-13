<template>
	<!--
		Desplegable checklist de props buscables: agrupa "Propias" (tildadas por default,
		el padre decide el default) y "Relaciones" (agregables por el usuario).
		Es un componente de presentación puro: no toca el store, solo emite toggle-prop /
		toggle-relation y el padre (Index.vue) decide qué hacer con la selección.
	-->
	<b-dropdown
	class="buscador-general-dropdown"
	variant="outline-secondary"
	size="sm"
	no-caret
	toggle-class="buscador-general-dropdown__toggle"
	menu-class="buscador-general-dropdown__menu">
		<template #button-content>
			<i class="icon-filter"></i>
		</template>

		<!-- Sección "Propias": props del modelo (text/textarea/number), tildadas por default -->
		<div class="buscador-general-dropdown__section-title">Propias</div>
		<b-dropdown-form
		v-for="property in own_props"
		:key="'own_'+property.key">
			<b-form-checkbox
			:checked="selected_props.indexOf(property.key) !== -1"
			@change="$emit('toggle-prop', property.key)">
				{{ property.text }}
			</b-form-checkbox>
		</b-dropdown-form>

		<!-- Sección "Relaciones": solo se muestra si el modelo tiene relaciones buscables -->
		<template v-if="relation_props.length">
			<b-dropdown-divider></b-dropdown-divider>
			<div class="buscador-general-dropdown__section-title">Relaciones</div>
			<b-dropdown-form
			v-for="property in relation_props"
			:key="'rel_'+property.key">
				<b-form-checkbox
				:checked="selected_relations.indexOf(property.key) !== -1"
				@change="$emit('toggle-relation', property.key)">
					{{ property.text }}
				</b-form-checkbox>
			</b-dropdown-form>
		</template>
	</b-dropdown>
</template>
<script>
export default {
	/**
	 * PropertiesDropdown — checklist multi-select de props/relaciones para BuscadorGeneral.
	 * Componente de presentación: recibe las listas y la selección actual, y emite eventos
	 * de toggle; no mantiene estado propio ni conoce el store.
	 */
	props: {
		/**
		 * Props propias del modelo: [{ key, text }].
		 */
		own_props: {
			type: Array,
			required: true,
		},

		/**
		 * Relaciones buscables del modelo: [{ key, text, relation, props }].
		 */
		relation_props: {
			type: Array,
			required: true,
		},

		/**
		 * Keys de own_props actualmente tildadas.
		 */
		selected_props: {
			type: Array,
			required: true,
		},

		/**
		 * Keys de relation_props actualmente tildadas.
		 */
		selected_relations: {
			type: Array,
			required: true,
		},
	},
}
</script>
<style lang="sass">
// Ancho cómodo para el checklist, con scroll si el modelo tiene muchas props.
.buscador-general-dropdown__menu
	max-height: 60vh
	overflow-y: auto
	min-width: 220px

// Título de sección dentro del dropdown: sutil, tipo "eyebrow".
.buscador-general-dropdown__section-title
	padding: 6px 16px 2px
	font-size: 0.7rem
	font-weight: 600
	letter-spacing: 0.02em
	text-transform: uppercase
	color: rgba(33, 37, 41, 0.5)

// El botón del dropdown (solo ícono) mantiene la misma altura que el resto del grupo de input.
.buscador-general-dropdown__toggle
	display: flex
	align-items: center
	justify-content: center
</style>
