<template>
	<div
	id="btn_seleccion"
	class="align-center m-l-15"
	v-if="ask_selectable">
		<b-form-checkbox
		:unchecked-value="0"
		:button-variant="variant"
		button
		:value="1"
		v-model="is_selecteable">
			Seleccion
		</b-form-checkbox>
	</div>
</template>
<script>
export default {
	props: {
		ask_selectable: Boolean,
		model_name: String,
	},
	computed: {
		variant() {
			if (this.is_selecteable) {
				return 'warning'
			}
			return 'outline-default'
		},
		is_selecteable: {
			get() {
				return this.$store.state[this.model_name].is_selecteable
			},
			set(value) {
				this.$store.commit(this.model_name+'/setIsSelecteable', value)
				if (!this.is_selecteable) {
					this.$store.commit(this.model_name+'/setSelected', [])
				}
			},
		},
	}
}
</script>