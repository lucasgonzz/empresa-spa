<template>
<b-modal
:no-close-on-backdrop="backdrop"
:id="id" hide-footer hide-header size="sm">
	<p
	class="text-center">
		{{ confirm_text }}
	</p>
	<btn-loader
	:variant="variant"
	@clicked="confirm"
	:text="btn_text"
	:loader="loading"></btn-loader>
	<slot name="footer">
	</slot>
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
		backdrop: {
			type: Boolean,
			default: false,
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
	            this.$emit(this.emit)
	            this.$bvModal.hide(this.id)
	            return
	        }

	        this.loading = true

	        try {

	            this.$emit('confirmed') // ojo: tenías 'confimed' (typo)
	            
	            // Ejecuta una por una, en orden. Si alguna falla, salta al catch.
	            for (let i = 0; i < this.actions.length; i++) {
	                await this.$store.dispatch(this.actions[i])
	            }

	            // Si llegó acá, salieron todas bien
	            this.$toast.success(this.toast)
	            this.$bvModal.hide(this.id)
	            if (this.model_name) {
	                this.$bvModal.hide(this.model_name)
	            }
	        } catch (err) {
	            // Corta acá en el primer error
	            this.$toast.error('Error al ejecutar la acción')
	            // Si querés mostrar algo más útil:
	            const msg = err?.response?.data?.message || err?.message || String(err)
	            this.$toast.error(msg)
	        } finally {
	            this.loading = false
	        }
		},
	}
}
</script>