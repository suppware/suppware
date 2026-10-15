async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;
  if (!email || !password) { toast('Completa todos los campos', 'error'); return; }
  const res = await api('/api/auth/login', 'POST', { email, password });
  if (res?.token) {
    setAuth(res.token, res.user);
    toast(`¡Hola ${res.user.name}! ✓`, 'success');
    setTimeout(() => location.href = '/', 800);
  } else {
    toast(res?.error || 'Error de login', 'error');
  }
}

async function doRegister() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPass').value;
  const address = document.getElementById('regAddress').value;
  if (!name || !email || !password) { toast('Completa los campos obligatorios', 'error'); return; }
  if (password.length < 8) { toast('Contraseña mínima 8 caracteres', 'error'); return; }
  const res = await api('/api/auth/register', 'POST', { name, email, phone, password, address });
  if (res?.token) {
    setAuth(res.token, res.user);
    toast('¡Cuenta creada! Bienvenido ✓', 'success');
    setTimeout(() => location.href = '/', 800);
  } else {
    toast(res?.error || 'Error al registrarse', 'error');
  }
}   