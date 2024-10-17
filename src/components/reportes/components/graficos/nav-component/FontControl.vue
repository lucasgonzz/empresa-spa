<template>
	<div class="font-control m-t-15">
		<b-input-group
		prepend="Tamaño de Fuente">
			<b-form-input
			type="number"
			@keydown.enter="set_font_size"
			@click="set_font_size"
			v-model="font_size"></b-form-input>
		</b-input-group>
	</div>
</template>
<script>
export default {
	data() {
		return {
			font_size: 11,
		}
	},
	methods: {
		set_font_size() {
			this.$store.commit('reportes/font/set_font_size', Number(this.font_size))
		},
	},
	// computed: {
	// 	font_size: {
	// 		get() {
	// 			return this.$store.state.reportes.font.font_size
	// 		},
	// 		set(value) {
	// 			this.$store.commit('reportes/font/set_font_size', Number(value))
	// 		}
	// 	},
	// },
}
</script>
<style lang="sass">
.font-control
	.input-group 
		width: 300px
</style>