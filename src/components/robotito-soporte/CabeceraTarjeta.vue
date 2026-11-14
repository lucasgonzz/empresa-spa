<template>
	<header class="robotito-tarjeta__cabecera">
		<div class="robotito-tarjeta__identidad">
			<span class="robotito-tarjeta__avatar"><robot pose="senalar"></robot></span>
			<div>
				<div class="robotito-tarjeta__marca">Robotito</div>
				<div class="robotito-tarjeta__etiqueta">Guía interactiva</div>
			</div>
		</div>
		<div class="robotito-tarjeta__avance" aria-live="polite">
			<span>Paso {{ paso }} de {{ total }}</span>
			<div class="robotito-tarjeta__segmentos" aria-hidden="true">
				<span v-for="n in total" :key="n" :class="{ 'esta-completo': n <= paso }"></span>
			</div>
		</div>
	</header>
</template>

<script>
import Robot from '@/components/implementacion/Robot'

export default {
	components: { Robot },
	props: {
		paso: { type: Number, required: true },
		total: { type: Number, required: true },
	},
}
</script>
