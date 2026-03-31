// ── Service Worker Registration ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW failed:', err));
  });
}

// ── DOM References ──
const form           = document.getElementById('obsForm');
const successScreen  = document.getElementById('successScreen');
const submitAnother  = document.getElementById('submitAnother');
const submitBtn      = document.getElementById('submitBtn');
const submitText     = document.getElementById('submitText');
const submitSpinner  = document.getElementById('submitSpinner');
const photoInput     = document.getElementById('photo');
const photoPreview   = document.getElementById('photoPreview');
const previewImg     = document.getElementById('previewImg');
const photoLabel     = document.getElementById('photoLabel');
const removePhoto    = document.getElementById('removePhoto');

// ── Photo Preview ──
photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    photoPreview.classList.remove('hidden');
    photoLabel.textContent = file.name;
  };
  reader.readAsDataURL(file);
});

removePhoto.addEventListener('click', () => {
  photoInput.value = '';
  previewImg.src = '';
  photoPreview.classList.add('hidden');
  photoLabel.textContent = 'Tap to take a photo or choose from gallery';
});

// ── Validation ──
function validate() {
  let valid = true;

  // Type
  const typeSelected = document.querySelector('input[name="type"]:checked');
  const typeError = document.getElementById('typeError');
  if (!typeSelected) {
    typeError.classList.add('visible');
    valid = false;
  } else {
    typeError.classList.remove('visible');
  }

  // Department
  const dept = document.getElementById('department');
  const deptError = document.getElementById('deptError');
  if (!dept.value) {
    dept.classList.add('invalid');
    deptError.classList.add('visible');
    valid = false;
  } else {
    dept.classList.remove('invalid');
    deptError.classList.remove('visible');
  }

  // Description
  const desc = document.getElementById('description');
  const descError = document.getElementById('descError');
  if (!desc.value.trim()) {
    desc.classList.add('invalid');
    descError.classList.add('visible');
    valid = false;
  } else {
    desc.classList.remove('invalid');
    descError.classList.remove('visible');
  }

  return valid;
}

// ── Form Submit ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validate()) return;

  // Show spinner
  submitText.classList.add('hidden');
  submitSpinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const formData = new FormData(form);

    const response = await fetch('/api/observations', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      form.classList.add('hidden');
      successScreen.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error(err);
    alert('Submission failed. Please check your connection and try again.');
  } finally {
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
});

// ── Submit Another ──
submitAnother.addEventListener('click', () => {
  form.reset();
  photoPreview.classList.add('hidden');
  previewImg.src = '';
  photoLabel.textContent = 'Tap to take a photo or choose from gallery';

  // Clear validation states
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.error-msg.visible').forEach(el => el.classList.remove('visible'));

  successScreen.classList.add('hidden');
  form.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});