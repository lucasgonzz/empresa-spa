<template>
<b-modal :id="id" hide-footer hide-header size="sm">
	<p
	class="text-center">
		{{ confirm_text }}
	</p>
	<btn-loader
	:variant="variant"
	@clicked="confirm"
	:text="btn_text"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	name: 'Confirm',
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading: false,
		}
	},
	props: {
		text: {
			type: String,
			default: null,
		},
		actions: {
			type: Array,
			default: () => {
				return []
			}
		},
		id: String,
		toast: {
			type: String,
			default: 'Eliminado'
		},
		btn_text: {
			type: String,
			default: 'Eliminar'
		},
		variant: {
			type: String,
			default: 'danger'
		},
		not_show_delete_text: {
			type: Boolean,
			default: false,
		},
		emit: {
			type: String,
			default: null,
		},
		model_name: String,
	},
	computed: {
		confirm_text() {
			if (this.not_show_delete_text) {
				return this.text
			} else if (this.text) {
				return '¿Seguro que quiere eliminar '+this.text+'?'
			} else {
				return '¿Seguro que quiere eliminar '+this.text_delete(this.model_name)+' '+this.singular(this.model_name).toLowerCase()+'?'
			}
		},
	},
	methods: {
		async confirm() {
			if (this.emit) {
				console.log('emitiendo '+this.emit)
				this.$emit(this.emit)
				this.$bvModal.hide(this.id)
			} else {
				let action_index = 0
				this.loading = true
				while (this.actions.length && this.actions[action_index] !== undefined) {
					let res = await this.$store.dispatch(this.actions[action_index])
					action_index++
					if (this.actions[action_index] === undefined) {
						this.loading = false
						this.$toast.success(this.toast)
						this.$bvModal.hide(this.id)
						this.$bvModal.hide(this.model_name)
					}
				}
				this.$emit('confimed')
			}
		},
	}
}
</script>