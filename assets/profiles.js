/* CoolWips SMP founders: accessible on-site About Us profiles. */
(() => {
  'use strict';
  const dialog = document.getElementById('founder-profile-dialog');
  if (!dialog) return;
  const profiles = {
    coolwip: {
      name: 'CoolWip',
      role: 'SERVER OWNER',
      image: 'assets/featured/coolwip.webp',
      alt: 'Orange sports car artwork selected by CoolWip',
      bio: 'The owner behind CoolWips SMP, building the server and bringing the community together.',
      story: 'CoolWip runs CoolWips SMP, an anarchy-style survival world where Java and Bedrock players can build bases, make alliances, trade, and create their own stories.',
      other: 'kaitlynn'
    },
    kaitlynn: {
      name: 'Kaitlynn',
      role: 'SPECIAL RECOGNITION',
      image: 'assets/featured/kaitlynn.webp',
      alt: 'Silhouette forming a heart against a sunset',
      bio: 'The woman that made all this possible.',
      story: 'A personal dedication from CoolWip, recognizing Kaitlynn and her importance to the story behind CoolWips SMP.',
      other: 'coolwip'
    }
  };
  const name = document.getElementById('founder-dialog-name');
  const role = document.getElementById('founder-dialog-role');
  const photo = document.getElementById('founder-dialog-photo');
  const bio = document.getElementById('founder-dialog-bio');
  const story = document.getElementById('founder-dialog-story');
  const other = document.getElementById('founder-dialog-other');
  const close = dialog.querySelector('.founder-dialog-close');
  let lastTrigger = null;
  const show = (person, trigger) => {
    const data = profiles[person];
    if (!data) return;
    if (trigger) lastTrigger = trigger;
    name.textContent = data.name;
    role.textContent = data.role;
    photo.src = data.image;
    photo.alt = data.alt;
    bio.textContent = data.bio;
    story.textContent = data.story;
    dialog.dataset.person = person;
    other.textContent = 'Meet ' + profiles[data.other].name + ' →';
    other.dataset.other = data.other;
    if (!dialog.open) dialog.showModal();
    close.focus();
  };
  document.querySelectorAll('[data-founder]').forEach(button => {
    button.addEventListener('click', () => show(button.dataset.founder, button));
  });
  other.addEventListener('click', event => {
    event.preventDefault();
    show(other.dataset.other, null);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (lastTrigger?.isConnected) lastTrigger.focus();
  });
})();