<template>
	<div class="btm-checkbox">

		<!--
			Buscador de la lista (mision empleados-duplicar-y-permisos, 29/9/2026). Es la misma pastilla
			que el buscador del ABM (abm-search/Index.vue) para que se lea como el mismo buscador,
			pero con una diferencia de fondo: aca no navega a ningun lado, filtra la lista y deja
			tildar ahi mismo. Se activa con `belongs_to_many.searchable` del modelo; sin esa opcion
			la lista se comporta como siempre.
		-->
		<div
		v-if="prop.belongs_to_many.searchable"
		class="btm-checkbox__buscador">
			<div class="btm-checkbox__campo">
				<i
				class="bi bi-search btm-checkbox__lupa"
				aria-hidden="true"></i>
				<b-form-input
				class="btm-checkbox__input"
				v-model="query"
				autocomplete="off"
				:placeholder="prop.belongs_to_many.search_placeholder || 'Buscar... Ej: caja, descuentos, precios'"
				@keydown.esc="query = ''"
				@keydown.enter.prevent></b-form-input>
				<button
				v-if="query"
				type="button"
				class="btm-checkbox__limpiar"
				aria-label="Borrar la búsqueda"
				@click="query = ''">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>
		</div>

		<div
		v-if="prop.belongs_to_many.searchable"
		class="btm-checkbox__resumen">
			<span>
				<strong>{{ ids_marcados.length }}</strong>
				de {{ todos.length }} marcados
			</span>
			<span
			v-if="!buscando && grupos.length > 1"
			class="btm-checkbox__acciones">
				<a
				href="#"
				@click.prevent="abrir_todos(true)">Abrir todos</a>
				<a
				href="#"
				@click.prevent="abrir_todos(false)">Cerrar todos</a>
			</span>
			<span
			v-if="buscando && resultados.length"
			class="btm-checkbox__acciones">
				<a
				href="#"
				@click.prevent="marcar_lista(resultados, true)">Marcar los {{ resultados.length }}</a>
				<a
				href="#"
				@click.prevent="marcar_lista(resultados, false)">Quitar los {{ resultados.length }}</a>
			</span>
		</div>

		<!-- Con una busqueda escrita: lista plana de resultados, cada uno con su grupo -->
		<div
		v-if="buscando">
			<div
			v-for="permiso in resultados"
			:key="'resultado-' + permiso.id"
			class="btm-checkbox__resultado">
				<b-form-checkbox
				:id="'checkbox-' + permiso.id"
				:checked="esta_marcado(permiso.id)"
				@change="cambiar(permiso, $event)">
					{{ permiso.name }}
				</b-form-checkbox>
				<span
				v-if="grupo_de(permiso)"
				class="btm-checkbox__grupo-tag">{{ capitalize(grupo_de(permiso)) }}</span>
			</div>
			<div
			v-if="!resultados.length"
			class="btm-checkbox__vacio">
				No hay permisos que coincidan con "{{ query }}"
			</div>
		</div>

		<!-- Sin busqueda: agrupada por modulo, con cada grupo plegable -->
		<div
		v-else-if="prop.belongs_to_many.order_by">
			<div
			v-for="grupo in grupos"
			:key="'grupo-' + grupo.nombre"
			class="btm-checkbox__grupo">
				<div
				class="btm-checkbox__grupo-encabezado"
				role="button"
				tabindex="0"
				:aria-expanded="esta_abierto(grupo.nombre) ? 'true' : 'false'"
				@click="alternar(grupo.nombre)"
				@keydown.enter.prevent="alternar(grupo.nombre)"
				@keydown.space.prevent="alternar(grupo.nombre)">
					<span class="btm-checkbox__grupo-titulo">
						<i
						class="bi btm-checkbox__caret"
						:class="esta_abierto(grupo.nombre) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
						{{ capitalize(grupo.nombre) }}
					</span>
					<span class="btm-checkbox__grupo-derecha">
						<span
						class="btm-checkbox__contador"
						:class="{ 'btm-checkbox__contador--con-marcados': marcados_del_grupo(grupo) }">
							{{ marcados_del_grupo(grupo) }}/{{ grupo.permisos.length }}
						</span>
						<a
						href="#"
						class="btm-checkbox__todos"
						@click.stop.prevent="marcar_lista(grupo.permisos, marcados_del_grupo(grupo) < grupo.permisos.length)">
							{{ marcados_del_grupo(grupo) < grupo.permisos.length ? 'Todos' : 'Ninguno' }}
						</a>
					</span>
				</div>
				<div
				v-show="esta_abierto(grupo.nombre)"
				class="btm-checkbox__grupo-cuerpo">
					<b-form-checkbox
					v-for="permiso in grupo.permisos"
					:key="permiso.id"
					:id="'checkbox-' + permiso.id"
					:checked="esta_marcado(permiso.id)"
					@change="cambiar(permiso, $event)">
						{{ permiso.name }}
					</b-form-checkbox>
				</div>
			</div>
		</div>

		<div
		v-else>
			<b-form-checkbox
			v-for="permiso in todos"
			:key="permiso.id"
			:id="'checkbox-' + permiso.id"
			:checked="esta_marcado(permiso.id)"
			@change="cambiar(permiso, $event)">
				{{ permiso.name }}
			</b-form-checkbox>
		</div>
	</div>
</template>
<script>
/**
 * Lista de checkboxes de una relacion belongs_to_many (hoy la usa solo el formulario de
 * empleados, para los permisos).
 *
 * La fuente de verdad de lo marcado es `model[prop.key]` (el array de objetos que despues viaja al
 * API), no un estado local: asi tildar desde un grupo, desde el buscador o con "Todos" termina en
 * el mismo lugar y las tres vistas nunca se desincronizan.
 *
 * Opciones de `prop.belongs_to_many`:
 *  - order_by: nombre de la propiedad por la que se agrupa (en permisos, `model_name`).
 *  - searchable: muestra el buscador y el resumen de marcados.
 *  - search_placeholder: texto del buscador (opcional).
 */
export default {
	props: {
		model: Object,
		prop: Object,
	},
	data() {
		return {
			query: '',
			// nombre del grupo => true/false. Lo que no esta, se decide en esta_abierto().
			abiertos: {},
			// Los grupos con algo marcado arrancan abiertos: al editar se ve de una que tiene tildado.
			abiertos_iniciales_listos: false,
		}
	},
	computed: {
		todos() {
			return this.modelsStoreFromName(this.prop.store)
		},
		ids_marcados() {
			let lista = this.model[this.prop.key]
			return lista ? lista.map(item => item.id) : []
		},
		buscando() {
			return !!this.prop.belongs_to_many.searchable && this.normalizar(this.query).length >= 2
		},
		/**
		 * Grupos en el orden en que aparecen en la lista que manda el API. El orden lo decide el
		 * API (PermissionController), no esta pantalla.
		 */
		grupos() {
			let grupos = []
			let por_nombre = {}
			let order_by = this.prop.belongs_to_many.order_by
			if (!order_by) {
				return grupos
			}
			this.todos.forEach(item => {
				let nombre = item[order_by]
				if (!por_nombre[nombre]) {
					por_nombre[nombre] = { nombre: nombre, permisos: [] }
					grupos.push(por_nombre[nombre])
				}
				por_nombre[nombre].permisos.push(item)
			})
			return grupos
		},
		/**
		 * Todas las palabras de la busqueda tienen que estar (en cualquier orden) en el nombre, el
		 * grupo, el slug o las palabras clave del permiso: "descuento vender" encuentra "Aplicar
		 * descuentos ... en Vender" y "plata" encuentra las cajas aunque el nombre no la diga.
		 *
		 * Cada palabra tiene que EMPEZAR una palabra del texto (no alcanza con estar en el medio): asi
		 * "arca" no trae "marcas" ni "cuenta" trae "descuenta stock". Primero van los que matchean
		 * en el nombre.
		 */
		resultados() {
			if (!this.buscando) {
				return []
			}
			let palabras = this.normalizar(this.query).split(' ').filter(palabra => palabra)
			let en_nombre = []
			let en_otro_lado = []
			this.todos.forEach(item => {
				let nombre = ' ' + this.normalizar(item.name)
				let resto = nombre + ' ' + this.normalizar(this.grupo_de(item)) + ' ' + this.normalizar(item.slug) + ' ' + this.normalizar(item.palabras_clave)
				let coincide_todo = palabras.every(palabra => resto.includes(' ' + palabra))
				if (!coincide_todo) {
					return
				}
				if (palabras.every(palabra => nombre.includes(' ' + palabra))) {
					en_nombre.push(item)
				} else {
					en_otro_lado.push(item)
				}
			})
			return en_nombre.concat(en_otro_lado)
		},
	},
	watch: {
		// La lista de permisos puede llegar despues de que se arma el formulario (Employee.vue la
		// pide al entrar si el store esta vacio), y al pasar a editar otro empleado el formulario
		// reusa este componente: en los dos casos hay que decidir de nuevo que grupos arrancan abiertos.
		grupos() {
			if (!this.abiertos_iniciales_listos) {
				this.set_abiertos_iniciales()
			}
		},
		model() {
			this.abiertos_iniciales_listos = false
			this.set_abiertos_iniciales()
		},
	},
	created() {
		this.set_abiertos_iniciales()
	},
	methods: {
		/**
		 * Minusculas, sin tildes y con los separadores del slug ("caja.reports", "alerts_orders")
		 * pasados a espacios, para comparar de forma tolerante.
		 */
		normalizar(texto) {
			if (!texto) {
				return ''
			}
			return ('' + texto).toLowerCase()
				.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
				.replace(/[._-]+/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
		},
		grupo_de(permiso) {
			let order_by = this.prop.belongs_to_many.order_by
			return order_by ? permiso[order_by] : ''
		},
		esta_marcado(id) {
			return this.ids_marcados.indexOf(id) != -1
		},
		marcados_del_grupo(grupo) {
			return grupo.permisos.filter(permiso => this.esta_marcado(permiso.id)).length
		},
		/**
		 * Tilda o destilda un permiso. Es idempotente (mira si ya esta), asi "Todos" y el
		 * checkbox individual pueden convivir sin invertirse.
		 */
		cambiar(permiso, marcado) {
			let lista = this.model[this.prop.key]
			let index = lista.findIndex(item => item.id == permiso.id)
			if (marcado && index == -1) {
				lista.push(permiso)
			} else if (!marcado && index != -1) {
				lista.splice(index, 1)
			}
		},
		marcar_lista(permisos, marcado) {
			permisos.forEach(permiso => this.cambiar(permiso, marcado))
		},
		esta_abierto(nombre) {
			return !!this.abiertos[nombre]
		},
		alternar(nombre) {
			this.$set(this.abiertos, nombre, !this.abiertos[nombre])
		},
		abrir_todos(abrir) {
			this.grupos.forEach(grupo => this.$set(this.abiertos, grupo.nombre, abrir))
		},
		set_abiertos_iniciales() {
			if (!this.grupos.length) {
				return
			}
			this.abiertos_iniciales_listos = true
			this.grupos.forEach(grupo => {
				this.$set(this.abiertos, grupo.nombre, this.marcados_del_grupo(grupo) > 0)
			})
		},
	},
}
</script>
<style lang="sass" scoped>
.btm-checkbox
	// Fijo arriba del scroll del modal: la lista completa es larga y sin esto el buscador se pierde
	// apenas se baja a mirar un grupo.
	.btm-checkbox__buscador
		position: sticky
		// -1rem = el padding del `.modal-body`: sin eso quedaba una franja donde se veian las filas
		// de la lista pasando por arriba del buscador.
		top: -1rem
		z-index: 3
		margin-bottom: 10px
		padding: calc(1rem + 6px) 2px 8px 2px
		background: var(--bg-card, #fff)

	// El campo es el que lleva `position: relative`: la lupa y la X se centran contra el input y no
	// contra el padding del contenedor fijo (que las subia unos 7px).
	.btm-checkbox__campo
		position: relative

	// Misma pastilla que abm-search: lupa decorativa a la izquierda, filtra mientras se escribe.
	.btm-checkbox__lupa
		position: absolute
		left: 14px
		top: 50%
		transform: translateY(-50%)
		font-size: 0.95rem
		line-height: 1
		color: var(--color-text-secondary, #9aa0a6)
		pointer-events: none

	.btm-checkbox__input
		width: 100%
		height: 40px
		border: 1px solid var(--color-border, #e2e4e7)
		border-radius: 22px
		padding: 0 38px 0 38px
		font-size: 0.9rem
		color: var(--color-text-primary, #1d1d1f)
		background: var(--bg-section, #fff)
		box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px

		&:focus
			outline: none
			box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 0, 0, 0.04)

		&::placeholder
			color: var(--color-text-secondary, #9aa0a6)

	.btm-checkbox__limpiar
		position: absolute
		right: 10px
		top: 50%
		transform: translateY(-50%)
		width: 26px
		height: 26px
		border: none
		border-radius: 50%
		background: transparent
		color: var(--color-text-secondary, #9aa0a6)
		font-size: 0.8rem
		line-height: 1
		cursor: pointer

		&:hover
			background: var(--bg-hover, #f5f6f7)

	.btm-checkbox__resumen
		display: flex
		justify-content: space-between
		align-items: center
		flex-wrap: wrap
		gap: 6px 14px
		margin-bottom: 8px
		font-size: 0.85rem
		color: var(--color-text-secondary, #6e6e73)

	.btm-checkbox__acciones a
		margin-left: 12px
		font-size: 0.85rem

	.btm-checkbox__resultado
		display: flex
		justify-content: space-between
		align-items: baseline
		gap: 10px
		padding: 8px 4px
		border-bottom: 1px solid var(--color-border-secondary, #f2f2f2)

		&:last-child
			border-bottom: none

	.btm-checkbox__grupo-tag
		flex-shrink: 0
		font-size: 11px
		color: var(--color-text-secondary, #86868b)
		white-space: nowrap

	.btm-checkbox__vacio
		padding: 14px
		font-size: 0.9rem
		text-align: center
		color: var(--color-text-secondary, #86868b)

	.btm-checkbox__grupo
		border: 1px solid var(--color-border, #e2e4e7)
		border-radius: 10px
		margin-bottom: 8px
		overflow: hidden

	.btm-checkbox__grupo-encabezado
		display: flex
		justify-content: space-between
		align-items: center
		gap: 10px
		padding: 10px 12px
		cursor: pointer
		user-select: none
		background: var(--bg-hover, #f5f6f7)

		&:focus
			outline: 2px solid var(--color-border, #c7cacf)
			outline-offset: -2px

	.btm-checkbox__grupo-titulo
		font-weight: 600
		font-size: 0.95rem

	.btm-checkbox__caret
		display: inline-block
		width: 16px
		font-size: 0.8rem

	.btm-checkbox__grupo-derecha
		display: flex
		align-items: center
		gap: 12px
		flex-shrink: 0

	.btm-checkbox__contador
		font-size: 0.8rem
		color: var(--color-text-secondary, #86868b)

	.btm-checkbox__contador--con-marcados
		font-weight: 600
		color: var(--color-text-primary, #1d1d1f)

	.btm-checkbox__todos
		font-size: 0.8rem

	.btm-checkbox__grupo-cuerpo
		padding: 8px 14px 10px 14px
		display: grid
		grid-template-columns: 1fr
		gap: 6px 20px

		@media screen and (min-width: 768px)
			grid-template-columns: 1fr 1fr
</style>
