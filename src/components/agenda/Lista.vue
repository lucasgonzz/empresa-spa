<template>
	<div class="agenda-lista">

		<div
		v-if="loading && !hay_tareas"
		class="agenda__cargando">
			<b-spinner small></b-spinner>
		</div>

		<div
		v-else-if="!hay_tareas"
		class="agenda__vacio"
		data-testid="agenda-lista-vacia">
			<i class="bi bi-check2-circle"></i>
			<p>No hay tareas pendientes en los próximos 60 días.</p>
			<b-button
			class="btn-modulo"
			variant="primary"
			@click="abrir_nueva_tarea(null)">
				<i class="bi bi-plus-lg m-r-5"></i>
				Nueva tarea
			</b-button>
		</div>

		<template v-else>
			<section
			v-for="grupo in grupos_con_tareas"
			:key="grupo.key"
			class="agenda-grupo"
			:class="'agenda-grupo--' + grupo.key"
			:data-testid="'agenda-grupo-' + grupo.key">
				<header class="agenda-grupo__cabecera">
					<h6 class="agenda-grupo__titulo">
						{{ grupo.titulo }}
					</h6>
					<span class="agenda-grupo__contador">
						{{ grupo.items.length }}
					</span>
				</header>
				<div class="agenda-grupo__filas">
					<fila-tarea
					v-for="ocurrencia in grupo.items"
					:key="ocurrencia.key"
					:ocurrencia="ocurrencia"
					@completar="marcar_hecha"
					@deshacer="deshacer_ocurrencia"
					@editar="abrir_edicion"></fila-tarea>
				</div>
				<p
				v-if="grupo.key == 'vencidas' && vencidas_omitidas > 0"
				class="agenda-grupo__nota">
					Hay {{ vencidas_omitidas }} vencidas más antiguas que no se muestran: al completar o editar la tarea van apareciendo.
				</p>
			</section>
		</template>

	</div>
</template>
<script>
/*
	Vista "Lista": las ocurrencias pendientes agrupadas por urgencia. Vencidas / Hoy / Esta semana
	(hasta el domingo) / Proximas (el resto del rango de 60 dias). Los grupos vacios no se dibujan.

	Las ocurrencias ya hechas NO aparecen aca: la lista es lo que falta hacer, y lo hecho vive en
	"Realizadas" (y tachado en el calendario). Un clic accidental se revierte desde la barra
	"Hecha - Deshacer" que aparece unos segundos.
*/
import acciones_agenda from '@/components/agenda/acciones_agenda'
import { domingo_de_la_semana } from '@/components/agenda/fechas_agenda'

export default {
	mixins: [acciones_agenda],
	components: {
		FilaTarea: () => import('@/components/agenda/FilaTarea'),
	},
	computed: {
		loading() {
			return this.$store.state.agenda.loading
		},
		hoy() {
			return this.$store.state.agenda.hoy
		},
		vencidas() {
			return this.$store.state.agenda.vencidas
		},
		pendientes() {
			return this.$store.state.agenda.ocurrencias.filter(o => !o.completado)
		},
		/**
		 * Los cuatro grupos, siempre en este orden. Se comparan fechas como texto: la API manda
		 * YYYY-MM-DD y en ese formato el orden lexicografico es el cronologico.
		 *
		 * @returns {Array}
		 */
		grupos() {
			let hoy = this.hoy
			let domingo = domingo_de_la_semana(hoy)
			return [
				{
					key: 'vencidas',
					titulo: 'Vencidas',
					items: this.vencidas,
				},
				{
					key: 'hoy',
					titulo: 'Hoy',
					items: this.pendientes.filter(o => o.fecha == hoy),
				},
				{
					key: 'semana',
					titulo: 'Esta semana',
					items: this.pendientes.filter(o => o.fecha > hoy && o.fecha <= domingo),
				},
				{
					key: 'proximas',
					titulo: 'Próximas',
					items: this.pendientes.filter(o => o.fecha > domingo),
				},
			]
		},
		grupos_con_tareas() {
			return this.grupos.filter(grupo => grupo.items.length > 0)
		},
		hay_tareas() {
			return this.grupos_con_tareas.length > 0
		},
		/**
		 * La API guarda como mucho 30 vencidas por tarea y avisa cuantas dejo afuera en cada
		 * ocurrencia (`vencidas_omitidas`, el mismo numero repetido en todas las de esa tarea).
		 * Se suma una vez por tarea.
		 *
		 * @returns {Number}
		 */
		vencidas_omitidas() {
			let por_tarea = {}
			this.vencidas.forEach(o => {
				por_tarea[o.pending_id] = Number(o.vencidas_omitidas) || 0
			})
			return Object.keys(por_tarea).reduce((total, id) => total + por_tarea[id], 0)
		},
	},
}
</script>
