<template>
<view-component
show_filter_modal
emit_on_saved_instead_continue
@modelSaved="modelSaved"
model_name="employee"></view-component>	
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index')
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