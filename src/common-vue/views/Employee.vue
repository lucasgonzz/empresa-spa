<template>
<view-component
show_filter_modal
emit_on_saved_instead_continue
skip_global_error_event
@modelSaved="modelSaved"
model_name="employee">
	<template #table_left_options="props">
		<btn-duplicar-empleado :model="props.model"></btn-duplicar-empleado>
	</template>
</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnDuplicarEmpleado: () => import('@/common-vue/components/employee/BtnDuplicarEmpleado'),
	},
	created() {
		/*
			La lista de permisos ya no se descarga al iniciar sesion (mision 43, 12/8/2026): en
			todo empresa-spa se usa unicamente aca. models/employee.js la declara como
			`store: 'permission'`, y de ahi la leen las DOS pantallas de este modulo -- el
			formulario (common-vue/components/model/BelongsToManyCheckbox.vue) y la columna de
			permisos de la tabla del listado (display/table/Tr.vue y TableComponent.vue, que
			resuelven prop.store igual).

			Se pide solo si el store esta vacio, para no repetir la descarga cada vez que se entra
			al modulo (mismo patron que panel-control/proveedores/Index.vue).

			🔴 Esto NO es el can() del usuario logueado. Esos permisos viajan adentro del usuario
			cuando resuelve la sesion (common-vue/mixins/permissions.js lee this.user.permissions)
			y no tocan este store: tocar eso se lleva puesta la autorizacion de toda la app.
		*/
		if (!this.$store.state.permission.models.length) {
			this.$store.dispatch('permission/getModels')
		}
	},
	methods: {
		/*
			`skip_global_error_event` del template (mision empleados-alta-y-edicion, 9/10/2026): el
			alta y la edicion contestan 422 con `{message}` (documento repetido, nombre, documento o
			contraseña vacios, o de mas de 128). Ese texto ya lo muestra el aviso del propio modal
			(`setSaveErrorFromApi` del `catch` del guardado, que ademas deja el modal abierto con lo
			escrito); sin la bandera, el interceptor global de main.js suma un toast con el mismo
			texto encima.

			🔴 `emit_on_saved_instead_continue` y la rama `if (!model)` SE QUEDAN, aunque el API
			nuevo ya no conteste `{model: false}`: son la compatibilidad con un API viejo (4.3.8 o
			anterior), que ante un documento repetido en el alta todavia devuelve `{model: false}` con
			200. Esta SPA y el API no llegan a produccion al mismo tiempo en todos los clientes, asi
			que contra ese API el alta repetida sigue avisando con el toast (y el modal se cierra,
			como siempre). Con el API nuevo esa respuesta no llega nunca: es un 422 y lo resuelve el
			modal.
		*/
		modelSaved(model) {
			if (!model) {
				this.$toast.error('Ya hay un empleado con ese numero de documento')
			} else {
				this.$store.commit('employee/add', model)
			}
		}
	}
}
</script>