
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
	},
})
