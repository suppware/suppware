async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;
  if (!email || !password) { toast('Completa todos los campos', 'error'); return; }
  const res = await api('/api/auth/login', 'POST', { email, password });
  if (res?.token) {
    setAuth(res.token, res.user);
    toast(`¡Hola ${res.user.name}! ✓`, 'success');
    setTimeout(() => location.href = '/', 800);
  } else if (res?.error === 'Verifica tu correo antes de iniciar sesión') {
    toast('Verifica tu correo. Revisa tu bandeja de entrada.', 'error');
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = 'width:100%; justify-content:center; margin-top:12px;';
    btn.textContent = 'Reenviar email de verificación';
    btn.onclick = () => resendVerification(email);
    document.querySelector('.auth-card').appendChild(btn);
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
  if (res?.ok) {
    toast('Revisa tu correo para verificar tu cuenta ✓', 'success');
    setTimeout(() => location.href = '/login.html', 1500);
  } else {
    toast(res?.error || 'Error al registrarse', 'error');
  }
}

async function resendVerification(email) {
  const res = await api('/api/auth/resend-verification', 'POST', { email });
  if (res?.ok) {
    toast('Email reenviado. Revisa tu bandeja.', 'success');
  } else {
    toast(res?.error || 'Error al reenviar', 'error');
  }
}   