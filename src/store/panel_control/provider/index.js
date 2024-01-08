import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import total_vendido_y_rentabilidad from '@/store/panel_control/provider/total_vendido_y_rentabilidad'
import rentabilidad from '@/store/panel_control/provider/rentabilidad'
import acreedores from '@/store/panel_control/provider/acreedores'

// Rendimiento por proveedor
import articulos_vendidos from '@/store/panel_control/provider/articulos_vendidos'
export default {
	namespaced: true,
	modules: {
		total_vendido_y_rentabilidad,
		rentabilidad,
		acreedores,
		articulos_vendidos,
	}
}
