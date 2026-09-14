<template>
	<div class="escritorio">

		<template v-if="cargados">

			<!-- Estado vacío: sin informes, API sin el módulo, empleado, o una falla. -->
			<div
			v-if="!hay_reportes"
			class="escritorio__vacio">
				<span
				class="escritorio__vacio-icono"
				aria-hidden="true">
					<i :class="'bi bi-' + icono_vacio"></i>
				</span>
				<p class="escritorio__vacio-texto">{{ texto_vacio }}</p>
				<b-button
				v-if="motivo_vacio == 'error'"
				variant="outline-primary"
				size="sm"
				@click="recargar">
					<i class="bi bi-arrow-clockwise m-r-5"></i>
					Volver a intentar
				</b-button>
			</div>

			<template v-else>
				<!-- Los últimos: el informe más nuevo de cada tipo, una carpeta grande cada uno. -->
				<div class="escritorio__grilla">
					<carpeta
					v-for="reporte in ultimos"
					:key="reporte.id"
					:reporte="reporte"
					@abrir="abrir"></carpeta>
				</div>

				<!-- Los anteriores (últimos 30 días), como carpetas chicas agrupadas por fecha. -->
				<section
				v-if="anteriores.length"
				class="escritorio__anteriores">
					<h2 class="escritorio__subtitulo">Anteriores</h2>
					<div
					v-for="grupo in anteriores_por_fecha"
					:key="grupo.fecha"
					class="escritorio__grupo">
						<p class="escritorio__grupo-fecha">{{ grupo.fecha_en_letras }}</p>
						<div class="escritorio__grilla escritorio__grilla--chica">
							<carpeta
							v-for="reporte in grupo.reportes"
							:key="reporte.id"
							:reporte="reporte"
							chica
							@abrir="abrir"></carpeta>
						</div>
					</div>
				</section>
			</template>

		</template>

	</div>
</template>

<script>
import moment from 'moment'
import Carpeta from '@/components/ia/Carpeta'

/**
 * El escritorio del mostrador: pide la lista al montar (cada entrada al módulo la
 * refresca) y dibuja las carpetas. El indicador de carga es el global del sistema
 * (lo prende y apaga la acción del store); mientras tanto acá no se dibuja nada,
 * y recién con la respuesta se decide entre las carpetas y el estado vacío.
 */
export default {
	components: {
		Carpeta,
	},
	computed: {
		ultimos() {
			return this.$store.state.mostrador.ultimos
		},
		anteriores() {
			return this.$store.state.mostrador.anteriores
		},
		cargados() {
			return this.$store.state.mostrador.reportes_cargados
		},
		hay_reportes() {
			return this.$store.getters['mostrador/hay_reportes']
		},
		motivo_vacio() {
			return this.$store.state.mostrador.motivo_vacio
		},
		/**
		 * Un 404 (API sin el módulo todavía) se lee igual que "sin informes": para el
		 * dueño la diferencia no existe (plan §4).
		 */
		texto_vacio() {
			if (this.motivo_vacio == 'solo_dueno') {
				return 'El mostrador es solo para el dueño del negocio.'
			}
			if (this.motivo_vacio == 'error') {
				return 'No pudimos traer tus informes. Probá de nuevo en un momento.'
			}
			return 'Todavía no hay informes. Tu asistente los deja acá cada mañana.'
		},
		icono_vacio() {
			if (this.motivo_vacio == 'solo_dueno') {
				return 'person-lock'
			}
			if (this.motivo_vacio == 'error') {
				return 'cloud-slash'
			}
			return 'folder2-open'
		},
		/**
		 * Los anteriores vienen ordenados por fecha desc y tipo; acá solo se agrupan
		 * por fecha para ponerles un título en letras a cada tanda.
		 */
		anteriores_por_fecha() {
			let grupos = []
			this.anteriores.forEach(reporte => {
				let grupo = grupos.find(g => g.fecha == reporte.fecha)
				if (!grupo) {
					grupo = {
						fecha: reporte.fecha,
						fecha_en_letras: moment(reporte.fecha, 'YYYY-MM-DD').format('dddd D [de] MMMM'),
						reportes: [],
					}
					grupos.push(grupo)
				}
				grupo.reportes.push(reporte)
			})
			return grupos
		},
	},
	created() {
		this.$store.dispatch('mostrador/getReportes')
	},
	methods: {
		abrir(reporte) {
			this.$emit('abrir', reporte)
		},
		recargar() {
			this.$store.dispatch('mostrador/getReportes')
		},
	},
}
</script>

<style lang="sass">
// Superficie del escritorio: gris cálido muy claro en modo claro; en oscuro no se
// pinta nada propio y queda el fondo del sistema, que ya es la superficie.
.escritorio
	background: #F4F5F7
	border-radius: 20px
	padding: 22px

	// Cuatro carpetas en fila en escritorio; dos en tablet; una en teléfono (§2.4).
	&__grilla
		display: grid
		grid-template-columns: repeat(4, minmax(0, 1fr))
		gap: 18px

		&--chica
			grid-template-columns: repeat(auto-fill, minmax(230px, 1fr))
			gap: 10px

	&__anteriores
		margin-top: 34px

	&__subtitulo
		font-size: 1.05rem
		font-weight: 600
		margin: 0 0 12px 0
		color: var(--color-text-primary, #212529)

	&__grupo
		margin-bottom: 18px

	&__grupo-fecha
		margin: 0 0 8px 0
		font-size: .82rem
		color: var(--color-text-secondary, #6c757d)

		&::first-letter
			text-transform: uppercase

	&__vacio
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 56px 20px
		gap: 14px

	&__vacio-icono
		width: 56px
		height: 56px
		border-radius: 50%
		background: var(--bg-card, #fff)
		box-shadow: 0 2px 8px var(--shadow-color, rgba(99, 99, 99, .2))
		display: flex
		align-items: center
		justify-content: center
		font-size: 24px
		color: var(--color-text-secondary, #6c757d)

	&__vacio-texto
		margin: 0
		max-width: 420px
		color: var(--color-text-secondary, #6c757d)

html.dark-mode .escritorio
	background: var(--bg-section, #272b31)

@media screen and (max-width: 1024px)
	.escritorio__grilla
		grid-template-columns: repeat(2, minmax(0, 1fr))

@media screen and (max-width: 767px)
	.escritorio
		padding: 14px
		border-radius: 14px

		&__grilla
			grid-template-columns: minmax(0, 1fr)
			gap: 12px

			&--chica
				grid-template-columns: minmax(0, 1fr)
</style>
