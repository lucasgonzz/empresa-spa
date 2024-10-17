<template>
  <div class="circle-container" :style="{ width: size + 'px', height: size + 'px' }">
    <svg class="progress-circle" :width="size" :height="size">
      <!-- Círculo de fondo -->
      <circle class="bg" :cx="size / 2" :cy="size / 2" :r="radius"></circle>
      <!-- Círculo de progreso -->
      <circle class="progress" :cx="size / 2" :cy="size / 2" :r="radius" :style="progressStyle"></circle>
    </svg>
    <!-- Texto con el porcentaje -->
    <div class="percentage-text" :style="textStyle">{{ porcentaje }}%</div>
  </div>
</template>


<script>
export default {
  props: {
    porcentaje: {
      type: Number,
      required: true
    },
    size: {
      type: Number,
      default: 100 // Tamaño por defecto
    }
  },
  computed: {
    radius() {
      // Radio calculado basado en el tamaño (ancho total menos un margen para el stroke)
      return (this.size / 2) - (this.size * 0.05); // Ajuste dinámico para mantener proporción
    },
    progressStyle() {
      const circumference = 2 * Math.PI * this.radius;
      const offset = circumference - (this.porcentaje / 100) * circumference;

      return {
        strokeDasharray: `${circumference}`,
        strokeDashoffset: `${offset}`,
        strokeWidth: `${this.size * 0.1}` // Ancho del borde dinámico según el tamaño
      };
    },
    textStyle() {
      return {
        fontSize: `${this.size * 0.2}px` // Ajuste del tamaño de texto en base al tamaño del círculo
      };
    }
  }
};
</script>



<style>
.circle-container {
  position: relative;
}

.progress-circle {
  transform: rotate(-90deg); /* Rotar para que comience desde arriba */
}

circle {
  fill: none; /* Sin relleno */
}

.bg {
  stroke: #b3d9ff; /* Color más claro */
  stroke-width: 5; /* Ancho de la línea de fondo (puedes ajustar este valor para hacerlo más grueso) */
}

.progress {
  stroke: #007bff; /* Color más oscuro */
  stroke-linecap: round;
  transition: stroke-dashoffset 0.35s; /* Transición suave */
}

.percentage-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: #007bff;
}


</style>