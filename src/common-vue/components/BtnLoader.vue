<template>
	<b-button
	:size="size"
	@click.stop="clicked"
	:disabled="_disabled"
	:block="block"
	:variant="variant">
		<span 
		v-show="(loader == true && !index) || index == loader"
		class="spinner-border spinner-border-sm"></span>
		<span v-show="(loader == false || (index && loader != index)) && icon != ''">
			<i :class="'icon-'+icon"></i>
		</span>
		<span v-show="(loader == false || (index && loader != index)) && text != ''">
			{{ text }}
		</span>
	</b-button>
</template>
<script>
export default {
	props: {
		loader: {
			default: null,
		},
		text: {
			default: null,
		},
		icon: {
			default: null,
		},
		index: {
			default: null,
		},
		variant: {
			type: String,
			default: 'primary',
		},
		block: {
			type: Boolean,
			default: true,
		},
		size: {
			type: String,
			default: 'md',
		},
		prop_to_send_on_emit: {
			type: Object,
			default: null
		},
		disabled: {
			type: Boolean,
			default: false
		},
	},
	computed: {
		_disabled() {
			if (this.disabled) {
				return this.disabled
			}
			if (this.loader == 0) {
				return false
			}
			if (this.loader == 1) {
				return true
			}
			return this.loader
		},
	},
	methods: {
		clicked() {
			this.$emit('clicked', this.prop_to_send_on_emit)
		}
	}
}
</script>
<style scoped lang="sass">
.spinner-border
	margin-right: .1em
</style>