/* CoolWips SMP team: accessible six-person About Us profiles, no private data or trackers. */
(() => {
  'use strict';
  const dialog = document.getElementById('founder-profile-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const profiles = {
    coolwip: {
      name: 'CoolWip',
      role: 'SERVER OWNER',
      image: 'assets/featured/coolwip.webp',
      alt: 'Orange sports car artwork selected by CoolWip',
      bio: 'The owner behind CoolWips SMP, building the server and bringing the community together.',
      story: 'CoolWip runs CoolWips SMP, an anarchy-style survival world where Java and Bedrock players can build bases, form alliances, trade, and create their own stories.'
    },
    kaitlynn: {
      name: 'Kaitlynn',
      role: 'SPECIAL RECOGNITION',
      image: 'assets/featured/kaitlynn.webp',
      alt: 'Silhouette making a heart against the sunset',
      bio: "The woman that made all this possible. The heart behind the story, and someone this server will always have a place for.",
      story: "Some people are part of a server. Others are part of the reason it means so much in the first place. This tribute is CoolWip’s way of giving Kaitlynn a place of her own in the world he built: not as another staff rank, but as someone whose importance can’t be measured by a title. Every base, every rivalry, every new player becomes another chapter in a story that would not feel the same without her. Through all the work behind CoolWips SMP, there is one message he wants everyone to see: Kaitlynn is the woman that made all this possible."
    },
    orangemike: {
      name: 'Orangemike',
      role: 'ADMINISTRATOR',
      handle: '@4dbm',
      image: 'assets/staff/orangemike.webp',
      alt: "Orangemike's Discord avatar",
      bio: "Orangemike has spent countless hours moderating CoolWips SMP, helping players, supporting the community, and keeping the server organized.",
      story: "Every anarchy-style survival server needs people behind the scenes who can separate the chaos of gameplay from the responsibilities of running a community. Orangemike has spent countless hours moderating CoolWips SMP. As an Administrator, he helps provide that structure. His position represents a point of contact for staff matters, player questions, and concerns that go beyond the normal raids and rivalries of the game. While the world itself is full of competition, the goal of the staff team is to keep the experience welcoming, clear, and worth returning to."
    },
    duck: {
      name: 'duck',
      role: 'SENIOR ADMIN',
      handle: '@buddybox_',
      image: 'assets/staff/duck.webp',
      alt: "duck's Discord avatar",
      bio: 'A senior administrator on CoolWips SMP, helping support the server and its players.',
      story: 'duck is listed as a Sr Admin in the CoolWips SMP team.'
    },
    greenreaper: {
      name: 'GreenReaperSlayer',
      role: 'JUNIOR ADMIN',
      handle: '@greenreaperslayer',
      image: 'assets/staff/greenreaper.webp',
      alt: "GreenReaperSlayer's Discord avatar",
      bio: "Family lore: His dad is a celebrity in the furry community, his mom makes a living selling doors to homeless people, and his sisters somehow earn Fortnite V-Bucks by getting homosexual content creators to craft wooden hoes.",
      story: "Also known as Ryan, WiFi, and Right Hand, GreenReaperSlayer somehow ended up becoming a Junior Administrator on CoolWips SMP. His official role is Jr Admin; his unofficial role is continuing the family tradition of questionable business decisions."
    },
    sparky: {
      name: 'Sparky',
      role: 'MODERATOR / CONTENT CREATOR',
      handle: '@sparkyxd',
      image: 'assets/staff/sparky.webp',
      alt: "Sparky's Discord avatar",
      bio: 'Also called “Farty” or “Fart nugget”.',
      story: 'A content creator who brought in 50+ confirmed members and has a YouTube Short with 2.5 million views, according to the CoolWips staff profile.'
    }
  };
  const sequence = ['coolwip', 'kaitlynn', 'orangemike', 'duck', 'greenreaper', 'sparky'];
  const name = document.getElementById('founder-dialog-name');
  const role = document.getElementById('founder-dialog-role');
  const handle = document.getElementById('founder-dialog-handle');
  const photo = document.getElementById('founder-dialog-photo');
  const bio = document.getElementById('founder-dialog-bio');
  const story = document.getElementById('founder-dialog-story');
  const other = document.getElementById('founder-dialog-other');
  const close = dialog.querySelector('.founder-dialog-close');
  if (![name,role,handle,photo,bio,story,other,close].every(Boolean)) return;

  let lastTrigger = null;
  const show = (id, trigger) => {
    const data = profiles[id];
    if (!data) return;
    if (trigger) lastTrigger = trigger;
    name.textContent = data.name;
    role.textContent = data.role;
    handle.textContent = data.handle || '';
    handle.hidden = !data.handle;
    photo.src = data.image;
    photo.alt = data.alt;
    bio.textContent = data.bio;
    story.textContent = data.story;
    dialog.dataset.person = id;
    const next = sequence[(sequence.indexOf(id) + 1) % sequence.length];
    other.textContent = 'Meet ' + profiles[next].name + ' →';
    other.dataset.other = next;
    other.setAttribute('aria-label', 'View ' + profiles[next].name + ' profile');
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    close.focus({preventScroll:true});
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
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right ||
                    event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus({preventScroll:true});
  });
})();