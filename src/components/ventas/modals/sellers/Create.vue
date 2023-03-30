<template>
<b-modal
title="Nuevo vendedor"
id="create-seller"
hide-footer>
	<b-form-group
	label="Nombre">
		<b-form-input
		placeholder="Nombre del vendedor"
		v-model="form.name"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Apellido">
		<b-form-input
		placeholder="Apellido del vendedor"
		v-model="form.surname"></b-form-input>
	</b-form-group>
	<!-- <b-form-group
	label="Porcentaje">
		<b-form-input
		type="number"
		min="0"
		placeholder="Porcentaje del vendedor"
		v-model="form.percentage"></b-form-input>
	</b-form-group> -->
	<b-form-group>
		<b-button
		@click="save"
		block
		variant="primary">
			<btn-loader
			text="Guardar"
			:loader="loading"></btn-loader>			
		</b-button>
	</b-form-group>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	data() {
		return {
			form: {
				name: '',
				surname: '',
				percentage: '',
			},
			loading: false,
		}
	},
	methods: {
		save() {
			if (this.check()) {
				this.loading = true
				this.$api.post('sellers', this.form)
				.then(res => {
					this.loading = false
					this.$store.commit('sellers/add', res.data.seller)
					this.$store.commit('commissioners/add', res.data.commissioner)
					this.$toast.success('Vendedor agregado')
					this.clear()
					this.$bvModal.hide('create-seller')
				})
				.catch(err => {
					this.loading = false
					console.log(err)
					this.$toast.error('Error al guardad vendedor')
				})
			}
		},
		check() {
			if (this.form.name == '') {
				this.$toast.error('Complete el nombre del vendedor')
				return false
			}
			if (this.form.surname == '') {
				this.$toast.error('Complete el apellido del vendedor')
				return false
			}
			// if (this.form.percentage == '') {
			// 	this.$toast.error('Complete el porcentaje del vendedor')
			// 	return false
			// }
			return true
		},
		clear() {
			this.form = {
				name: '',
				surname: '',
				percentage: '',
			}
		}
	}
}
</script>