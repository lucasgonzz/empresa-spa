<template>
<b-card 
class="m-t-15 m-b-15 s-1"
header="Cambiar contraseña"
v-if="view == 'contraseña'">
	<b-form-group
	label="Contraseña actual"
	label-for="current-password">
		<b-form-input
		id="current-password"
		v-model="form.current_password"
		@keyup.enter="updatePassword"
		placeholder="Ingrese la contraseña actual"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Nueva contraseña"
	label-for="new-password">
		<b-form-input
		id="new-password"
		v-model="form.new_password"
		@keyup.enter="updatePassword"
		placeholder="Ingrese la nueva contraseña"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Confirme la nueva contraseña"
	label-for="confirm-new-password">
		<b-form-input
		id="confirm-new-password"
		v-model="form.confirm_new_password"
		@keyup.enter="updatePassword"
		placeholder="Confirme la nueva contraseña"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="updatePassword"
	text="Actualizar"
	:loader="updating_password"></btn-loader>
</b-card>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	data() {
		return {
			form: {
				current_password: '',
				new_password: '',
				confirm_new_password: '',
			},
			updating_password: false,
		}
	},
	methods: {
		updatePassword() {
			if (this.check()) {
				this.updating_password = true
				this.$api.put('user-password', this.form)
				.then(res => {
					this.updating_password = false
					if (res.data.updated) {
						this.$toast.success('Contraseña actualizada')
						this.clear()
						this.$bvModal.hide('update-password')
					} else {
						this.$toast.error('La contraseña actual no es correcta')
					}
				})
				.catch(err => {
					this.updating_password = false
					console.log(err)
				})
			}
		},
		check() {
			if (this.form.current_password == '') {
				this.$toast.error('Ingrese la contraseña actual')
				return false
			}
			if (this.form.new_password == '') {
				this.$toast.error('Ingrese una nueva contraseña')
				return false
			}
			if (this.form.confirm_new_password == '') {
				this.$toast.error('Confirme la nueva contraseña')
				return false
			}
			if (this.form.confirm_new_password != this.form.new_password) {
				this.$toast.error('Las la nueva contraseña no fue confirmada correctamente')
				return false
			}
			return true
		},
		clear() {
			this.form.current_password = ''
			this.form.new_password = ''
			this.form.confirm_new_password = ''
		}
	}
}
</script>