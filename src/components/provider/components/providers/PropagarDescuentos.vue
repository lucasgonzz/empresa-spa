<template>
<!--
	Mision descuentos-proveedor-propagar (4/9/2026): al guardar un proveedor al que se le
	cambiaron los descuentos, se le pregunta al usuario si propaga ese cambio a los articulos
	que ya tienen esos descuentos copiados.

	Por que hace falta preguntar y no hacerlo solo: los descuentos que el articulo tiene son una
	COPIA, y alguno pudo haber sido editado a mano para ESE articulo puntual. La ventana muestra
	cuantos hay de cada tipo para que la decision se tome con el numero a la vista.

	Reemplaza en la practica al disparador viejo (ProviderController miraba si algun descuento se
	habia tocado en los ultimos 2 minutos y encolaba un recalculo de precios): ese recalculo leia
	las copias viejas, asi que devolvia exactamente el mismo precio.
-->
<b-modal
title="Actualizar los articulos de este proveedor"
hide-footer
id="propagar-descuentos-proveedor"
@hidden="reset">

	<div v-if="loading">
		<b-skeleton width="100%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="80%" height="20px"></b-skeleton>
	</div>

	<div v-else>

		<!--
			El texto NO afirma que el usuario acaba de cambiar los descuentos: la ventana se dispara
			en cualquier guardado del proveedor (modelSaved), asi que decir "cambiaste los
			descuentos" seria mentira cada vez que alguien guarda por otra razon. Se describe lo que
			el sistema efectivamente ve: hay articulos cuyos descuentos no coinciden con la ficha.
		-->
		<p class="m-b-20">
			Hay articulos de <strong>{{ provider_name }}</strong> cuyos descuentos no coinciden con
			los que tiene cargados el proveedor.
		</p>

		<div class="propagar-resumen m-b-20">
			<p class="m-b-5">
				<strong>{{ desactualizados }}</strong>
				{{ desactualizados == 1 ? 'articulo se va a actualizar' : 'articulos se van a actualizar' }}.
			</p>
			<p
			v-if="al_dia"
			class="text-muted m-b-5">
				{{ al_dia }} {{ al_dia == 1 ? 'ya esta al dia' : 'ya estan al dia' }}.
			</p>
			<p
			v-if="editados_a_mano"
			class="text-muted m-b-0">
				{{ editados_a_mano }}
				{{ editados_a_mano == 1 ? 'tiene un descuento que editaste a mano' : 'tienen descuentos que editaste a mano' }}.
			</p>
		</div>

		<!-- El tilde solo aparece si hay algo que pisar: si no, es una pregunta sin objeto -->
		<div
		v-if="editados_a_mano"
		class="propagar-opcion m-b-20">
			<b-form-checkbox
			v-model="pisar_editados_a_mano">
				Actualizar tambien los que edite a mano
			</b-form-checkbox>
			<p class="text-muted m-l-25 m-b-0 m-t-5">
				Si lo activas, esos {{ editados_a_mano }} van a quedar con los descuentos del proveedor y se pierde el valor que les habias puesto.
			</p>
		</div>

		<div class="text-right">
			<b-button
			variant="outline-secondary"
			class="m-r-10"
			@click="$bvModal.hide('propagar-descuentos-proveedor')">
				No actualizar
			</b-button>
			<btn-loader
			variant="primary"
			:block="false"
			:loader="saving"
			@clicked="confirm"
			text="Actualizar articulos"></btn-loader>
		</div>

	</div>

</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

export default {
	components: {
		BtnLoader,
	},
	data() {
		return {
			provider_id: null,
			provider_name: '',

			loading: false,
			saving: false,

			al_dia: 0,
			desactualizados: 0,
			editados_a_mano: 0,

			// Por defecto NO se pisan: un descuento editado a mano es una decision comercial
			pisar_editados_a_mano: false,
		}
	},
	methods: {
		// La llama el contenedor cuando se guardo un proveedor con descuentos cambiados
		abrir(provider) {
			this.provider_id = provider.id
			this.provider_name = provider.name
			this.loading = true

			let self = this
			this.$api.get('provider/'+provider.id+'/propagar-descuentos/preview')
			.then(res => {
				self.loading = false
				self.al_dia = res.data.al_dia
				self.desactualizados = res.data.desactualizados
				self.editados_a_mano = res.data.editados_a_mano

				/*
					Si no hay nada que actualizar no se le muestra la ventana: preguntarle por 0
					articulos es ruido. Tampoco si la preferencia de la cuenta esta apagada, porque
					en ese caso el sistema no copia descuentos a los articulos y no hay nada que
					propagar.
				*/
				if (!res.data.preferencia_activa || (!self.desactualizados && !self.editados_a_mano)) {
					self.$bvModal.hide('propagar-descuentos-proveedor')
					return
				}

				self.$bvModal.show('propagar-descuentos-proveedor')
			})
			.catch(err => {
				self.loading = false
				console.log(err)
			})
		},
		confirm() {
			this.saving = true
			this.$store.commit('auth/setMessage', 'Actualizando articulos')
			this.$store.commit('auth/setLoading', true)

			let self = this
			this.$api.put('provider/'+this.provider_id+'/propagar-descuentos', {
				pisar_editados_a_mano: this.pisar_editados_a_mano,
			})
			.then(res => {
				self.saving = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let actualizados = res.data.actualizados

				self.$toast.success(
					actualizados == 1
						? 'Se actualizo 1 articulo'
						: 'Se actualizaron '+actualizados+' articulos'
				)

				self.$bvModal.hide('propagar-descuentos-proveedor')
			})
			.catch(err => {
				self.saving = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)

				/*
					El aviso de error no es cosmetico: sin el, el usuario ve desaparecer el loader y
					nada mas, y lo natural es volver a apretar "Actualizar articulos". La operacion
					recorre articulo por articulo, asi que en un catalogo grande puede cortarse por
					tiempo — y ahi hace falta que quede claro que se corto y que puede haber quedado
					a medias, no que parezca que no paso nada.
				*/
				self.$toast.error('No se pudieron actualizar los articulos. Si el proveedor tiene muchos, puede haber quedado a medias: volve a intentar y revisa el resultado.')

				self.$bvModal.hide('propagar-descuentos-proveedor')
			})
		},
		reset() {
			this.provider_id = null
			this.provider_name = ''
			this.al_dia = 0
			this.desactualizados = 0
			this.editados_a_mano = 0
			this.pisar_editados_a_mano = false
		},
	},
}
</script>
<style scoped lang="sass">
.propagar-resumen
	padding: 10px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.02)

.propagar-opcion
	padding: 10px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.02)
</style>
