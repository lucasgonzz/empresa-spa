<template>
	<div class="home_view">
		<nav-section :section_data="nav_data"></nav-section>
		<hero-section :section_data="hero_data"></hero-section>
		<trusted-section :section_data="trusted_data"></trusted-section>
		<features-section :section_data="features_data"></features-section>
		<modules-section :section_data="modules_data"></modules-section>
		<testimonial-section :section_data="testimonial_data"></testimonial-section>
		<!-- <pricing-section :section_data="pricing_data"></pricing-section> -->
		<final-cta-section :section_data="final_cta_data"></final-cta-section>
	</div>
</template>

<script>
export default {
	name: 'Home',
	components: {
		NavSection: () => import('@/components/home/components/nav/Index'),
		HeroSection: () => import('@/components/home/components/hero/Index'),
		TrustedSection: () => import('@/components/home/components/trusted/Index'),
		FeaturesSection: () => import('@/components/home/components/features/Index'),
		ModulesSection: () => import('@/components/home/components/modules/Index'),
		TestimonialSection: () => import('@/components/home/components/testimonial/Index'),
		PricingSection: () => import('@/components/home/components/pricing/Index'),
		FinalCtaSection: () => import('@/components/home/components/final-cta/Index'),
	},
	/**
	 * Configura todos los contenidos y recursos visuales del home público.
	 * Cada sección consume su bloque para facilitar mantenimiento sin tocar templates internos.
	 * @returns {Object}
	 */
	data() {
		return {
			/** Datos de cabecera principal (marca y acciones). */
			nav_data: {
				brand_name: 'Empresa',
				brand_tagline: 'Sistema de gestion para pymes',
				brand_logo_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
				login_label: 'Iniciar sesion',
				login_route_name: 'login',
				primary_cta_label: 'Empezar ahora',
				primary_cta_url: 'https://app.contagram.com/users/register',
			},
			/** Datos del hero principal y panel de puntos destacados. */
			hero_data: {
				badge_text: 'Gestion simple, rapida e intuitiva',
				title_text: 'Tenemos todo lo que necesitas para ordenar tu negocio',
				description_text: 'Administra tu empresa en la nube de forma clara, rapida y desde cualquier lugar.',
				primary_cta_label: 'Probar ahora',
				primary_cta_url: 'https://app.contagram.com/users/register',
				secondary_cta_label: 'Agendar demo',
				secondary_cta_url: 'https://contagram.com/',
				hero_image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
				panel_title: 'Panel de control',
				panel_items: [
					'Resumen del negocio en tiempo real',
					'Ventas a cobrar y vencidas',
					'Control de egresos y tesoreria',
					'Inventario organizado por deposito',
				], 
			},
			/** Datos de confianza (logos externos de referencia). */
			trusted_data: {
				title_text: 'Estas empresas ya confian en una gestion moderna',
				logos: [
					'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					'https://api.comerciocity.com/public/storage/comerciocity-icon.png', 
				],
			},
			/** Datos de tarjetas de funcionalidades principales. */
			features_data: {
				title_text: 'Entende donde esta tu negocio en todo momento',
				description_text: 'Automatiza procesos y simplifica la operacion para ahorrar horas de trabajo.',
				cards: [
					{
						title: 'Ingresos',
						description: 'Visualiza ventas a cobrar y realiza facturas en pocos minutos.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},	
					{
						title: 'Egresos',
						description: 'Analiza gastos, ordena deudas y mejora el control de salidas.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},	
					{
						title: 'Stock',
						description: 'Controla inventario automaticamente y mejora trazabilidad.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},	
				],
			},
			/** Datos de bloques ampliados por modulo de negocio. */
			modules_data: {
				sections: [
					{
						label: 'Informes',
						title: 'Toma mejores decisiones con metricas claras',
						description: 'Conoce rapidamente los numeros clave del negocio para actuar a tiempo.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},
					{
						label: 'Integraciones',
						title: 'Unifica procesos con tus herramientas favoritas',
						description: 'Conecta aplicaciones y automatiza tareas repetitivas para ganar tiempo.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},
					{
						label: 'Tesoreria',
						title: 'Controla movimientos de cobros y pagos',
						description: 'Visualiza historial y estado de cuentas para ordenar tu flujo financiero.',
						image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
					},
				],
			},
			/** Datos de sección social/testimonial. */
			testimonial_data: {
				title_text: 'Lo que opinan nuestros clientes',
				quote_text: 'Hoy podemos dedicar mas tiempo al negocio porque la gestion administrativa ya no es un problema.',
				author_name: 'Elemento Laser',
				author_role: 'Cliente',
				author_image_url: 'https://api.comerciocity.com/public/storage/comerciocity-icon.png',
			},
				
			/** Datos de planes comerciales. */
			pricing_data: {
				title_text: 'Planes pensados para cada etapa',
				description_text: 'Comienza hoy con una propuesta flexible y escalable.',
				cards: [
					{
						name: 'Inicial',
						price: '$49.900',
						detail: 'AR$ por mes',
					},
					{
						name: 'Intermedio',
						price: '$73.100',
						detail: 'AR$ por mes',
					},
					{
						name: 'Empresa',
						price: '$237.900',
						detail: 'AR$ por mes',
					},
				],
			},
			/** Datos de bloque de conversión final. */
			final_cta_data: {
				title_text: 'Tu empresa a un click de distancia',
				description_text: 'Empieza hoy y ordena toda la operacion desde un solo sistema.',
				primary_cta_label: 'Empezar prueba',
				primary_cta_url: 'https://app.contagram.com/users/register',
				secondary_cta_label: 'Ver demostracion',
				secondary_cta_url: 'https://contagram.com/',
			},
		}
	},
}
</script>

<style lang="sass">
.home_view
	background: #F6F8FC
</style>
