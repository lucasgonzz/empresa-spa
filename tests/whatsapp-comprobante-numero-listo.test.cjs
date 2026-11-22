// Envío automático del comprobante por WhatsApp (misión whatsapp-venta-numero-migrado): el switch
// «Enviar el comprobante automáticamente al guardar una venta» queda deshabilitado, apagado y con la
// explicación «Primero conectá tu número de WhatsApp» mientras la API diga que el número no está listo
// (`numero_listo_para_envios === false`). Con una API vieja (campo ausente) o sin config cargada todavía,
// la pantalla anda como siempre. Al guardar deshabilitado NO viaja `auto_send_sale_pdf`.
//
// Ejecutar con: node --test tests/whatsapp-comprobante-numero-listo.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { cargar } = require('./helpers/cargar_modulo_esm.cjs')

const RUTA = 'components/whatsapp/config/AgentConfig.vue'
const AgentConfig = cargar(RUTA, {
	'@/constants/whatsapp_agent_templates': { WHATSAPP_PERSONALITY_TEMPLATES: [], WHATSAPP_SKILL_TEMPLATES: [] },
	'@/constants/whatsapp_agent_objectives': { WHATSAPP_AGENT_OBJECTIVES: [] },
	'@/components/whatsapp/config/AgentTemplatePicker': {},
}).default

/**
 * Arma un `this` mínimo del componente con un modelo de config y el form dado.
 *
 * @param {object|null} config Modelo de config del store (o null si no hay).
 * @param {object} form Estado del formulario.
 * @returns {object}
 */
function contexto(config, form) {
	const self = { form: form, $store: { state: { whatsapp_bot_config: { models: config ? [config] : [] } } } }
	self.config = AgentConfig.computed.config.call(self)
	self.auto_send_disabled = AgentConfig.computed.auto_send_disabled.call(self)
	return self
}

test('deshabilita sólo si el modelo existe y numero_listo_para_envios es estrictamente false', () => {
	assert.equal(contexto({ numero_listo_para_envios: false }, {}).auto_send_disabled, true)
	assert.equal(contexto({ numero_listo_para_envios: true }, {}).auto_send_disabled, false)
	// API vieja: el campo no viene.
	assert.equal(contexto({ auto_send_sale_pdf: true }, {}).auto_send_disabled, false)
	// null / 0 no son "false estricto": no se deshabilita.
	assert.equal(contexto({ numero_listo_para_envios: null }, {}).auto_send_disabled, false)
	assert.equal(contexto({ numero_listo_para_envios: 0 }, {}).auto_send_disabled, false)
	// Sin modelo cargado todavía.
	assert.equal(contexto(null, {}).auto_send_disabled, false)
})

test('deshabilitado, el switch se muestra apagado aunque en la base esté en true; habilitado, refleja el form', () => {
	const bloqueado = contexto({ numero_listo_para_envios: false }, { auto_send_sale_pdf: true })
	const switch_computed = AgentConfig.computed.auto_send_switch_value
	assert.equal(switch_computed.get.call(bloqueado), false)
	// El form NO se pisa: el valor guardado sigue siendo true.
	assert.equal(bloqueado.form.auto_send_sale_pdf, true)

	const libre = contexto({ numero_listo_para_envios: true }, { auto_send_sale_pdf: true })
	assert.equal(switch_computed.get.call(libre), true)
	switch_computed.set.call(libre, false)
	assert.equal(libre.form.auto_send_sale_pdf, false)
})

test('al guardar deshabilitado no viaja auto_send_sale_pdf; habilitado sí', () => {
	const form = { agent_personality: 'x', auto_send_sale_pdf: true }
	const bloqueado = contexto({ numero_listo_para_envios: false }, form)
	const payload_bloqueado = AgentConfig.methods.build_payload.call(bloqueado)
	assert.equal(Object.prototype.hasOwnProperty.call(payload_bloqueado, 'auto_send_sale_pdf'), false)
	assert.equal(payload_bloqueado.agent_personality, 'x')
	// No muta el form.
	assert.equal(form.auto_send_sale_pdf, true)

	const libre = contexto({ numero_listo_para_envios: true }, form)
	assert.equal(AgentConfig.methods.build_payload.call(libre).auto_send_sale_pdf, true)
})

test('el template usa el switch calculado, :disabled y la explicación', () => {
	const fuente = fs.readFileSync(path.resolve(__dirname, '..', 'src', RUTA), 'utf8')
	assert.match(fuente, /v-model="auto_send_switch_value"/)
	assert.match(fuente, /:disabled="auto_send_disabled"/)
	assert.match(fuente, /Primero conectá tu número de WhatsApp/)
	assert.match(fuente, /Implementación de Agentes/)
	assert.match(fuente, /\$store\.dispatch\('whatsapp_bot_config\/updateAgentConfig', this\.build_payload\(\)\)/)
})
