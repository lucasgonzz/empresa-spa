export default {
	// 🔴 Sin credenciales a proposito: la clave de Kapso, el secreto del webhook y el Phone Number ID
	// los carga ComercioCity y no llegan al navegador. Esta solapa no usa el ABM generico: monta
	// components/abm/integraciones/WhatsApp.vue (ver `componentes` en src/mixins/abm.js). El modelo
	// queda solo para el nombre de la solapa y el buscador de recursos del ABM.
	properties: [],
	abm_descripcion: {
		para_que_sirve: 'Muestra el estado de la conexión del bot de WhatsApp del negocio y permite prenderlo o apagarlo.',
		implicancias: 'Con el bot activo y la conexión configurada, atiende automáticamente los mensajes entrantes del número de WhatsApp del negocio. Con el bot apagado no entra ni sale ningún mensaje. Los datos técnicos de la conexión los carga el equipo de ComercioCity: no hace falta que los busques ni los copies.',
		como_se_utiliza: 'Entrá a ABM → Integraciones → WhatsApp. Si dice «Conexión configurada», usá el switch «Bot activo» y tocá Guardar. Si dice «Pendiente», la conexión todavía la tiene que dejar lista el equipo de ComercioCity.',
		palabras_clave: ['whatsapp', 'bot', 'kapso', 'atencion automatica', 'chatbot'],
	},
	singular_model_name_spanish: 'Configuración WhatsApp Bot',
	plural_model_name_spanish: 'WhatsApp Bot',
	create_model_name_spanish: 'Nueva configuración',
	text_delete: 'la',
}
