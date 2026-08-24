import __base_store from '@/store/__base_store'

/**
 * Store de corridas del motor de ofertas personalizadas por cliente
 * (extension 'motor_de_ofertas'). Molde de purchase_suggestion.js: el listado
 * de corridas es un CRUD comun contra GET api/offer-suggestion, asi que sale
 * entero del factory base.
 *
 * Las LINEAS de cada corrida y las ofertas ya activadas no viven aca: van en
 * offer_suggestion_line.js, que necesita paginacion server-side con token de
 * peticion y no entra en el molde base.
 */
export default __base_store({
	state: {
		model_name: 'offer_suggestion',
	},
})
