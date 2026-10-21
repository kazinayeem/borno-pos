document.addEventListener('click', (event) => {
  document.querySelectorAll('.menu.open').forEach((menu) => {
    if (!menu.contains(event.target)) menu.classList.remove('open');
  });
});
document.querySelectorAll('[data-menu]').forEach((button) => {
  button.addEventListener('click', () => button.closest('.menu').classList.toggle('open'));
});
document.querySelectorAll('[data-sidebar]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
});
document.querySelectorAll('[data-theme]').forEach((button) => {
  button.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('bornopos-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });
});
if (localStorage.getItem('bornopos-theme') === 'dark') document.body.classList.add('dark');
document.querySelectorAll('[data-demo]').forEach((button) => {
  button.addEventListener('click', () => {
    const form = button.closest('form') ? null : document.querySelector('#login-form');
    document.querySelector('#login').value = button.dataset.login;
    document.querySelector('#password').value = button.dataset.password;
    document.querySelector('#password').focus();
  });
});
document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.querySelector('#password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!confirm(form.dataset.confirm)) event.preventDefault();
  });
});
document.querySelectorAll('form[data-once]').forEach((form) => {
  form.addEventListener('submit', () => {
    form.querySelectorAll('button[type=submit]').forEach((button) => {
      button.disabled = true;
    });
  });
});
