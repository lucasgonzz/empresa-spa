<template>
	<div
	class="card-component w-100">

		<b-form-group
		class="m-r-25"
		:label="ubication.name"
		v-for="ubication in ubications">
			
			<b-input-group
			class="m-b-15"
			prepend="Valor">
				<b-form-input
				v-model="ubication.pivot.ubication"></b-form-input>
			</b-input-group>


			<b-input-group
			prepend="Notas">
				<b-form-textarea
				v-model="ubication.pivot.notes"></b-form-textarea>
			</b-input-group>
		</b-form-group>
	</div>
</template>
<script>
export default {
	props: {
		ubications: Array,
	},
}
</script>