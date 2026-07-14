<template>
	<div>
		<model
		model_name="user"
		:model_prop="user"
		:show_btn_delete="false"></model>

		<div
		v-if="has_extra_config">
			<model
			v-for="config_model_name in extra_config"
			:key="'extra-config-'+config_model_name"
			:model_name="config_model_name"
			:show_btn_delete="false">
				<!--
					Boton "Enviar correo de prueba" del correo propio (prompt 359).
					Se muestra debajo del formulario declarativo generico solo para
					online_configuration, sin forzar el renderer generico de properties
					a soportar un boton especifico de este modelo.
				-->
				<template
				v-if="config_model_name == 'online_configuration'"
				v-slot:default="slot_props">
					<test-mail-button
					v-if="slot_props.model && slot_props.model.id"></test-mail-button>
				</template>
			</model>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		Model: () => import('@/common-vue/components/model/Index'),
		TestMailButton: () => import('@/components/online/config/TestMailButton'),
	}
}
</script>