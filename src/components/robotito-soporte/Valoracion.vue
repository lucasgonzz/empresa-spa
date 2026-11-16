<template>
	<b-modal
	id="robotito-valoracion"
	visible
	title="¿Qué te pareció el recorrido?"
	:no-close-on-backdrop="guardando"
	:no-close-on-esc="guardando"
	:hide-header-close="guardando"
	@hidden="$emit('cerrar')">
		<p>{{ titulo }}</p>
		<div class="robotito-valoracion__opciones" aria-label="Valoración del recorrido">
			<b-button
			:variant="liked === true ? 'primary' : 'outline-primary'"
			:aria-pressed="String(liked === true)"
			:disabled="guardando"
			@click="elegir(true)">
				<i class="bi bi-hand-thumbs-up" aria-hidden="true"></i> Me gustó
			</b-button>
			<b-button
			:variant="liked === false ? 'primary' : 'outline-primary'"
			:aria-pressed="String(liked === false)"
			:disabled="guardando"
			@click="elegir(false)">
				<i class="bi bi-hand-thumbs-down" aria-hidden="true"></i> No me gustó
			</b-button>
		</div>
		<template v-if="liked !== null">
			<b-form-group class="mt-3" label="¿Por qué? (opcional)">
				<b-form-checkbox-group v-model="motivos" stacked :options="opciones" :disabled="guardando"></b-form-checkbox-group>
			</b-form-group>
			<b-form-group label="Si querés, contanos un poco más" label-for="robotito-comentario">
				<b-form-textarea id="robotito-comentario" v-model="comentario" rows="2" maxlength="1000" :disabled="guardando"></b-form-textarea>
			</b-form-group>
		</template>
		<p v-if="error" class="text-danger mb-0" role="alert">{{ error }}</p>
		<template #modal-footer>
			<b-button variant="outline-secondary" :disabled="guardando" @click="$emit('cerrar')">Omitir</b-button>
			<b-button variant="primary" :disabled="liked === null || guardando" @click="guardar">{{ guardando ? 'Guardando…' : 'Enviar valoración' }}</b-button>
		</template>
	</b-modal>
</template>

<script>
const POSITIVOS = [
	{ value: 'claro', text: 'La explicación fue clara' },
	{ value: 'facil', text: 'Fue fácil seguir los pasos' },
	{ value: 'ritmo', text: 'El ritmo me resultó cómodo' },
	{ value: 'resolvio', text: 'Pude resolver mi consulta' },
]
const NEGATIVOS = [
	{ value: 'confuso', text: 'No se entendió la explicación' },
	{ value: 'lento', text: 'Fue muy lento' },
	{ value: 'rapido', text: 'Fue muy rápido' },
	{ value: 'rebuscado', text: 'Los pasos fueron rebuscados' },
	{ value: 'no_resolvio', text: 'No resolvió mi consulta' },
	{ value: 'problema_tecnico', text: 'Algo no funcionó en pantalla' },
]

export default {
	props: {
		titulo: { type: String, required: true },
		error: { type: String, default: '' },
		guardando: Boolean,
	},
	data() {
		return { liked: null, motivos: [], comentario: '' }
	},
	computed: {
		opciones() { return this.liked ? POSITIVOS : NEGATIVOS },
	},
	methods: {
		elegir(liked) {
			if (this.liked !== liked) this.motivos = []
			this.liked = liked
		},
		guardar() {
			this.$emit('guardar', { liked: this.liked, reasons: this.motivos.slice(), comment: this.comentario.trim() })
		},
	},
}
</script>

<style lang="sass" scoped>
.robotito-valoracion__opciones
	display: flex
	flex-wrap: wrap
	gap: .5rem
</style>

<style lang="sass">
// El chat de Soporte se mantiene abierto detrás de la valoración.
#robotito-valoracion___BV_modal_outer_
	z-index: 1055 !important
</style>
