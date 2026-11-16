<template>
	<div class="orden-listas">
		<p class="orden-listas__ayuda">
			Arrastrá las listas o usá las flechas. Si el cliente no tiene una lista asignada, Vender usa la lista de arriba. El público ve la primera lista habilitada para el público.
		</p>
		<draggable
		v-model="orden"
		tag="ol"
		class="orden-listas__filas"
		handle=".orden-listas__manija"
		:disabled="disabled">
			<li
			v-for="(id, index) in orden"
			:key="id === null ? 'nueva' : id"
			:class="{ 'orden-listas__fila--actual': id === id_actual }"
			class="orden-listas__fila">
				<i class="bi bi-grip-vertical orden-listas__manija" aria-hidden="true"></i>
				<span class="orden-listas__nombre">{{ nombre(id) }}</span>
				<span v-if="id === id_actual" class="orden-listas__actual">Esta lista</span>
				<div class="orden-listas__botones">
					<b-button
					size="sm"
					variant="outline-secondary"
					:disabled="disabled || index === 0"
					:aria-label="'Subir ' + nombre(id)"
					@click="mover(index, -1)">
						<i class="bi bi-chevron-up" aria-hidden="true"></i>
					</b-button>
					<b-button
					size="sm"
					variant="outline-secondary"
					:disabled="disabled || index === orden.length - 1"
					:aria-label="'Bajar ' + nombre(id)"
					@click="mover(index, 1)">
						<i class="bi bi-chevron-down" aria-hidden="true"></i>
					</b-button>
				</div>
			</li>
		</draggable>
	</div>
</template>
<script>
import draggable from 'vuedraggable'

export default {
	components: { draggable },
	props: {
		model: { type: Object, required: true },
		disabled: Boolean,
	},
	computed: {
		id_actual() {
			return this.model.id ? Number(this.model.id) : null
		},
		listas() {
			return this.$store.getters['price_type/listas'].slice().sort((a, b) => {
				return (Number(b.position) || 0) - (Number(a.position) || 0) || b.id - a.id
			})
		},
		orden_guardado() {
			const ids = this.listas.map(lista => Number(lista.id))
			if (!ids.includes(this.id_actual)) ids.push(this.id_actual)
			return ids
		},
		orden: {
			get() {
				const borrador = this.model.orden_listas
				if (borrador && borrador.length === this.orden_guardado.length
					&& borrador.every(id => this.orden_guardado.includes(id))) {
					return borrador
				}
				return this.orden_guardado
			},
			set(ids) {
				if (ids.length === this.orden_guardado.length && ids.every((id, index) => id === this.orden_guardado[index])) {
					this.$delete(this.model, 'orden_listas')
					this.restaurar_posicion()
				} else {
					this.$set(this.model, 'orden_listas', ids)
					this.model.position = ids.length - ids.indexOf(this.id_actual)
				}
			},
		},
	},
	watch: {
		orden_guardado() {
			this.sincronizar_con_catalogo()
		},
		model() {
			this.sincronizar_con_catalogo()
		},
	},
	created() {
		this.sincronizar_con_catalogo()
	},
	methods: {
		posicion_al_final() {
			return Math.min(0, ...this.listas.map(lista => Number(lista.position) || 0)) - 1
		},
		restaurar_posicion() {
			if (this.id_actual === null) {
				this.model.position = this.posicion_al_final()
			} else {
				const lista = this.listas.find(lista => Number(lista.id) === this.id_actual)
				if (lista) this.model.position = lista.position
			}
		},
		sincronizar_con_catalogo() {
			if (this.model.orden_listas && this.orden === this.orden_guardado) {
				this.$delete(this.model, 'orden_listas')
				this.restaurar_posicion()
			} else if (this.id_actual === null && !this.model.orden_listas) {
				this.restaurar_posicion()
			}
		},
		nombre(id) {
			if (id === this.id_actual) return (this.model.name || '').trim() || 'Nueva lista'
			return this.listas.find(lista => Number(lista.id) === id).name
		},
		mover(index, desplazamiento) {
			const ids = this.orden.slice()
			const id = ids.splice(index, 1)[0]
			ids.splice(index + desplazamiento, 0, id)
			this.orden = ids
		},
	},
}
</script>
<style lang="sass" scoped>
.orden-listas__ayuda
	margin-bottom: 8px
	font-size: .875rem
	color: var(--color-text-secondary)

.orden-listas__filas
	display: grid
	gap: 6px
	list-style: none
	margin: 0
	padding: 0

.orden-listas__fila
	display: flex
	align-items: center
	gap: 8px
	min-width: 0
	padding: 6px 8px
	border: 1px solid var(--color-border-secondary)
	border-radius: 10px
	color: var(--color-text-primary)

	&--actual
		border-color: var(--color-primary)
		background: var(--bg-nav-hover)

.orden-listas__manija
	padding: 4px
	cursor: grab
	touch-action: none

.orden-listas__nombre
	flex: 1
	min-width: 0
	overflow-wrap: anywhere

.orden-listas__actual
	font-size: .75rem
	color: var(--color-text-secondary)

.orden-listas__botones
	display: flex
	gap: 4px

	.btn
		border-radius: 10px
</style>
