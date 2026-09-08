import s1 from '@/tours/guiones/s1-listado'
import s2 from '@/tours/guiones/s2-vender'
import s3s4 from '@/tours/guiones/s3-s4-ventas-compras'
import s6 from '@/tours/guiones/s6-ecommerce'

/**
 * Catálogo de tours de la demo, indexado por el `id` del clip tal como viaja en el plan.
 *
 * Los ids son los del catálogo de contenido (`contexto/demo_catalogo.md`): `1.1`, `1.2-mt`, `2.10`,
 * `4.6`, etc. **Son strings, no números**: `1.10` y `1.1` son clips distintos.
 *
 * ## Qué clips tienen tour y cuáles no
 *
 * Están los **24 clips con `practica: si`**, que son exactamente los que dibujan el botón "Probar"
 * en el panel. Los conceptuales (`0.1` bienvenida, `5.1` tesorería, `5.2` estado de resultados,
 * `5.3` la IA) y los de biblioteca sin práctica **no tienen tour y no corresponde que lo tengan**:
 * no hay una acción que ir a hacer al sistema, se miran y se sigue. `TarjetaClip.vue` no les dibuja
 * el botón desde el 24/8/2026 (`practica: false` explícito lo oculta), así que no queda nada
 * prometido sin cumplir.
 *
 * ## Cómo se agrega un tour
 *
 * 1. Escribí los pasos en el archivo de la sección que le corresponda, en `guiones/`.
 * 2. Si un paso necesita un ancla nueva, agregá el `data-tour` en el componente **y** dalo de alta
 *    en `claude-comerciocity/contexto/demo_data_tour.md` en el mismo commit. Si no,
 *    `herramientas/validar_data_tour.ps1` lo reporta como sobrante.
 * 3. Verificalo corriendo el tour de verdad. Un paso que apunta a un elemento inexistente no
 *    explota: el motor lo saltea y lo avisa por consola, así que un tour a medias se ve sano.
 *
 * 🔴 Este catálogo es el **respaldo**, no la fuente única. `motor.js` prefiere `clip.pasos` si el
 * plan los trae — ver el docblock de `guion_de()`. Hoy el plan congelado no los trae, y este
 * catálogo tiene además la ventaja de vivir en el mismo repo que el DOM al que apunta: un refactor
 * que rompa un ancla se ve en el mismo diff.
 */
const CATALOGO = Object.assign({}, s1, s2, s3s4, s6)

export default CATALOGO
