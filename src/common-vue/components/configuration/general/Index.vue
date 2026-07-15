<template>
<b-card
header="Datos del usuario"
class="m-t-15 m-b-15 s-1"
v-if="view == 'general'">
	<model-form
	input_full_width
	:show_btn_delete="false"
	:model="user"
	:properties="modelPropertiesFromName('user')"
	@modelSaved="modelSaved"
	model_name="user">
		<template #sale_factura_print_option>
			<b-form-select
			size="sm"
			v-model="user.sale_factura_print_option"
			:options="factura_print_options"></b-form-select>
		</template>
	</model-form>
</b-card>
</template>
<script>
import ModelForm from '@/common-vue/components/model/ModelForm'
import { build_vender_facturado_print_select_options } from '@/constants/vender_print_shortcut_options'

export default {
	components: {
		ModelForm,
	},
	created() {
		/**
		 * Los perfiles de PDF A4 fiscales pueden no estar cargados todavía si el
		 * dueño entra a Configuración sin haber pasado antes por Vender.
		 */
		if (!this.$store.state.pdf_column_profile.models.length) {
			this.$store.dispatch('pdf_column_profile/getModels')
		}
	},
	computed: {
		/**
		 * Opciones del selector de PDF por defecto de factura: ticket común,
		 * ticket 2.0 y un ítem por cada perfil A4 fiscal (model_name 'sale').
		 * Reutiliza exactamente la misma función que arma el select del atajo
		 * de impresión de Vender, para que ambos hablen el mismo vocabulario.
		 *
		 * @returns {Array<{value: string, text: string}>}
		 */
		factura_print_options() {
			const profiles = this.$store.state.pdf_column_profile.models || []
			return build_vender_facturado_print_select_options(profiles)
		},
	},
	methods: {
		modelSaved() {
			console.log('Volviendo a cargar AUTH')
        	this.$store.dispatch('auth/me')
		}
	}
}
</script>
