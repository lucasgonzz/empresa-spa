
import __base_store from '@/store/__base_store'

/**
 * Store de los Diseños de Vender (mision diseno-vender-configurable, 28/9/2026).
 *
 * Se descarga al iniciar sesion (src/mixins/call_methods.js, via recursos-iniciales) porque Vender
 * lo necesita antes de dibujar su primera etapa. Lo lee mixins/vender/diseno_de_vender.js y lo
 * escribe la solapa del ABM (components/abm/disenos-de-vender/).
 */
export default __base_store({
	state: {
		model_name: 'vender_layout',
		/*
			🔴 Sin cartel global de error para este listado. Si el pedido falla (sin conexion, o una API
			todavia sin el endpoint: la SPA y la API de un cliente no se actualizan en el mismo
			instante), Vender no se rompe --cae al ultimo diseño guardado en este equipo o al
			predeterminado--, asi que un cartel rojo en cada carga no le dice nada util al vendedor.
			Se traduce a `skip_global_error_event` en __base_store::_getModels.
		*/
		omitir_cartel_de_conexion_en_listado: true,
	},
})
