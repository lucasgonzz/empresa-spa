<template>
<!--
	Prompt 309: modal de confirmacion al cambiar el proveedor de un articulo desde el
	listado. Se abre desde ModelForm.vue (hook "confirm_change_function" declarado en
	src/models/article.js sobre la propiedad "provider_id") en vez de aplicar el cambio
	directo. Expone los dos flags independientes que ya soporta el backend (prompt 308):
	eliminar los descuentos tagueados del proveedor anterior y/o crear los descuentos
	estandar (bonificaciones) del proveedor nuevo. Antes de confirmar, muestra el preview
	de que descuentos implica cada opcion para que el usuario decida con informacion.
-->
<b-modal
title="Cambiar proveedor del artículo"
hide-footer
id="change-provider-confirm"
@hidden="reset">

	<!-- Estado de carga del preview (se pide apenas se abre el modal) -->
	<div v-if="loading_preview">
		<b-skeleton width="100%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="100%" height="20px" class="m-b-10"></b-skeleton>
		<b-skeleton width="60%" height="20px"></b-skeleton>
	</div>

	<div v-else>

		<p class="m-b-20">
			Vas a cambiar el proveedor de este artículo
			<span v-if="old_provider_name">de <strong>{{ old_provider_name }}</strong> </span>
			a <strong>{{ new_provider_name }}</strong>.
			Elegí qué hacer con los descuentos de proveedor de este artículo:
		</p>

		<!-- Check 1: eliminar los descuentos tagueados del proveedor anterior. Solo aplica si el articulo ya tenia un proveedor -->
		<div
		v-if="old_provider_id"
		class="change-provider-option m-b-20">
			<b-form-checkbox
			v-model="eliminar_descuentos_proveedor_anterior">
				Eliminar descuentos de <strong>{{ old_provider_name }}</strong>
			</b-form-checkbox>
			<p class="text-muted m-l-25 m-b-0 m-t-5">
				<span v-if="descuentos_proveedor_anterior.length">
					Se eliminarían {{ descuentos_proveedor_anterior.length }} descuento(s): {{ descuentos_proveedor_anterior_text }}
				</span>
				<span v-else>
					Este artículo no tiene descuentos tagueados de {{ old_provider_name }}.
				</span>
			</p>
		</div>

		<!-- Check 2: crear los descuentos estandar (bonificaciones) del proveedor nuevo -->
		<div class="change-provider-option m-b-20">
			<b-form-checkbox
			v-model="crear_descuentos_proveedor_nuevo">
				Crear descuentos de <strong>{{ new_provider_name }}</strong>
			</b-form-checkbox>
			<p class="text-muted m-l-25 m-b-0 m-t-5">
				<span v-if="descuentos_estandar_proveedor_nuevo.length">
					Se crearían {{ descuentos_estandar_proveedor_nuevo.length }} descuento(s): {{ descuentos_estandar_proveedor_nuevo_text }}
				</span>
				<span v-else>
					{{ new_provider_name }} no tiene bonificaciones estándar cargadas.
				</span>
			</p>
		</div>

		<div class="text-right">
			<b-button
			variant="outline-secondary"
			class="m-r-10"
			@click="$bvModal.hide('change-provider-confirm')">
				Cancelar
			</b-button>
			<btn-loader
			variant="primary"
			:block="false"
			:loader="saving"
			@clicked="confirm"
			text="Confirmar cambio de proveedor"></btn-loader>
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
			// Datos del articulo/proveedores involucrados, recibidos por evento desde ModelForm.vue
			article_id: null,
			old_provider_id: null,
			old_provider_name: '',
			new_provider_id: null,
			new_provider_name: '',

			// Los dos flags independientes del prompt 308, ambos activados por defecto
			eliminar_descuentos_proveedor_anterior: true,
			crear_descuentos_proveedor_nuevo: true,

			// Preview de descuentos (GET article/change-provider/preview/{id}/{provider_id})
			loading_preview: false,
			descuentos_proveedor_anterior: [],
			descuentos_estandar_proveedor_nuevo: [],

			// Estado de guardado (PUT article/change-provider)
			saving: false,
		}
	},
	computed: {
		descuentos_proveedor_anterior_text() {
			return this.descuentos_proveedor_anterior.map(discount => this.discountText(discount)).join(', ')
		},
		descuentos_estandar_proveedor_nuevo_text() {
			return this.descuentos_estandar_proveedor_nuevo.map(discount => this.discountText(discount)).join(', ')
		},
	},
	created() {
		// El modal recibe sus datos por evento global, disparado desde ModelForm.vue justo
		// antes de mostrarlo (ver "confirmProviderChange" en ModelForm.vue)
		this.$root.$on('open-change-provider-modal', (payload) => {
			this.article_id = payload.article_id
			this.old_provider_id = payload.old_provider_id
			this.old_provider_name = payload.old_provider_name
			this.new_provider_id = payload.new_provider_id
			this.new_provider_name = payload.new_provider_name

			this.getPreview()
		})
	},
	methods: {
		// Arma un texto corto por descuento, ej: "10%" o "$500"
		discountText(discount) {
			if (discount.percentage) {
				return discount.percentage+'%'
			}
			if (discount.amount) {
				return this.price(discount.amount)
			}
			return ''
		},
		// Pide al backend que descuentos implica cada flag (sin modificar nada, es solo consulta)
		getPreview() {
			this.loading_preview = true
			this.$api.get('article/change-provider/preview/'+this.article_id+'/'+this.new_provider_id)
			.then(res => {
				this.loading_preview = false
				this.descuentos_proveedor_anterior = res.data.descuentos_proveedor_anterior
				this.descuentos_estandar_proveedor_nuevo = res.data.descuentos_estandar_proveedor_nuevo
			})
			.catch(err => {
				this.loading_preview = false
				console.log(err)
			})
		},
		// Confirma el cambio de proveedor enviando los dos flags independientes
		confirm() {
			this.saving = true
			this.$store.commit('auth/setMessage', 'Cambiando proveedor')
			this.$store.commit('auth/setLoading', true)
			this.$api.put('article/change-provider', {
				id: this.article_id,
				provider_id: this.new_provider_id,
				eliminar_descuentos_proveedor_anterior: this.eliminar_descuentos_proveedor_anterior,
				crear_descuentos_proveedor_nuevo: this.crear_descuentos_proveedor_nuevo,
			})
			.then(res => {
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// Actualiza el formulario abierto (state.article.model) y la fila del listado
				// (state.article.models), sin volver a abrir el modal de edicion del articulo
				this.setModel(res.data.model, 'article', [], false)
				this.$store.commit('article/add', res.data.model)

				this.$toast.success('Proveedor actualizado')
				this.$bvModal.hide('change-provider-confirm')
			})
			.catch(err => {
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
		// Al cerrar el modal (confirmado o cancelado), limpia el estado para la proxima apertura
		reset() {
			this.article_id = null
			this.old_provider_id = null
			this.old_provider_name = ''
			this.new_provider_id = null
			this.new_provider_name = ''
			this.eliminar_descuentos_proveedor_anterior = true
			this.crear_descuentos_proveedor_nuevo = true
			this.descuentos_proveedor_anterior = []
			this.descuentos_estandar_proveedor_nuevo = []
		},
	},
}
</script>
<style scoped lang="sass">
.change-provider-option
	padding: 10px
	border-radius: 8px
	background-color: rgba(0, 0, 0, 0.02)
</style>
