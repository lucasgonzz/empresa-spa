<template>
	<section class="vinculacion-maestra" aria-labelledby="titulo-vinculacion-maestra">
		<h2 id="titulo-vinculacion-maestra">Vinculá este navegador</h2>
		<template v-if="vinculado">
			<p role="status">
				Navegador vinculado. En Documento escribí <strong>login</strong>, completá Contraseña con
				cualquier valor y abrí <strong>Agentes → Asistente personal</strong>.
			</p>
		</template>
		<template v-else>
			<p v-if="!codigo && !no_disponible">
				Generá un código para solicitar acceso al Asistente personal desde este navegador.
			</p>
			<div v-if="codigo">
				<p>Pasale este código a quien está verificando tu acceso y dejá abierta esta pestaña.</p>
				<code class="vinculacion-maestra__codigo">{{ codigo }}</code>
			</div>
			<p v-if="aviso" role="status">{{ aviso }}</p>
			<button
				v-if="!no_disponible"
				type="button"
				class="btn btn-outline-primary"
				:disabled="ocupado"
				@click="codigo ? canjear() : solicitar()"
			>
				{{ ocupado ? 'Esperá…' : (codigo ? 'Ya aprobaron mi acceso' : 'Generar código') }}
			</button>
		</template>
	</section>
</template>

<script>
const RUTA_VINCULACION = '/asistente-maestro/vinculacion'
const OPCIONES = { skip_global_error_event: true, skip_global_validation_toast: true }

export default {
	data() {
		return {
			codigo: '',
			ocupado: false,
			aviso: '',
			vinculado: false,
			no_disponible: false,
		}
	},
	methods: {
		solicitar() {
			this.ocupado = true
			this.aviso = ''
			return this.$axios.get('/sanctum/csrf-cookie', OPCIONES)
				.then(() => this.$axios.post(RUTA_VINCULACION, {}, OPCIONES))
				.then(({ data }) => {
					if (!data || typeof data.codigo !== 'string' || !data.codigo) {
						this.aviso = 'El servidor no devolvió un código. Volvé a intentar.'
						return
					}
					this.codigo = data.codigo
				})
				.catch(error => this.mostrar_error(error))
				.finally(() => { this.ocupado = false })
		},
		canjear() {
			this.ocupado = true
			this.aviso = ''
			return this.$axios.post(RUTA_VINCULACION + '/canjear', {}, OPCIONES)
				.then(({ data }) => {
					if (!data || data.vinculado !== true) {
						this.aviso = 'No pudimos confirmar el vínculo. Volvé a intentar.'
						return
					}
					this.vinculado = true
					this.codigo = ''
				})
				.catch(error => this.mostrar_error(error))
				.finally(() => { this.ocupado = false })
		},
		mostrar_error(error) {
			const estado = error.response && error.response.status
			switch (estado) {
			case 404:
				this.codigo = ''
				this.no_disponible = true
				this.aviso = 'La vinculación de navegadores todavía no está disponible en este sistema.'
				break
			case 409:
				this.aviso = 'Todavía falta aprobar el acceso. Volvé a intentar cuando te confirmen.'
				break
			case 410:
			case 419:
				this.codigo = ''
				this.aviso = 'El código ya venció. Generá uno nuevo.'
				break
			case 429:
				this.aviso = 'Hubo demasiados intentos. Esperá un momento y volvé a intentar.'
				break
			default:
				this.aviso = 'No pudimos completar la vinculación. Volvé a intentar.'
			}
		},
	},
}
</script>

<style lang="sass" scoped>
.vinculacion-maestra
	border: 1px solid #cbd5e1
	border-radius: 0.75rem
	padding: 1rem
	margin-bottom: 1.25rem
	color: #1f2937
	font-size: 0.95rem
	h2
		font-size: 1.125rem
		margin: 0 0 0.5rem
	p
		margin: 0 0 0.625rem
	&__codigo
		display: block
		margin-bottom: 0.75rem
		font-size: 1.125rem
		font-weight: 700
		letter-spacing: 0.075em
		overflow-wrap: anywhere
</style>
