<template>
	<div>
        <update-features></update-features>
		
		<robotito-soporte :key="usuario_robotito || 'sin-sesion'" :usuario_id="usuario_robotito">
			<template #default="tour">
				<nav-vertical>
					<template #nav_top>
						<acceso-asistente class="d-none d-md-flex"></acceso-asistente>
					</template>
					<template #nav_tour>
						<aviso-robotito
						v-if="tour.pendiente"
						:key="tour.pendiente.uuid"
						:guia="tour.pendiente"
						:ocupado="tour.ocupado"
						@visible="tour.visible(tour.pendiente.uuid)"
						@iniciar="tour.iniciar(tour.pendiente)"
						@descartar="tour.descartar(tour.pendiente)"></aviso-robotito>
					</template>
					<template #nav_top_mobile>
						<aviso-robotito
						v-if="tour.pendiente"
						:key="tour.pendiente.uuid"
						:guia="tour.pendiente"
						:ocupado="tour.ocupado"
						movil
						@visible="tour.visible(tour.pendiente.uuid)"
						@iniciar="tour.iniciar(tour.pendiente)"
						@descartar="tour.descartar(tour.pendiente)"></aviso-robotito>
						<acceso-asistente movil></acceso-asistente>
					</template>
					<!-- <template #nav_bottom>
						<btn-version-estable></btn-version-estable>
					</template> -->
				</nav-vertical>
			</template>
		</robotito-soporte>
		
		<tasks></tasks>	

	</div>
</template>
<script>
import RobotitoSoporte from '@/components/robotito-soporte/Anfitrion'

export default {
	components: {
		RobotitoSoporte,
		AvisoRobotito: () => import('@/components/robotito-soporte/Aviso'),
		AccesoAsistente: () => import('@/components/asistente-ia/Acceso'),
		NavComponent: () => import('@/common-vue/components/nav/Index'),
		NavVertical: () => import('@/common-vue/components/nav-vertical/Index'),
		BtnVersionEstable: () => import('@/components/nav/BtnVersionEstable'),
		TasksButton: () => import('@/components/nav/tasks/TasksButton'),
		Tasks: () => import('@/components/nav/tasks/modal/Index'),
		AlertInfos: () => import('@/components/nav/alert-infos/Index'),
		UpdateFeatures: () => import('@/components/common/UpdateFeatures'),
	},
	computed: {
		usuario_robotito() {
			const auth = this.$store.state.auth
			const usuario = auth.user
			return auth.authenticated && usuario && !auth.version_bloqueada && !auth.sesion_sin_conexion
				&& !usuario.es_sesion_soporte && !usuario.es_acceso_maestro && !usuario.es_sesion_demo
				&& !this.$store.state.demo.es_demo ? usuario.id : null
		},
	},
	methods: {
		versionAnterior() {
			window.open('https://empresa.comerciocity.com')
		}
	}
}
</script>
