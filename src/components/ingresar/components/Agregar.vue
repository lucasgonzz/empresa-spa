<template>
	<b-dropdown 
	variant="primary"
	right>
		<template v-slot:button-content>
			<i class="icon-plus"></i>
		</template>
		<b-dropdown-item
		v-if="has_online"
		v-b-modal="'categories'">
			Categorias
		</b-dropdown-item>
		<b-dropdown-item
		v-if="has_online"
		v-b-modal="'sub_categories'">
			Sub categorias
		</b-dropdown-item>
		<b-dropdown-item
		v-if="has_online"
		v-b-modal="'brands'">
			Marcas
		</b-dropdown-item>
		<b-dropdown-item
		v-b-modal="'locations'">
			Localidades
		</b-dropdown-item>
		<b-dropdown-item
		v-b-modal="'price_types'">
			Tipos de precio
		</b-dropdown-item>
		<b-dropdown-item
		v-b-modal="'deposits'">
			Depositos
		</b-dropdown-item>
		<b-dropdown-item
		v-b-modal="'credit_cards'">
			Tarjetas de credito
		</b-dropdown-item>
		<b-dropdown-item
		v-if="has_online"
		v-b-modal="'conditions'">
			Condiciones
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
export default {
	name: 'Agregar'
}
</script>