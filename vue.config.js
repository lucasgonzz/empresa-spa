let webpack = require('webpack')
module.exports = {
    lintOnSave: false,
    productionSourceMap: false,
    chainWebpack: config => {
        config.module
        .rule('vue')
        .use('vue-loader')
        .loader('vue-loader')
        .tap(options => {
            options.transformAssetUrls = {
                img: 'src',
                image: 'xlink:href',
                'b-avatar': 'src',
                'b-img': 'src',
                'b-img-lazy': ['src', 'blank-src'],
                'b-card': 'img-src',
                'b-card-img': 'src',
                'b-card-img-lazy': ['src', 'blank-src'],
                'b-carousel-slide': 'img-src',
                'b-embed': 'src'
            }
            return options
        })

        /**
         * Sin `<link rel="prefetch">` de los chunks (misión redireccion-version-antes-del-login,
         * 24/9/2026). Vue CLI agrega uno por cada chunk async (~1100 en el `index.html` de hoy:
         * ~860 de JS y ~200 de CSS) y este repo no lo sacaba nunca.
         *
         * Es redundante: el service worker ya precachea TODOS esos archivos (`precacheAndRoute`,
         * 1218 entradas), así que para el que ya tiene la app instalada cada prefetch es un
         * pedido que el service worker contesta desde su caché, y para el que entra por primera
         * vez es una segunda descarga de lo mismo que el service worker baja en paralelo.
         *
         * Y además demora al service worker justo cuando más importa: al detectar una versión
         * nueva, el service worker viejo tiene que atender esa cola entera antes de dejar paso al
         * nuevo. Medido con el build real y el service worker real (Chromium, DevTools Protocol):
         * con los prefetch, el worker nuevo queda `installed` a 1,1 s y recién se activa a 5,3 s
         * (el viejo tarda ~3 s en terminar su cola); sin ellos, `installed` a 0,5 s y activo a
         * 1,6 s. También la primera instalación del service worker pasó de 38 s a 17 s.
         *
         * Nota del 16/10/2026 (misión quitar-animacion-de-actualizacion): esa demora se veía antes
         * como una pantalla de "Descargando la versión nueva", y esa pantalla ya no existe. Sacar
         * los prefetch sigue siendo correcto por lo de arriba (son redundantes con el precache) y
         * porque el service worker nuevo se instala y se activa antes, que achica la ventana en la
         * que una pestaña vieja convive con una versión nueva; la justificación de la pantalla es
         * la única que ya no aplica.
         *
         * El plugin `preload` (lo que necesita la ruta inicial) NO se toca. Para volverlo atrás
         * alcanza con borrar esta línea.
         */
        config.plugins.delete('prefetch')
    },
	devServer: {
    	host: 'empresa.local',
    	// port: '8081'
    	port: '8080'
    },
	pwa: {
        workboxOptions: {
            skipWaiting: true,

            // El service worker nuevo toma el control de la pestaña que ya estaba abierta sin
            // recargarla. Con skipWaiting solo, esa pestaña quedaba sin service worker hasta recargar
            // (misión quitar-animacion-de-actualizacion, 16/10/2026).
            clientsClaim: true,

            // config.js (window.__CC_CONFIG__) lo escribe el admin por frente en cada deploy: no se
            // precachea, para que el service worker nunca sirva una configuración vieja.
            exclude: ['.htaccess', /config\.js$/],

            // Por defecto Workbox atiende "/" desde el precache buscándolo como "/index.html" (ese es
            // el directoryIndex de precacheAndRoute), o sea caché primero: al entrar se mostraba la
            // versión ANTERIOR del sistema y recién después, cuando el service worker bajaba la nueva,
            // aparecía la barra de "Descargando la versión nueva" y se recargaba todo. Con un nombre de
            // directoryIndex que no existe, "/" deja de coincidir con una entrada del precache y la
            // navegación cae a la ruta de runtimeCaching de abajo (red primero). /index.html SIGUE
            // dentro del precache a propósito (misma estructura que tienda-spa, cuyo admin lo exige) y
            // además es la copia de respaldo para abrir el sistema sin conexión. NO "simplificarlo"
            // sacando /index.html del precache ni borrando esta línea: vuelve la animación.
            directoryIndex: 'cc-sin-directory-index.html',

            // Las navegaciones (el documento HTML) van a la red primero, con el index.html del precache
            // como respaldo. Con internet, se entra directo a lo último: sin animación y sin recarga. La
            // actualización del resto de los archivos precacheados se hace en segundo plano y en
            // silencio (la versión nueva se usa en la próxima visita).
            //
            // ⚠️ Estas funciones se serializan con toString() DENTRO de service-worker.js (workbox-build
            // las copia como texto) y ese archivo NO pasa por babel: tienen que ser autocontenidas
            // (nada de este vue.config.js) y en ES5 (function y var; sin flechas, ?. ni async/await).
            //
            // ⚠️ Las funciones de `plugins` tienen DOS reglas más, propias de workbox-build 4.3.1, y
            // romperlas tira el build entero ("Unable to generate service worker from template"):
            //   1. Van NOMBRADAS (function requestWillFetch (args) {...}), no anónimas: workbox-build
            //      les saca los comentarios parseando el texto como un programa, y un
            //      "function (args) {...}" suelto no es un programa válido ("Unexpected token (1:9)").
            //   2. Cada sentencia termina en punto y coma: workbox-build junta el código de los plugins
            //      en UNA sola línea (oneLine), y sin ";" dos sentencias quedan pegadas y el service
            //      worker generado no compila (no hay salto de línea que active el ASI).
            // El urlPattern de abajo no pasa por ese camino: se copia tal cual, con sus saltos de línea.
            runtimeCaching: [{
                // Solo navegaciones del documento, de la propia app y sin extensión de archivo. Un pedido
                // de imagen, script o API no es una navegación y no entra acá. Un "/index.html" escrito
                // a mano NO es una entrada normal: lo atiende el listener del precache, que se registra
                // antes que esta ruta y gana, y responde caché primero (el start_url del manifest es "/",
                // así que la app instalada no pasa por ahí).
                urlPattern: function (args) {
                    if (!args.request || args.request.mode !== 'navigate') return false
                    var ruta = args.url.pathname
                    return !/\.[A-Za-z0-9]+$/.test(ruta)
                },
                handler: 'NetworkFirst',
                options: {
                    // Nombre de la caché que usa la estrategia. Como cacheWillUpdate (abajo) no deja
                    // guardar nada, queda siempre vacía: existe porque NetworkFirst la necesita.
                    cacheName: 'cc-navegacion',
                    // Si la red no contesta en 3 s se abre el respaldo (conexión mala o caída).
                    networkTimeoutSeconds: 3,
                    // 🔴 NO se guardan copias de los HTML (sin `expiration`, sin cacheWillUpdate que acepte):
                    // el respaldo es SIEMPRE el index.html del precache ACTIVO, que es el único que está
                    // garantizado como coherente con los bundles que ese mismo precache tiene guardados.
                    // Una copia por visita rompía eso: si el service worker nuevo no llega a terminar de
                    // instalarse (se corta la señal, se cierra el celular), queda el viejo con su precache
                    // viejo y, sin conexión, la copia del HTML NUEVO pedía js/app.<hash nuevo>.js, que no
                    // está en ese precache: pantalla en blanco (y el sistema tiene ventas sin conexión).
                    // Además se guardaba una copia por cada URL con query de un solo uso (por ejemplo
                    // ?version_session_token). NO "arreglarlo" volviendo a guardar copias.
                    plugins: [{
                        // Workbox IGNORA fetchOptions en las navegaciones (fetchWrapper de workbox-core),
                        // así que la revalidación contra el servidor se fuerza reescribiendo el pedido.
                        // Sin esto, un servidor que mande "Cache-Control: max-age" (o la caché heurística
                        // de LiteSpeed/nginx) entregaría un index.html viejo y volvería el problema.
                        requestWillFetch: function requestWillFetch (args) {
                            return new Request(args.request, { cache: 'no-cache' });
                        },
                        // Un 5xx del servidor (503 en un deploy, por ejemplo) no se le muestra a la
                        // persona: se trata como "sin red" y se abre el respaldo del precache.
                        fetchDidSucceed: function fetchDidSucceed (args) {
                            if (args.response && args.response.status >= 500) {
                                throw new Error('El servidor contestó ' + args.response.status);
                            }
                            return args.response;
                        },
                        // Devolver null le dice a Workbox que NO guarde la respuesta: en `cc-navegacion`
                        // no queda nada (ver el 🔴 de arriba).
                        cacheWillUpdate: function cacheWillUpdate () {
                            return null;
                        },
                        // Sin red (o red lenta, o 5xx) se entrega SIEMPRE el /index.html del precache
                        // activo, sin mirar qué haya en `cc-navegacion`: la app abre igual, también sin
                        // conexión y también en un link directo a una pantalla que nunca se visitó, y el
                        // router de Vue resuelve la ruta del lado del cliente.
                        cachedResponseWillBeUsed: function cachedResponseWillBeUsed () {
                            // `workbox` es una global que existe solo adentro de service-worker.js.
                            // eslint-disable-next-line no-undef
                            var clave = workbox.precaching.getCacheKeyForURL('/index.html');
                            return clave ? caches.match(clave) : null;
                        }
                    }]
                }
            }, {
                // config.js (window.__CC_CONFIG__: URL de la API, clave de Pusher...) TAMBIÉN va red primero,
                // y esta ruta existe para que el sistema ABRA SIN CONEXIÓN en un build de release.
                //
                // Por qué hace falta: el release se compila sin .env, así que NO hay ninguna VUE_APP_*
                // horneada en el bundle y todo sale de config.js. config.js está fuera del precache a
                // propósito (arriba, en `exclude`: el precache responde caché primero y entregaría una
                // configuración vieja, de otra API). Sin esta ruta, sin red config.js no cargaba y la
                // pantalla quedaba en blanco con "You must pass your app key when you instantiate Pusher"
                // (misión config-js-sin-conexion, 17/10/2026; los builds de prueba traían las VUE_APP_*
                // del .env del slot y por eso ahí sí abrían sin red).
                //
                // Cómo evita servir una configuración vieja:
                //   - ONLINE siempre se pide a la red (el pedido se reescribe con cache: 'no-cache') y la
                //     respuesta vuelve a la página con Cache-Control: no-cache, así que Chromium no la reusa desde
                //     su caché aunque el servidor mande un max-age largo; la respuesta buena refresca la copia. La copia SOLO se usa si no hay
                //     red, si la red pasa del tope (3 s) o si el servidor contesta 5xx.
                //   - La caché de un service worker es por origen: cada frente de cada cliente guarda su
                //     propio config.js y nunca se mezclan.
                //   - Solo se guarda una copia BUENA (ver cacheWillUpdate). Si el servidor contesta algo que
                //     no es una configuración (el config.js vacío por defecto, el index.html que sirve el
                //     .htaccess cuando el archivo falta, un 404), no se guarda Y SE BORRA la copia anterior.
                //   - El calentamiento (src/registerServiceWorker.js) guarda la primera copia apenas el
                //     service worker toma el control, sin esperar a la segunda visita.
                // NO sumar config.js al precache ni "simplificar" esta ruta a caché primero.
                urlPattern: function (args) {
                    return args.url.origin === self.location.origin && /\/config\.js$/.test(args.url.pathname);
                },
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'cc-config',
                    networkTimeoutSeconds: 3,
                    // ⚠️ Mismas reglas de workbox-build 4.3.1 que arriba: funciones NOMBRADAS, autocontenidas,
                    // en ES5 y con ";" en cada sentencia. Y una más: el texto de la función pasa por
                    // strip-comments, que lee la secuencia de barra-asterisco o de dos barras como un
                    // comentario aunque esté dentro de un regex o de un string: por eso acá esas
                    // secuencias se arman por partes ('/' + '*').
                    plugins: [{
                        requestWillFetch: function requestWillFetch (args) {
                            return new Request(args.request, { cache: 'no-cache' });
                        },
                        // Un 5xx (503 en un deploy) cuenta como "sin red": se usa la copia si hay.
                        fetchDidSucceed: function fetchDidSucceed (args) {
                            if (args.response && args.response.status >= 500) {
                                throw new Error('El servidor contestó ' + args.response.status);
                            }
                            if (!args.response || args.response.status !== 200) {
                                return args.response;
                            }
                            // La respuesta que recibe la página (y la copia que se guarda, que sale de esta misma
                            // respuesta) lleva Cache-Control: no-cache. Sin esto, un servidor que mande un max-age
                            // largo (el nginx de los clientes del VPS manda 10 años para config.js) hace que
                            // Chromium reuse la configuración desde su caché de memoria en las recargas
                            // siguientes de la misma pestaña, SIN pasar por el service worker, y la
                            // configuración vieja sigue sirviéndose aunque el servidor ya tenga otra.
                            var cabeceras = new Headers(args.response.headers);
                            cabeceras.set('Cache-Control', 'no-cache');
                            cabeceras.delete('Expires');
                            return args.response.blob().then(function (cuerpo) {
                                return new Response(cuerpo, { status: 200, statusText: args.response.statusText, headers: cabeceras });
                            });
                        },
                        // Decide si lo que contestó el servidor se guarda: solo una configuración de verdad.
                        // Devolver null = no guardar. Con un 404/410 o un 200 que no es configuración
                        // (el servidor contestó y dijo que la configuración ya no es esa) se borra además la
                        // copia anterior; otro 4xx (puede ser transitorio) no la toca.
                        cacheWillUpdate: function cacheWillUpdate (args) {
                            var respuesta = args.response;
                            var direccion = args.request.url;
                            var borrar_copia = function () {
                                return caches.open('cc-config').then(function (cache) {
                                    return cache.delete(direccion);
                                }).then(function () {
                                    return null;
                                });
                            };
                            // Una respuesta opaca (status 0) cae en el `!== 200` de más abajo.
                            if (!respuesta) {
                                return null;
                            }
                            if (respuesta.status === 404 || respuesta.status === 410) {
                                return borrar_copia();
                            }
                            if (respuesta.status !== 200) {
                                return null;
                            }
                            return respuesta.clone().text().then(function (texto) {
                                var inicio_bloque = '/' + '*';
                                var fin_bloque = '*' + '/';
                                var inicio_linea = '/' + '/';
                                var limpio = String(texto);
                                var desde = -1;
                                var hasta = -1;
                                // Se sacan los comentarios: el config.js vacío por defecto del release trae
                                // VUE_APP_API_URL escrita DENTRO de un comentario de ejemplo. Primero los de línea
                                // (que pueden nombrar un comienzo de bloque) y después los de bloque; un bloque sin
                                // cierre no se toca, para no borrar la configuración que viene después.
                                limpio = limpio.split(String.fromCharCode(10)).filter(function (linea) {
                                    return linea.replace(/^\s+/, '').indexOf(inicio_linea) !== 0;
                                }).join(String.fromCharCode(10));
                                desde = limpio.indexOf(inicio_bloque);
                                while (desde !== -1) {
                                    hasta = limpio.indexOf(fin_bloque, desde + 2);
                                    if (hasta === -1) {
                                        break;
                                    }
                                    limpio = limpio.slice(0, desde) + limpio.slice(hasta + 2);
                                    desde = limpio.indexOf(inicio_bloque);
                                }
                                // Una configuración buena empieza una sentencia asignando un objeto a
                                // window.__CC_CONFIG__ y trae la URL de la API con valor ANTES de que ese objeto cierre.
                                // "window.__CC_CONFIG__ = window.__CC_CONFIG__ || {}" (el vacío del release) no cumple:
                                // después del "=" no viene una llave. Un HTML con un script en el medio tampoco: la
                                // asignación no está al comienzo de una sentencia.
                                var es_buena = limpio.length < 200000
                                    && /(^|[\n\r;])\s*window\.__CC_CONFIG__\s*=\s*\{[^}]*?VUE_APP_API_URL["']?\s*:\s*["'][^"'\s]/.test(limpio);
                                return es_buena ? respuesta : borrar_copia();
                            });
                        }
                    }]
                }
            }]
        },
		themeColor: "#007bff",
		msTileColor: "#007bff",
		name: "ComercioCity",
		manifestOptions: {
		  icons: [
		    {
		      src: "./img/icons/android-chrome-192x192.png",
		      sizes: "192x192",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/android-chrome-512x512.png",
		      sizes: "512x512",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/android-chrome-maskable-192x192.png",
		      sizes: "192x192",
		      type: "image/png",
		      purpose: "maskable",
		    },
		    {
		      src: "./img/icons/android-chrome-maskable-512x512.png",
		      sizes: "512x512",
		      type: "image/png",
		      purpose: "maskable",
		    },
		    {
		      src: "./img/icons/apple-touch-icon-60x60.png",
		      sizes: "60x60",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/apple-touch-icon-76x76.png",
		      sizes: "76x76",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/apple-touch-icon-120x120.png",
		      sizes: "120x120",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/apple-touch-icon-152x152.png",
		      sizes: "152x152",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/apple-touch-icon-180x180.png",
		      sizes: "180x180",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/apple-touch-icon.png",
		      sizes: "180x180",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/favicon-16x16.png",
		      sizes: "16x16",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/favicon-32x32.png",
		      sizes: "32x32",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/msapplication-icon-144x144.png",
		      sizes: "144x144",
		      type: "image/png",
		    },
		    {
		      src: "./img/icons/mstile-150x150.png",
		      sizes: "150x150",
		      type: "image/png",
		    },
		  ],
		},
	},
};