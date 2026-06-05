document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trainer-form');
  const loadingState = document.getElementById('loading-state');
  const resultState = document.getElementById('result-state');
  const planRender = document.getElementById('plan-markdown-render');
  const restartBtn = document.getElementById('restart-btn');
  const etherealNotice = document.getElementById('ethereal-notice');
  const etherealLink = document.getElementById('ethereal-link');
  const emailConfirmationText = document.getElementById('email-confirmation-text');

  // Form Validation helper for the entire form
  function validateForm() {
    const inputs = Array.from(form.querySelectorAll('input[required], select[required], textarea[required]'));
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.value.trim()) {
        isValid = false;
        input.style.borderColor = 'var(--error)';
        input.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.2)';
      } else {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      }
    });

    return isValid;
  }

  // Remove validation error outline when user types/selects
  form.addEventListener('input', (e) => {
    if (e.target.style.borderColor === 'var(--error)') {
      e.target.style.borderColor = '';
      e.target.style.boxShadow = '';
    }
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Focus the first invalid field
      const firstInvalid = form.querySelector('input:invalid, select:invalid, textarea:invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    // Gather Form Data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Hide form, show loading
    form.classList.add('hidden');
    loadingState.classList.remove('hidden');

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server returned an error generating your plan.');
      }

      // Hide loading, show results
      loadingState.classList.add('hidden');
      resultState.classList.remove('hidden');

      // Render markdown using Marked library
      planRender.innerHTML = marked.parse(result.plan);

      // Handle email confirmation or warning notice
      if (result.emailSent) {
        if (result.previewUrl) {
          etherealNotice.classList.add('show');
          etherealLink.href = result.previewUrl;
          emailConfirmationText.innerHTML = `We sent a preview of this plan to your test mailbox.`;
        } else {
          etherealNotice.classList.remove('show');
          emailConfirmationText.innerHTML = `We sent a copy of this plan to <strong>${data.email}</strong>.`;
        }
        emailConfirmationText.style.color = '';
      } else {
        etherealNotice.classList.remove('show');
        emailConfirmationText.innerHTML = `⚠️ Plan generated, but email failed: ${result.emailError || 'SMTP error'}. <br><strong>Please print or save the blueprint shown below.</strong>`;
        emailConfirmationText.style.color = '#cbd5e1';
      }

    } catch (err) {
      alert(`Error: ${err.message}`);
      // Revert loading, show form again
      loadingState.classList.add('hidden');
      form.classList.remove('hidden');
    }
  });

  // Restart onboarding
  restartBtn.addEventListener('click', () => {
    form.reset();
    resultState.classList.add('hidden');
    form.classList.remove('hidden');
  });
});
