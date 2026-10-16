/**
 * Objetivos de la conversación que el dueño le puede fijar al agente de WhatsApp (misión
 * objetivo-agente-whatsapp, 16/10/2026). Además de asesorar, el agente trata de llevar la charla
 * hacia el objetivo elegido, sin insistir y sin inventar datos.
 *
 * A diferencia de las plantillas de personalidad y habilidades (whatsapp_agent_templates.js), acá
 * no hay texto que se copie en un textarea: lo que se guarda es la CLAVE (columna
 * `whatsapp_bot_configs.agent_objective`) y el texto que lee el modelo lo arma empresa-api
 * (`AgentObjectivePromptBuilder`) con los datos reales del negocio.
 *
 * Contrato con la API:
 * - `none` NO viaja nunca: es solo la tarjeta "Sin objetivo" del picker. En la base es `null`, y
 *   el componente la traduce en los dos sentidos (null → 'none' para marcar la tarjeta, 'none' →
 *   null al guardar).
 * - El resto de las claves son exactamente los valores que acepta el `PUT whatsapp-bot/config`
 *   (`visit_branch`, `buy_online`, `order_by_whatsapp`, `custom`). Si se agrega una acá, se agrega
 *   también en la validación del backend; si no, el backend la rechaza.
 *
 * Campos de cada ítem:
 * - `key`, `name`, `description`, `icon_class`: lo que dibuja `AgentTemplatePicker` (variante card).
 * - `detail_label`, `detail_placeholder`: rótulo y ejemplo del textarea de indicaciones que aparece
 *   debajo del picker cuando hay un objetivo elegido. `none` no los lleva porque sin objetivo el
 *   textarea no se muestra.
 *
 * @type {Array<{key: string, name: string, description: string, icon_class: string, detail_label?: string, detail_placeholder?: string}>}
 */
export const WHATSAPP_AGENT_OBJECTIVES = [
	{
		key: 'none',
		name: 'Sin objetivo',
		description: 'Asesora y responde, como hasta ahora.',
		icon_class: 'bi bi-chat-dots',
	},
	{
		key: 'visit_branch',
		name: 'Que pase por el local',
		description: 'Lo invita a acercarse, con la dirección y el horario.',
		icon_class: 'bi bi-shop',
		detail_label: 'Indicaciones para este objetivo (opcional)',
		detail_placeholder: 'Por ejemplo: contale que tenemos estacionamiento y que los sábados abrimos hasta las 13.',
	},
	{
		key: 'buy_online',
		name: 'Que compre en la tienda online',
		description: 'Le pasa el link de tu tienda y de cada producto.',
		icon_class: 'bi bi-cart3',
		detail_label: 'Indicaciones para este objetivo (opcional)',
		detail_placeholder: 'Por ejemplo: recordale que en la tienda puede pagar con Mercado Pago.',
	},
	{
		key: 'order_by_whatsapp',
		name: 'Que haga el pedido por WhatsApp',
		description: 'Arma el pedido en el chat y lo deja para que lo confirmes.',
		icon_class: 'bi bi-whatsapp',
		detail_label: 'Indicaciones para este objetivo (opcional)',
		detail_placeholder: 'Por ejemplo: pedile también la dirección si quiere que se lo llevemos.',
	},
	{
		key: 'custom',
		name: 'Otro objetivo',
		description: 'Lo escribís vos, con tus palabras.',
		icon_class: 'bi bi-pencil-square',
		// En `custom` el detalle ES el objetivo: por eso el rótulo no dice "(opcional)". Igual no
		// se bloquea el guardado si queda vacío: el backend lo toma como "sin objetivo" y la
		// pantalla lo avisa en rojo.
		detail_label: '¿Qué tiene que lograr el agente?',
		detail_placeholder: 'Por ejemplo: que reserve el producto a su nombre hasta mañana a la tarde.',
	},
]
