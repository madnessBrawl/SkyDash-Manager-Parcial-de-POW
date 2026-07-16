document.addEventListener("DOMContentLoaded", () => {
    // 1. Redirección de seguridad (si no hay sesión, volver al index)
    const paginasProtegidas = ["dashboard.html", "privado.html"];
    const esProtegida = paginasProtegidas.some(p => window.location.pathname.includes(p));
    
    if (esProtegida && !localStorage.getItem("sesionActiva")) {
        window.location.href = "index.html";
    }

    // 2. Lógica de Registro
    const formRegistro = document.getElementById("form-registro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", (e) => {
            e.preventDefault();
            const user = document.getElementById("reg-usuario").value;
            const pass = document.getElementById("reg-password").value;
            localStorage.setItem("usuario_app", user);
            localStorage.setItem("pass_app", pass);
            alert("Cuenta creada. Redirigiendo...");
            window.location.href = "index.html";
        });
    }

    // 3. Lógica de Login
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = document.getElementById("usuario").value;
            const p = document.getElementById("password").value;
            if (u === localStorage.getItem("usuario_app") && p === localStorage.getItem("pass_app")) {
                localStorage.setItem("sesionActiva", "true");
                window.location.href = "dashboard.html";
            } else {
                alert("Credenciales incorrectas");
            }
        });
    }

    // 4. Mostrar datos en privado.html
    const displayUser = document.getElementById("display-user");
    if (displayUser) {
        displayUser.textContent = localStorage.getItem("usuario_app") || "Invitado";
    }

    // 5. Logout global
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem("sesionActiva");
            window.location.href = "index.html";
        });
    }
});