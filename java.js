document.addEventListener("DOMContentLoaded", () => {
    /* ================= ELEMENTOS DEL DOM ================= */
    const formLogin = document.getElementById("form-login");
    const seccionLogin = document.getElementById("seccion-login");
    const seccionDashboard = document.getElementById("seccion-dashboard");
    const btnLogout = document.getElementById("btn-logout");
    const spinner = document.getElementById("login-spinner");
    const msgError = document.getElementById("login-error");
    const btnModo = document.getElementById("btn-modo");
    
    // Elementos Clima y Mapa
    let mapa, marcadorActual;
    const inputBusqueda = document.getElementById("input-busqueda");
    const btnBuscar = document.getElementById("btn-buscar");
    const btnGuardarFav = document.getElementById("btn-guardar-fav");
    const listaFavoritos = document.getElementById("lista-favoritos");
    let ubicacionActual = null; // Almacena temporalmente lat, lon, nombre

    /* ================= GESTIÓN DE TEMATIZACIÓN ================= */
    function aplicarTema() {
        const tema = localStorage.getItem("tema") || "light";
        if (tema === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            document.getElementById("icono-modo").textContent = "☀️";
            document.getElementById("texto-modo").textContent = "Modo Claro";
        } else {
            document.documentElement.removeAttribute("data-theme");
            document.getElementById("icono-modo").textContent = "🌙";
            document.getElementById("texto-modo").textContent = "Modo Oscuro";
        }
    }

    btnModo.addEventListener("click", () => {
        const esOscuro = document.documentElement.getAttribute("data-theme") === "dark";
        localStorage.setItem("tema", esOscuro ? "light" : "dark");
        aplicarTema();
    });

    aplicarTema(); // Aplicar al inicio

    /* ================= AUTENTICACIÓN (Mock) ================= */
    // Verifica si hay sesión activa al cargar
    if (localStorage.getItem("sesionActiva") === "true") {
        iniciarDashboard();
    }

    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        msgError.classList.add("oculto");
        spinner.classList.remove("oculto");
        
        // Simulación de petición de red (Indicadores de carga requeridos)
        setTimeout(() => {
            spinner.classList.add("oculto");
            const user = document.getElementById("usuario").value;
            const pass = document.getElementById("password").value;

            // Validación estática simple
            if (user === "admin" && pass === "1234") {
                localStorage.setItem("sesionActiva", "true");
                iniciarDashboard();
            } else {
                msgError.classList.remove("oculto");
            }
        }, 1500); // 1.5s de spinner
    });

    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("sesionActiva");
        seccionDashboard.classList.add("oculto");
        seccionLogin.classList.remove("oculto");
        btnLogout.classList.add("oculto");
        document.getElementById("form-login").reset();
    });

    /* ================= INICIALIZACIÓN DEL DASHBOARD ================= */
    function iniciarDashboard() {
        seccionLogin.classList.add("oculto");
        seccionDashboard.classList.remove("oculto");
        btnLogout.classList.remove("oculto");
        
        cargarFavoritos();
        
        // Evita reinicializar Leaflet si ya existe
        if (!mapa) {
            inicializarMapa();
        }
    }

    /* ================= MAPA (Leaflet) Y GEOCODIFICACIÓN ================= */
    function inicializarMapa() {
        // Coordenadas por defecto (Caracas)
        mapa = L.map('mapa').setView([10.4806, -66.9036], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapa);

        // Evento click para Geocodificación inversa
        mapa.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            procesarUbicacion(lat, lng);
        });
    }

    // Traduce coordenadas a nombres (Geocodificación inversa con Nominatim)
    async function procesarUbicacion(lat, lng, nombreProvisto = null) {
        if (!navigator.onLine) {
            alert("Modo Offline: No se pueden realizar peticiones de red nuevas.");
            return;
        }

        let nombreLocalidad = nombreProvisto;
        
        // Si no tenemos nombre, lo buscamos
        if (!nombreLocalidad) {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                const data = await res.json();
                nombreLocalidad = data.address.city || data.address.town || data.address.country || "Ubicación Desconocida";
            } catch (error) {
                nombreLocalidad = `Lat: ${lat.toFixed(2)}, Lon: ${lng.toFixed(2)}`;
            }
        }

        ubicacionActual = { lat, lon: lng, nombre: nombreLocalidad };
        document.getElementById("ubicacion-nombre").textContent = nombreLocalidad;
        btnGuardarFav.classList.remove("oculto");

        // Transición animada requerida
        mapa.flyTo([lat, lng], 12);
        
        obtenerClima(lat, lng);
    }

    // Buscador manual
    btnBuscar.addEventListener("click", async () => {
        const query = inputBusqueda.value;
        if (!query) return;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json`);
            const data = await res.json();
            
            if (data.length > 0) {
                procesarUbicacion(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name.split(",")[0]);
            } else {
                alert("Ubicación no encontrada.");
            }
        } catch (error) {
            console.error("Error buscando:", error);
        }
    });

    /* ================= CLIMA (Open-Meteo) ================= */
    async function obtenerClima(lat, lon) {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
            const data = await res.json();
            
            actualizarUIClima(data.current_weather, data.daily);
        } catch (error) {
            console.error("Error obteniendo clima", error);
        }
    }

    function actualizarUIClima(current, daily) {
        const emoji = obtenerEmojiClima(current.weathercode);
        
        // Actualizar Tarjeta Principal
        document.getElementById("clima-icono-actual").textContent = emoji;
        document.getElementById("temp-actual").textContent = `${current.temperature}°C`;
        document.getElementById("viento-actual").textContent = current.windspeed;
        document.getElementById("estado-actual").textContent = descifrarCodigoClima(current.weathercode);

        // Actualizar Marcador Dinámico en Mapa (DivIcon programático)
        if (marcadorActual) mapa.removeLayer(marcadorActual);
        
        const iconoPersonalizado = L.divIcon({
            className: 'marcador-clima',
            html: `<div>${emoji}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        marcadorActual = L.marker([ubicacionActual.lat, ubicacionActual.lon], { icon: iconoPersonalizado }).addTo(mapa);

        // Renderizar pronóstico de 7 días
        const grid = document.getElementById("pronostico-grid");
        grid.innerHTML = ""; // Limpiar previo

        for (let i = 0; i < 7; i++) {
            const fecha = new Date(daily.time[i] + 'T00:00:00'); // Evitar desfase horario
            const diaSemana = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
            const emojiDia = obtenerEmojiClima(daily.weathercode[i]);
            
            grid.innerHTML += `
                <div class="dia-pronostico">
                    <strong>${diaSemana.toUpperCase()}</strong>
                    <div style="font-size: 24px;">${emojiDia}</div>
                    <div>↑ ${daily.temperature_2m_max[i]}°</div>
                    <div>↓ ${daily.temperature_2m_min[i]}°</div>
                </div>
            `;
        }
    }

    // Traductor de Códigos WMO a Emojis Visuales
    function obtenerEmojiClima(codigo) {
        if (codigo === 0) return "☀️";
        if (codigo > 0 && codigo <= 3) return "⛅";
        if (codigo >= 45 && codigo <= 48) return "🌫️";
        if (codigo >= 51 && codigo <= 67) return "🌧️";
        if (codigo >= 71 && codigo <= 77) return "❄️";
        if (codigo >= 95) return "⛈️";
        return "☁️";
    }

    function descifrarCodigoClima(codigo) {
        if (codigo === 0) return "Despejado";
        if (codigo <= 3) return "Parcialmente nublado";
        if (codigo <= 48) return "Niebla";
        if (codigo <= 67) return "Lluvia";
        if (codigo <= 77) return "Nieve";
        if (codigo >= 95) return "Tormenta";
        return "Desconocido";
    }

    /* ================= FAVORITOS (Local Storage) ================= */
    btnGuardarFav.addEventListener("click", () => {
        if (!ubicacionActual) return;
        
        let favs = JSON.parse(localStorage.getItem("favoritosClima")) || [];
        
        // Evitar duplicados
        if (!favs.some(f => f.nombre === ubicacionActual.nombre)) {
            favs.push(ubicacionActual);
            localStorage.setItem("favoritosClima", JSON.stringify(favs));
            cargarFavoritos();
            alert("Ubicación guardada en Favoritos.");
        }
    });

    function cargarFavoritos() {
        let favs = JSON.parse(localStorage.getItem("favoritosClima")) || [];
        listaFavoritos.innerHTML = "";
        
        if(favs.length === 0) {
            listaFavoritos.innerHTML = "<li>No hay ubicaciones guardadas.</li>";
            return;
        }

        favs.forEach(fav => {
            const li = document.createElement("li");
            li.textContent = fav.nombre;
            
            const btnEliminar = document.createElement("button");
            btnEliminar.textContent = "❌";
            btnEliminar.style.background = "transparent";
            btnEliminar.style.border = "none";
            btnEliminar.style.cursor = "pointer";
            
            btnEliminar.onclick = (e) => {
                e.stopPropagation(); // Evita que se dispare el click del 'li'
                eliminarFavorito(fav.nombre);
            };

            // Al hacer clic, carga los datos desde la colección privada
            li.addEventListener("click", () => procesarUbicacion(fav.lat, fav.lon, fav.nombre));
            
            li.appendChild(btnEliminar);
            listaFavoritos.appendChild(li);
        });
    }

    function eliminarFavorito(nombre) {
        let favs = JSON.parse(localStorage.getItem("favoritosClima")) || [];
        favs = favs.filter(f => f.nombre !== nombre);
        localStorage.setItem("favoritosClima", JSON.stringify(favs));
        cargarFavoritos();
    }
});