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
         * Y sale caro justo cuando más importa: al detectar una versión nueva, el service worker
         * viejo tiene que atender esa cola entera antes de dejar paso al nuevo. Medido con el
         * build real y el service worker real (Chromium, DevTools Protocol): con los prefetch, el
         * worker nuevo queda `installed` a 1,1 s y recién se activa a 5,3 s (el viejo tarda ~3 s
         * en terminar su cola); sin ellos, `installed` a 0,5 s y activo a 1,6 s. Es la diferencia
         * entre una pantalla de actualización de ~5 s y una de ~2 s. También la primera
         * instalación del service worker pasó de 38 s a 17 s.
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
            // config.js (window.__CC_CONFIG__) lo escribe el admin por frente en cada deploy: no se
            // precachea, para que el service worker nunca sirva una configuración vieja.
            exclude: ['.htaccess', /config\.js$/],
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